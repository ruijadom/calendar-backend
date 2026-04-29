import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.integration.test.ts"],
		setupFiles: ["./vitest.setup.ts"],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		fileParallelism: false,
	},
});
