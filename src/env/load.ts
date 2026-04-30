import { config } from "dotenv";
import { join } from "node:path";

/**
 * Loads `.env` from the calendar-backend package root (`process.cwd()`).
 *
 * Uses `override: true` when `DATABASE_URL` is missing or looks local (`localhost`),
 * so a stale shell export cannot shadow `.env`.
 *
 * When `DATABASE_URL` is already non-local (e.g. `railway run` injecting Postgres),
 * uses `override: false` so local `.env` does not overwrite the remote URL — fixes
 * `railway run npm run seed` while developing with Docker Postgres in `.env`.
 *
 * On Railway VMs, `.env` is typically absent — platform vars stay in effect.
 */
const looksLikeLocalDatabaseUrl = (url: string | undefined): boolean => {
	if (!url) return true;
	return /localhost|127\.0\.0\.1|^\[::1\]/i.test(url);
};

export const loadEnvFromFile = (): void => {
	const override = looksLikeLocalDatabaseUrl(process.env.DATABASE_URL);
	config({ path: join(process.cwd(), ".env"), override });
};
