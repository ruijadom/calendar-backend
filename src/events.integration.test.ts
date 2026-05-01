import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { closePool, getDb } from "./db/client";
import { events } from "./db/schema";

/**
 * Clears `events` and exercises real Postgres + HTTP stack.
 * Skips unless `DATABASE_URL` is set and either `CALENDAR_INTEGRATION=1` or `CI=true`
 * (avoids wiping a DB by accident when only running `npm test`).
 */
const shouldRunIntegration =
	Boolean(process.env.DATABASE_URL?.trim()) &&
	(process.env.CALENDAR_INTEGRATION === "1" || process.env.CI === "true");

describe.skipIf(!shouldRunIntegration)("HTTP + Postgres (integration)", () => {
	let app: FastifyInstance;
	const savedApiKey = process.env.API_KEY;

	beforeAll(async () => {
		delete process.env.API_KEY;
		app = await buildApp();
	});

	afterAll(async () => {
		await app.close();
		await closePool();
		if (savedApiKey !== undefined) {
			process.env.API_KEY = savedApiKey;
		} else {
			delete process.env.API_KEY;
		}
	});

	beforeEach(async () => {
		await getDb().delete(events);
	});

	const validEventBody = () => ({
		title: "Integration patient",
		description: "Test slot",
		startDate: "2026-05-01T10:00:00.000Z",
		endDate: "2026-05-01T10:30:00.000Z",
		color: "blue" as const,
	});

	it("GET /health returns ok when DB is reachable", async () => {
		const res = await app.inject({ method: "GET", url: "/health" });
		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body) as { status: string; database: string };
		expect(body.status).toBe("ok");
		expect(body.database).toBe("ok");
	});

	it("POST creates, GET lists, GET by id, DELETE soft, second DELETE is 404", async () => {
		const create = await app.inject({
			method: "POST",
			url: "/api/v1/events",
			headers: { "content-type": "application/json" },
			payload: JSON.stringify(validEventBody()),
		});
		expect(create.statusCode).toBe(201);
		const created = JSON.parse(create.body) as { id: string; status: string };
		expect(created.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
		expect(created.status).toBe("pending");

		const list = await app.inject({
			method: "GET",
			url: `/api/v1/events?startDate=2026-05-01T00:00:00.000Z&endDate=2026-05-02T00:00:00.000Z`,
		});
		expect(list.statusCode).toBe(200);
		const listBody = JSON.parse(list.body) as { data: { id: string }[] };
		expect(listBody.data.some((e) => e.id === created.id)).toBe(true);

		const one = await app.inject({
			method: "GET",
			url: `/api/v1/events/${created.id}`,
		});
		expect(one.statusCode).toBe(200);

		const confirm = await app.inject({
			method: "PATCH",
			url: `/api/v1/events/${created.id}`,
			headers: { "content-type": "application/json" },
			payload: JSON.stringify({ status: "confirmed" }),
		});
		expect(confirm.statusCode).toBe(200);
		const confirmedBody = JSON.parse(confirm.body) as { status: string };
		expect(confirmedBody.status).toBe("confirmed");

		const del1 = await app.inject({
			method: "DELETE",
			url: `/api/v1/events/${created.id}`,
		});
		expect(del1.statusCode).toBe(204);

		const del2 = await app.inject({
			method: "DELETE",
			url: `/api/v1/events/${created.id}`,
		});
		expect(del2.statusCode).toBe(404);

		const listAfter = await app.inject({
			method: "GET",
			url: `/api/v1/events?startDate=2026-05-01T00:00:00.000Z&endDate=2026-05-02T00:00:00.000Z`,
		});
		expect(listAfter.statusCode).toBe(200);
		const afterBody = JSON.parse(listAfter.body) as { data: { id: string }[] };
		expect(afterBody.data.some((e) => e.id === created.id)).toBe(false);
	});

	it("POST with invalid body returns 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/v1/events",
			headers: { "content-type": "application/json" },
			payload: JSON.stringify({
				...validEventBody(),
				endDate: "2026-05-01T09:00:00.000Z",
			}),
		});
		expect(res.statusCode).toBe(400);
	});
});
