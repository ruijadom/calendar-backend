import { loadEnvFromFile } from "../env/load";
loadEnvFromFile();

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../db/schema";
import { buildSeedRows, SEED_TAG } from "./fixtures";

const main = async (): Promise<void> => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is required");
	}

	const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
	const db = drizzle(pool, { schema });

	const deleted = await db
		.delete(schema.events)
		.where(sql`${schema.events.metadata}->>'seedTag' = ${SEED_TAG}`)
		.returning({ id: schema.events.id });

	// eslint-disable-next-line no-console
	console.log(
		`[seed] Removed ${deleted.length} previous seed rows (seedTag=${SEED_TAG}).`,
	);

	const rows = buildSeedRows();
	await db.insert(schema.events).values(rows);

	// eslint-disable-next-line no-console
	console.log(`[seed] Inserted ${rows.length} calendar events (dev seed).`);

	await pool.end();
};

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error("[seed] Failed:", err);
	process.exit(1);
});
