/**
 * @module @svelte-ssv/core/enhance
 *
 * SvelteKit `use:enhance` integration.
 *
 * Two levels of abstraction:
 *
 * - `createEnhanceHandler` — full control over `getData` / `setErrors` callbacks.
 *   Use when you need custom error handling (toast, summary, etc.)
 *
 * - `buildEnhanceHandler` — shorthand that wires `getData` / `setErrors` / `validator`
 *   automatically from a `createForm` instance. Use for the common case.
 */

export type { EnhanceHandlerOptions } from "./enhance";
export { createEnhanceHandler } from "./enhance";
export type { BuildEnhanceOptions } from "./enhance-form";
export { buildEnhanceHandler } from "./enhance-form";
