/**
 * @module @svelte-ssv/core
 *
 * Svelte Simple Validation — A lightweight form validation library built on Zod.
 *
 * This is the core entry point (framework-agnostic).
 * For SvelteKit `use:enhance` integration, import from `@svelte-ssv/core/enhance`.
 *
 * @example
 * ```typescript
 * import { createFormValidator } from '@svelte-ssv/core';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email format'),
 * });
 *
 * const validator = createFormValidator(schema);
 * const result = validator.validate({ name: '', email: 'bad' });
 * ```
 */

export type {
	FieldValidationResult,
	FormErrors,
	FormValidator,
	ValidationResult,
} from "./validator";
export { createFormValidator } from "./validator";
