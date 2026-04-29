/**
 * Shows which DATABASE_URL will be used after loading `.env` (override shell).
 */
require("./load-env.cjs");

const raw = process.env.DATABASE_URL;
if (!raw) {
	console.error("[calendar-backend] DATABASE_URL is not set (check .env in calendar-backend/).");
	process.exit(1);
}

let parsed;
try {
	parsed = new URL(raw);
} catch {
	console.log("[calendar-backend] DATABASE_URL (could not parse as URL):", raw.slice(0, 20) + "…");
	process.exit(0);
}

const safe = `${parsed.protocol}//${parsed.username || "?"}:***@${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
// eslint-disable-next-line no-console
console.log("[calendar-backend] Effective DATABASE_URL:", safe);

if (parsed.username === "calendar" && (parsed.port === "5432" || parsed.port === "")) {
	// eslint-disable-next-line no-console
	console.warn(
		"[calendar-backend] Hint: this repo's docker-compose maps Postgres to host port 5433. Use ...@localhost:5433/calendar unless you intentionally use another server on 5432.",
	);
}
