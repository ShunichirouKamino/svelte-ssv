/**
 * @module enhance-form
 *
 * Shorthand for building a SvelteKit `use:enhance` handler from a `createForm` instance.
 *
 * `buildEnhanceHandler` is a convenience wrapper around `createEnhanceHandler` that
 * eliminates the `getData` / `setErrors` boilerplate. It reads `form.data` and writes
 * `form.errors` / `form.touched` directly.
 *
 * **Important**: The `form` argument must be the `$state()` Proxy, not the raw object.
 * Call `buildEnhanceHandler` after `$state()` wrapping:
 *
 * @example
 * ```svelte
 * <script>
 *   import { createForm } from '@svelte-ssv/core/form';
 *   import { buildEnhanceHandler } from '@svelte-ssv/core/enhance';
 *
 *   let form = $state(createForm(schema, { email: '', password: '' }));
 *   const handleEnhance = buildEnhanceHandler(form, {
 *     onSuccess: () => closeDialog(),
 *   });
 * </script>
 *
 * <form method="POST" novalidate use:enhance={handleEnhance}>
 *   ...
 * </form>
 * ```
 *
 * ### Comparison with `createEnhanceHandler`
 *
 * | | `createEnhanceHandler` | `buildEnhanceHandler` |
 * |---|---|---|
 * | `getData` | Manual: `() => form.data` | Automatic |
 * | `setErrors` | Manual: `(e) => { form.touched[k] = true; form.errors = e }` | Automatic |
 * | `form.validator` | Must pass explicitly | Read from form |
 * | Custom `setErrors` logic | Supported (toast, summary, etc.) | Not supported — use `createEnhanceHandler` |
 * | Lines of code | ~7 | ~3 |
 */

import type { FormErrors } from "../core/validator";
import type { Form } from "../form/form";
import { createEnhanceHandler } from "./enhance";

/**
 * Options for `buildEnhanceHandler`.
 */
export type BuildEnhanceOptions = {
	/** Callback on successful submission (e.g., close modal) */
	onSuccess?: () => void;

	/** Pre-submit hook. Return false to cancel submission */
	// biome-ignore lint/suspicious/noConfusingVoidType: void is needed to allow functions with no return value
	onBeforeSubmit?: () => boolean | void;

	/** Post-submit hook. Called regardless of success or failure */
	onAfterSubmit?: () => void;
};

/**
 * Build a SvelteKit `use:enhance` handler from a `createForm` instance.
 *
 * Shorthand for `createEnhanceHandler` that automatically wires `getData`,
 * `setErrors`, and `form.validator`. On validation failure, all fields
 * are marked as touched so errors become visible.
 *
 * **Must be called after `$state()` wrapping** so that `form` references
 * the Proxy, not the raw object. This is necessary because `getData`
 * must read through the Proxy to get the latest `bind:value` values.
 *
 * @param form - A `createForm` instance wrapped in `$state()`
 * @param options - Callback options
 * @returns A function to pass to SvelteKit's `use:enhance`
 */
export function buildEnhanceHandler<T extends Record<string, unknown>, E extends string = never>(
	form: Form<T, E>,
	options?: BuildEnhanceOptions,
): ReturnType<typeof createEnhanceHandler<T, E>> {
	return createEnhanceHandler<T, E>(form.validator, {
		getData: () => form.data,
		setErrors: (e: FormErrors<T, E>) => {
			const keys = Object.keys(form.data) as (keyof T & string)[];
			for (const key of keys) {
				form.touched[key] = true;
			}
			form.errors = e;
		},
		onSuccess: options?.onSuccess,
		onBeforeSubmit: options?.onBeforeSubmit,
		onAfterSubmit: options?.onAfterSubmit,
	});
}
