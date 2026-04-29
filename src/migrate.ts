import { loadEnvFromFile } from "./env/load";
loadEnvFromFile();

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "node:path";
import pg from "pg";

async function main(): Promise<void> {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is required");
	}
	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool);
	const migrationsFolder = join(process.cwd(), "drizzle");
	await migrate(db, { migrationsFolder });
	await pool.end();
	// eslint-disable-next-line no-console
	console.log("Drizzle migrations applied from", migrationsFolder);
}

main().catch((e) => {
	// eslint-disable-next-line no-console
	console.error(e);
	process.exit(1);
});
