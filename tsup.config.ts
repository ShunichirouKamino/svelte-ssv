import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/core/index.ts",
		"src/enhance/index.ts",
		"src/form/index.ts",
	],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	splitting: false,
	sourcemap: true,
	outDir: "dist",
});
