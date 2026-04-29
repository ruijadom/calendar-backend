import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export const getPool = (): pg.Pool => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is required");
	}
	if (!pool) {
		pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			max: 10,
			idleTimeoutMillis: 30_000,
		});
	}
	return pool;
};

export const getDb = (): NodePgDatabase<typeof schema> => {
	if (!db) {
		db = drizzle(getPool(), { schema });
	}
	return db;
};

export const closePool = async (): Promise<void> => {
	if (pool) {
		await pool.end();
		pool = null;
		db = null;
	}
};
