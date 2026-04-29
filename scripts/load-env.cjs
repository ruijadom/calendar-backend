/** Same rules as `src/env/load.ts` — for plain Node scripts in `scripts/`. */
const path = require("path");
const dotenv = require("dotenv");

const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env"), override: true });
