/**
 * @module @svelte-ssv/core
 *
 * Svelte Simple Form Validation — A lightweight form validation library built on Zod.
 *
 * Core Validator (framework-agnostic):
 * - `createFormValidator` — Create a validator from a Zod schema
 *
 * SvelteKit Helpers:
 * - `createEnhanceHandler` — Generate a callback for SvelteKit `use:enhance`
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormValidator, createEnhanceHandler } from '@svelte-ssv/core';
 *
 *   const validator = createFormValidator(mySchema);
 *   let formData = $state({ name: '' });
 *   let errors = $state({});
 *
 *   const handleEnhance = createEnhanceHandler(validator, {
 *     getData: () => formData,
 *     setErrors: (e) => { errors = e },
 *     onSuccess: () => closeDialog(),
 *   });
 * </script>
 *
 * <form use:enhance={handleEnhance} novalidate>
 *   <input bind:value={formData.name} />
 * </form>
 * ```
 */

export type { EnhanceHandlerOptions } from "./enhance";
export { createEnhanceHandler } from "./enhance";
export type {
	FieldValidationResult,
	FormErrors,
	FormValidator,
	ValidationResult,
} from "./validator";
export { createFormValidator } from "./validator";
