import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, asc, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import { events } from "../db/schema";
import {
	assertValidEventRange,
	createEventBodySchema,
	patchEventBodySchema,
} from "../validation";
import { sseBroadcast } from "../sse-registry";
import {
	apiErrorSchema,
	apiEventSchema,
	createEventRequestBodySchema,
	listEventsQuerySchema,
	listEventsResponseSchema,
	uuidParamSchema,
} from "../openapi/schemas";
import type { ApiEvent, EventRow } from "../types";
import { rowToApiEvent } from "../types";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (s: string): boolean => UUID_RE.test(s);

const sendError = (
	reply: FastifyReply,
	status: number,
	code: string,
	message: string,
	details?: { field: string; message: string; value?: unknown }[],
): void => {
	void reply.status(status).send({
		error: {
			code,
			message,
			...(details?.length ? { details } : {}),
		},
	});
};

export const registerEventRoutes = (app: FastifyInstance): void => {
	const db = () => getDb();

	app.get(
		"/api/v1/events",
		{
			schema: {
				tags: ["events"],
				summary: "List events",
				description:
					"Returns events whose interval overlaps the query window. Requires `startDate` and `endDate` (ISO 8601).",
				security: [{ apiKeyHeader: [] }],
				querystring: listEventsQuerySchema,
				response: {
					200: listEventsResponseSchema,
					400: apiErrorSchema,
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const q = request.query as Record<string, string | undefined>;
			const startDate = q.startDate;
			const endDate = q.endDate;
			if (!startDate || !endDate) {
				sendError(
					reply,
					400,
					"VALIDATION_ERROR",
					"startDate and endDate query parameters are required (ISO 8601).",
					[
						...(startDate
							? []
							: [
									{
										field: "startDate",
										message: "Required",
									},
								]),
						...(endDate
							? []
							: [
									{
										field: "endDate",
										message: "Required",
									},
								]),
					],
				);
				return;
			}
			let start: Date;
			let end: Date;
			try {
				start = new Date(startDate);
				end = new Date(endDate);
				if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
					throw new Error("invalid");
				}
			} catch {
				sendError(
					reply,
					400,
					"VALIDATION_ERROR",
					"startDate and endDate must be valid ISO 8601 datetimes.",
				);
				return;
			}

			const rows = await db()
				.select()
				.from(events)
				.where(
					and(
						isNull(events.deletedAt),
						lt(events.startAt, end),
						gt(events.endAt, start),
					),
				)
				.orderBy(asc(events.startAt));

			const data: ApiEvent[] = rows.map(rowToApiEvent);
			void reply.send({
				data,
				pagination: {
					page: 1,
					limit: data.length,
					total: data.length,
					totalPages: 1,
				},
			});
		},
	);

	app.get(
		"/api/v1/events/:id",
		{
			schema: {
				tags: ["events"],
				summary: "Get event by id",
				security: [{ apiKeyHeader: [] }],
				params: uuidParamSchema,
				response: {
					200: apiEventSchema,
					400: apiErrorSchema,
					404: apiErrorSchema,
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { id } = request.params as { id: string };
			if (!isUuid(id)) {
				sendError(reply, 400, "VALIDATION_ERROR", "Invalid event id.");
				return;
			}
			const rows = await db()
				.select()
				.from(events)
				.where(and(eq(events.id, id), isNull(events.deletedAt)))
				.limit(1);
			if (!rows[0]) {
				sendError(reply, 404, "NOT_FOUND", "Event not found.");
				return;
			}
			void reply.send(rowToApiEvent(rows[0]));
		},
	);

	app.post(
		"/api/v1/events",
		{
			schema: {
				tags: ["events"],
				summary: "Create event",
				description:
					"JSON body required. Duration 15 min–24 h; `isVideoConsultation: true` needs `videoLink`. Broadcasts SSE `created`.",
				security: [{ apiKeyHeader: [] }],
				body: createEventRequestBodySchema,
				response: {
					201: apiEventSchema,
					400: apiErrorSchema,
					422: apiErrorSchema,
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = createEventBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const details = parsed.error.issues.map((e) => ({
					field: e.path.join(".") || "body",
					message: e.message,
				}));
				sendError(
					reply,
					400,
					"VALIDATION_ERROR",
					"Invalid request body.",
					details,
				);
				return;
			}
			const b = parsed.data;
			const [row] = await db()
				.insert(events)
				.values({
					title: b.title,
					description: b.description,
					startAt: new Date(b.startDate),
					endAt: new Date(b.endDate),
					color: b.color,
					providerId: b.providerId ?? null,
					providerName: b.providerName ?? null,
					clinicId: b.clinicId ?? null,
					clinicName: b.clinicName ?? null,
					status: b.status,
					isVideoConsultation: b.isVideoConsultation,
					videoLink: b.videoLink ?? null,
					metadata: b.metadata ?? {},
				})
				.returning();
			const event = rowToApiEvent(row);
			sseBroadcast("created", event);
			void reply.status(201).send(event);
		},
	);

	app.patch(
		"/api/v1/events/:id",
		{
			schema: {
				tags: ["events"],
				summary: "Update event (partial)",
				description: "Send only fields to change. Same validation rules as create where applicable.",
				security: [{ apiKeyHeader: [] }],
				params: uuidParamSchema,
				response: {
					200: apiEventSchema,
					400: apiErrorSchema,
					404: apiErrorSchema,
					422: apiErrorSchema,
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { id } = request.params as { id: string };
			if (!isUuid(id)) {
				sendError(reply, 400, "VALIDATION_ERROR", "Invalid event id.");
				return;
			}
			const parsed = patchEventBodySchema.safeParse(request.body);
			if (!parsed.success) {
				sendError(
					reply,
					400,
					"VALIDATION_ERROR",
					"Invalid request body.",
					parsed.error.issues.map((e) => ({
						field: e.path.join(".") || "body",
						message: e.message,
					})),
				);
				return;
			}
			const b = parsed.data;
			if (Object.keys(b).length === 0) {
				sendError(reply, 400, "VALIDATION_ERROR", "No fields to update.");
				return;
			}

			const existing = await db()
				.select()
				.from(events)
				.where(and(eq(events.id, id), isNull(events.deletedAt)))
				.limit(1);
			if (!existing[0]) {
				sendError(reply, 404, "NOT_FOUND", "Event not found.");
				return;
			}
			const cur: EventRow = existing[0];
			const nextStart = b.startDate
				? new Date(b.startDate)
				: new Date(cur.startAt);
			const nextEnd = b.endDate ? new Date(b.endDate) : new Date(cur.endAt);
			const range = assertValidEventRange(nextStart, nextEnd);
			if (!range.ok) {
				sendError(reply, 422, "UNPROCESSABLE_ENTITY", range.message, [
					{ field: "startDate", message: range.message },
				]);
				return;
			}
			if (b.isVideoConsultation === true || cur.isVideoConsultation) {
				const willVideo =
					b.isVideoConsultation !== undefined
						? b.isVideoConsultation
						: cur.isVideoConsultation;
				const link =
					b.videoLink !== undefined ? b.videoLink : cur.videoLink;
				if (willVideo && (!link || !String(link).trim())) {
					sendError(
						reply,
						422,
						"UNPROCESSABLE_ENTITY",
						"videoLink is required when isVideoConsultation is true",
						[{ field: "videoLink", message: "Required" }],
					);
					return;
				}
			}

			const patch: Partial<typeof events.$inferInsert> = {
				updatedAt: new Date(),
			};
			if (b.title !== undefined) patch.title = b.title;
			if (b.description !== undefined) patch.description = b.description;
			if (b.startDate !== undefined) patch.startAt = new Date(b.startDate);
			if (b.endDate !== undefined) patch.endAt = new Date(b.endDate);
			if (b.color !== undefined) patch.color = b.color;
			if (b.providerId !== undefined) patch.providerId = b.providerId;
			if (b.providerName !== undefined) patch.providerName = b.providerName;
			if (b.clinicId !== undefined) patch.clinicId = b.clinicId;
			if (b.clinicName !== undefined) patch.clinicName = b.clinicName;
			if (b.status !== undefined) patch.status = b.status;
			if (b.isVideoConsultation !== undefined) {
				patch.isVideoConsultation = b.isVideoConsultation;
			}
			if (b.videoLink !== undefined) patch.videoLink = b.videoLink;
			if (b.metadata !== undefined) patch.metadata = b.metadata;

			const rows = await db()
				.update(events)
				.set(patch)
				.where(and(eq(events.id, id), isNull(events.deletedAt)))
				.returning();
			if (!rows[0]) {
				sendError(reply, 404, "NOT_FOUND", "Event not found.");
				return;
			}
			void reply.send(rowToApiEvent(rows[0]));
		},
	);

	app.delete(
		"/api/v1/events/:id",
		{
			schema: {
				tags: ["events"],
				summary: "Delete event (soft)",
				description: "Sets `deletedAt`. Listing excludes soft-deleted rows.",
				security: [{ apiKeyHeader: [] }],
				params: uuidParamSchema,
				response: {
					204: {
						type: "null",
						description: "No content",
					},
					400: apiErrorSchema,
					404: apiErrorSchema,
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { id } = request.params as { id: string };
			if (!isUuid(id)) {
				sendError(reply, 400, "VALIDATION_ERROR", "Invalid event id.");
				return;
			}
			const rows = await db()
				.update(events)
				.set({
					status: "canceled",
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(and(eq(events.id, id), isNull(events.deletedAt)))
				.returning({ id: events.id });
			if (!rows.length) {
				sendError(reply, 404, "NOT_FOUND", "Event not found.");
				return;
			}
			void reply.status(204).send();
		},
	);
};
