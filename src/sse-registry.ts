import type { ServerResponse } from "http";

/** In-memory SSE subscribers (single Fastify replica). */
const clients = new Set<ServerResponse>();

export const sseAdd = (res: ServerResponse): void => {
	clients.add(res);
};

export const sseRemove = (res: ServerResponse): void => {
	clients.delete(res);
};

export const sseBroadcast = (eventName: string, payload: unknown): void => {
	const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
	for (const res of clients) {
		if (res.writableEnded) {
			clients.delete(res);
			continue;
		}
		try {
			res.write(data);
		} catch {
			clients.delete(res);
		}
	}
};

export const sseClientCount = (): number => clients.size;
