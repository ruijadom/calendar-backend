import { config } from "dotenv";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

// Same as app: `.env` wins over stray shell exports (e.g. old DATABASE_URL).
config({ path: join(process.cwd(), ".env"), override: true });

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "",
	},
});
