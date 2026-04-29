import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sseAdd, sseRemove } from "../sse-registry";

const HEARTBEAT_MS = 25_000;

const streamCorsOrigin = (
	request: FastifyRequest,
): { origin: string; credentials: boolean } | undefined => {
	const origin = request.headers.origin;
	const raw = process.env.CORS_ORIGIN?.trim();
	if (!raw) {
		if (origin) {
			return { origin, credentials: true };
		}
		return { origin: "*", credentials: false };
	}
	const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
	if (origin && allowed.includes(origin)) {
		return { origin, credentials: true };
	}
	if (allowed.length === 1) {
		return { origin: allowed[0], credentials: true };
	}
	return undefined;
};

export const registerSseRoute = (app: FastifyInstance): void => {
	app.get(
		"/api/v1/events/stream",
		{
			schema: {
				tags: ["realtime"],
				summary: "Subscribe to event stream (SSE)",
				description:
					"Long-lived `text/event-stream`. Emits `event: created` with JSON payload after each successful `POST /api/v1/events`. Heartbeat comments keep proxies alive. If `API_KEY` is set, pass `apiKey` as a query parameter (EventSource cannot send `X-API-Key`).",
				security: [{ apiKeyHeader: [] }],
				response: {
					200: {
						description:
							"Stream of SSE messages (`: heartbeat`, `event: created` + data).",
						type: "string",
						content: {
							"text/event-stream": {
								schema: { type: "string" },
							},
						},
					},
				},
			},
		},
		(request: FastifyRequest, reply: FastifyReply) => {
			reply.hijack();
			const res = reply.raw;

			const cors = streamCorsOrigin(request);
			const headers: Record<string, string> = {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			};
			if (cors) {
				headers["Access-Control-Allow-Origin"] = cors.origin;
				if (cors.credentials) {
					headers["Access-Control-Allow-Credentials"] = "true";
				}
			}

			res.writeHead(200, headers);

			res.write(": connected\n\n");
			sseAdd(res);

			const heartbeat = setInterval(() => {
				if (res.writableEnded) {
					clearInterval(heartbeat);
					return;
				}
				try {
					res.write(": heartbeat\n\n");
				} catch {
					clearInterval(heartbeat);
					sseRemove(res);
				}
			}, HEARTBEAT_MS);

			const cleanup = (): void => {
				clearInterval(heartbeat);
				sseRemove(res);
			};

			request.raw.on("close", cleanup);
			request.raw.on("error", cleanup);
		},
	);
};
