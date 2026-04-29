import { config } from "dotenv";
import { resolve } from "node:path";

/** Load `.env` before any module reads `process.env` (same idea as `src/env/load.ts`). */
config({ path: resolve(process.cwd(), ".env"), override: true });
