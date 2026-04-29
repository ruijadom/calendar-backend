import { config } from "dotenv";
import { join } from "node:path";

/**
 * Loads `.env` from the calendar-backend package root (`process.cwd()`).
 *
 * Uses `override: true` so values in `.env` replace existing process.env
 * entries. That fixes a common local issue: a stale `export DATABASE_URL=...`
 * in the shell (e.g. still on port 5432) shadowing an updated `.env` (5433).
 *
 * In production, `.env` is usually absent — platform env vars remain in effect
 * after a no-op load.
 */
export const loadEnvFromFile = (): void => {
	config({ path: join(process.cwd(), ".env"), override: true });
};
