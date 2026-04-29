/**
 * Creates `.env` from `.env.example` if `.env` is missing (does not overwrite).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const example = path.join(root, ".env.example");
const target = path.join(root, ".env");

if (!fs.existsSync(example)) {
	console.error("[calendar-backend] Missing .env.example");
	process.exit(1);
}
if (fs.existsSync(target)) {
	console.log("[calendar-backend] .env already exists — left unchanged.");
	process.exit(0);
}
fs.copyFileSync(example, target);
console.log("[calendar-backend] Created .env from .env.example");
