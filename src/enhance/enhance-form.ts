/**
 * @module enhance-form
 *
 * Unified form state + SvelteKit `use:enhance` integration.
 *
 * Combines `createForm` and `createEnhanceHandler` into a single call,
 * reducing per-form boilerplate from ~11 lines to ~4 lines.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createEnhanceForm } from '@svelte-ssv/core/enhance';
 *   import { z } from 'zod';
 *
 *   const schema = z.object({
 *     email: z.string().email('Invalid email'),
 *     password: z.string().min(8, 'Min 8 chars'),
 *   });
 *
 *   let form = $state(createEnhanceForm(schema, {
 *     initial: { email: '', password: '' },
 *     onSuccess: () => closeDialog(),
 *   }));
 * </script>
 *
 * <form method="POST" action="?/create" novalidate use:enhance={form.enhance}>
 *   <input bind:value={form.data.email} onblur={() => form.blur('email')} />
 *   {#if form.touched.email && form.errors.email}
 *     <p class="error">{form.errors.email[0]}</p>
 *   {/if}
 * </form>
 * ```
 */

import type { SchemaInput } from "../core/validator";
import type { Form } from "../form/form";
import { createForm } from "../form/form";
import { createEnhanceHandler } from "./enhance";

/**
 * Options for `createEnhanceForm`.
 */
export type EnhanceFormOptions<T extends Record<string, unknown>> = {
	/** Initial form data */
	initial: T;

	/** Callback on successful submission (e.g., close modal) */
	onSuccess?: () => void;

	/** Pre-submit hook. Return false to cancel submission */
	// biome-ignore lint/suspicious/noConfusingVoidType: void is needed to allow functions with no return value
	onBeforeSubmit?: () => boolean | void;

	/** Post-submit hook. Called regardless of success or failure */
	onAfterSubmit?: () => void;
};

/**
 * Form with integrated SvelteKit `use:enhance` handler.
 *
 * Extends `Form<T>` with an `enhance` property that can be passed
 * directly to SvelteKit's `use:enhance` directive.
 */
export type EnhanceForm<T extends Record<string, unknown>> = Form<T> & {
	/** SvelteKit `use:enhance` callback. Use as `use:enhance={form.enhance}` */
	readonly enhance: ReturnType<typeof createEnhanceHandler<T>>;
};

/**
 * Create a unified form state with integrated SvelteKit `use:enhance` handler.
 *
 * Combines `createForm` + `createEnhanceHandler` into a single call.
 *
 * **Important**: Methods use `this` internally. Do not destructure.
 *
 * @param schema - A Standard Schema V1 or Zod-compatible schema
 * @param options - Form options (initial data, callbacks)
 * @returns An `EnhanceForm<T>` object (wrap in `$state()` for reactivity)
 */
export function createEnhanceForm<T extends Record<string, unknown>>(
	schema: SchemaInput<T>,
	options: EnhanceFormOptions<T>,
): EnhanceForm<T> {
	const form = createForm(schema, options.initial);

	const enhanceHandler = createEnhanceHandler(form.validator, {
		getData() {
			return enhanceForm.data;
		},
		setErrors(e) {
			enhanceForm.validate();
			enhanceForm.errors = e;
		},
		onSuccess: options.onSuccess,
		onBeforeSubmit: options.onBeforeSubmit,
		onAfterSubmit: options.onAfterSubmit,
	});

	const enhanceForm: EnhanceForm<T> = Object.defineProperty(
		form as EnhanceForm<T>,
		"enhance",
		{
			get() {
				return enhanceHandler;
			},
			enumerable: true,
		},
	);

	return enhanceForm;
}
