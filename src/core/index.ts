/**
 * @module @svelte-ssv/core
 *
 * Svelte Simple Validation — A lightweight, validation-library agnostic form validation utility.
 *
 * Supports any schema implementing Standard Schema V1 (Zod v4, Valibot, ArkType, TypeBox)
 * or Zod's `safeParse` interface (Zod v3/v4).
 *
 * This is the core entry point (framework-agnostic).
 * For SvelteKit `use:enhance` integration, import from `@svelte-ssv/core/enhance`.
 * For unified form state with touched/dirty tracking, import from `@svelte-ssv/core/form`.
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
	SchemaInput,
	StandardSchema,
	ValidationResult,
	ZodSchema,
} from "./validator";
export { createFormValidator } from "./validator";
