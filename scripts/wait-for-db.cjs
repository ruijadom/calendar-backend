/**
 * Waits until Postgres accepts connections on DATABASE_URL (from `.env`).
 */
require("./load-env.cjs");
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
	console.error("[calendar-backend] DATABASE_URL missing (.env not loaded?)");
	process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
	const maxAttempts = 60;
	for (let i = 0; i < maxAttempts; i++) {
		const client = new Client({ connectionString: url });
		try {
			await client.connect();
			await client.end();
			console.log("[calendar-backend] Database is reachable.");
			return;
		} catch {
			await client.end().catch(() => {});
			process.stdout.write(
				`[calendar-backend] Waiting for Postgres… (${i + 1}/${maxAttempts})\n`,
			);
			await sleep(1000);
		}
	}
	console.error("[calendar-backend] Timed out waiting for DATABASE_URL");
	process.exit(1);
}

void main();
