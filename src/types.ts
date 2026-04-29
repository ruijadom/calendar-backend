import type { InferSelectModel } from "drizzle-orm";
import { events } from "./db/schema";

/** Row from Drizzle (`events` table). */
export type EventRow = InferSelectModel<typeof events>;

/** JSON returned by the API (`camelCase`). */
export type ApiEvent = {
	id: string;
	title: string;
	description: string;
	startDate: string;
	endDate: string;
	color: string;
	providerId: string | null;
	providerName: string | null;
	clinicId: string | null;
	clinicName: string | null;
	isVideoConsultation: boolean;
	videoLink: string | null;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export const rowToApiEvent = (row: EventRow): ApiEvent => ({
	id: row.id,
	title: row.title,
	description: row.description,
	startDate: row.startAt.toISOString(),
	endDate: row.endAt.toISOString(),
	color: row.color,
	providerId: row.providerId,
	providerName: row.providerName,
	clinicId: row.clinicId,
	clinicName: row.clinicName,
	isVideoConsultation: row.isVideoConsultation,
	videoLink: row.videoLink,
	metadata:
		typeof row.metadata === "object" && row.metadata !== null
			? (row.metadata as Record<string, unknown>)
			: {},
	createdAt: row.createdAt.toISOString(),
	updatedAt: row.updatedAt.toISOString(),
	deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
});
