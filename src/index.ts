import { loadEnvFromFile } from "./env/load";
loadEnvFromFile();

import { buildApp } from "./app";
import { closePool } from "./db/client";

const port = Number(process.env.PORT) || 3001;
const host = "0.0.0.0";

const start = async (): Promise<void> => {
	if (!process.env.DATABASE_URL) {
		// eslint-disable-next-line no-console
		console.error("DATABASE_URL is required");
		process.exit(1);
	}
	const app = await buildApp();

	const shutdown = async (signal: string): Promise<void> => {
		app.log.info({ signal }, "shutting down");
		await app.close();
		await closePool();
		process.exit(0);
	};

	process.on("SIGINT", () => {
		void shutdown("SIGINT");
	});
	process.on("SIGTERM", () => {
		void shutdown("SIGTERM");
	});

	try {
		await app.listen({ port, host });
		app.log.info({ port, host }, "calendar-backend listening");
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};

void start();
