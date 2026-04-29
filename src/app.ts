import cors from "@fastify/cors";
import Fastify from "fastify";
import { sql } from "drizzle-orm";
import { getDb, getPool } from "./db/client";
import { registerEventRoutes } from "./routes/events";
import { registerSseRoute } from "./routes/sse";
import { registerOpenApi, registerOpenApiUi } from "./swagger";

const parseOrigins = (): boolean | string[] => {
	const raw = process.env.CORS_ORIGIN?.trim();
	if (!raw) {
		return true;
	}
	const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
	return list.length ? list : true;
};

export const buildApp = async (): Promise<ReturnType<typeof Fastify>> => {
	const app = Fastify({
		logger: true,
		requestIdHeader: "x-request-id",
		disableRequestLogging: false,
	});

	await registerOpenApi(app);

	const apiKey = process.env.API_KEY?.trim();

	app.addHook("onRequest", async (request, reply) => {
		if (!apiKey) {
			return;
		}
		const path = request.url.split("?")[0] ?? "";
		if (!path.startsWith("/api/v1")) {
			return;
		}
		const headerKey = request.headers["x-api-key"];
		const key =
			typeof headerKey === "string"
				? headerKey
				: Array.isArray(headerKey)
					? headerKey[0]
					: "";
		const q = request.query as Record<string, string | undefined>;
		const queryKey = q.apiKey ?? "";
		if (key === apiKey || queryKey === apiKey) {
			return;
		}
		return reply.status(401).send({
			error: {
				code: "UNAUTHORIZED",
				message: "Invalid or missing API key.",
			},
		});
	});

	void app.register(cors, {
		origin: parseOrigins(),
		methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
		// Include headers browsers / tooling may send on fetch + EventSource preflight
		// (narrow lists break SSE when e.g. Cache-Control is requested).
		allowedHeaders: [
			"Content-Type",
			"X-API-Key",
			"Accept",
			"Cache-Control",
			"Pragma",
			"Authorization",
		],
		credentials: true,
	});

	app.get(
		"/health",
		{
			schema: {
				tags: ["system"],
				summary: "Health check",
				description: "Verifies process and database connectivity.",
				response: {
					200: {
						type: "object",
						properties: {
							status: { type: "string", enum: ["ok"] },
							database: { type: "string", enum: ["ok"] },
						},
					},
					503: {
						type: "object",
						properties: {
							status: { type: "string" },
							database: { type: "string", enum: ["error"] },
						},
					},
				},
			},
		},
		async (_request, reply) => {
			try {
				getPool();
				await getDb().execute(sql`SELECT 1`);
				void reply.send({ status: "ok", database: "ok" });
			} catch (err) {
				app.log.error(err);
				void reply.status(503).send({ status: "degraded", database: "error" });
			}
		},
	);

	registerEventRoutes(app);
	registerSseRoute(app);

	await registerOpenApiUi(app);

	return app;
};
