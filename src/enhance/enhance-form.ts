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

import type { FormErrors, SchemaInput } from "../core/validator";
import type { Form } from "../form/form";
import { createForm } from "../form/form";

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
 * SvelteKit `use:enhance` submit input type.
 */
type EnhanceInput = {
	cancel: () => void;
	formData: FormData;
	formElement: HTMLFormElement;
	action: URL;
	submitter: HTMLElement | null;
	controller: AbortController;
};

/**
 * SvelteKit `use:enhance` after-submit callback input type.
 */
type AfterSubmitInput = {
	update: (options?: { reset?: boolean }) => Promise<void>;
	result: { type: string; status?: number; data?: unknown };
	formData: FormData;
	formElement: HTMLFormElement;
	action: URL;
};

/**
 * Form with integrated SvelteKit `use:enhance` handler.
 *
 * Extends `Form<T>` with an `enhance` method that can be passed
 * directly to SvelteKit's `use:enhance` directive.
 */
export type EnhanceForm<T extends Record<string, unknown>> = Form<T> & {
	/** SvelteKit `use:enhance` callback. Use as `use:enhance={form.enhance}` */
	enhance: (input: EnhanceInput) => ((opts: AfterSubmitInput) => Promise<void>) | void;
};

/**
 * Create a unified form state with integrated SvelteKit `use:enhance` handler.
 *
 * Combines `createForm` + `createEnhanceHandler` into a single call.
 *
 * **Important**: Methods use `this` internally. Do not destructure.
 *
 * The `enhance` method reads `this.data` and writes `this.errors` / `this.touched`
 * at call time, which goes through the `$state` Proxy when the form object is
 * wrapped in `$state()`. This ensures reactivity works correctly.
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

	// Build enhanceForm by copying form's property descriptors (preserves getters)
	// then adding the enhance method
	const descriptors = Object.getOwnPropertyDescriptors(form);
	const enhanceForm = Object.defineProperties(
		{} as EnhanceForm<T>,
		descriptors,
	);

	// enhance is an arrow function (no `this` binding needed).
	// It references `enhanceForm` via closure. Since $state Proxy delegates
	// reads/writes to its target, `enhanceForm.data` reflects the latest
	// values set via bind:value through the Proxy.
	enhanceForm.enhance = (
		input: EnhanceInput,
	): ((opts: AfterSubmitInput) => Promise<void>) | void => {
		const { cancel } = input;

		// Pre-submit hook
		if (options.onBeforeSubmit) {
			const shouldContinue = options.onBeforeSubmit();
			if (shouldContinue === false) {
				cancel();
				return;
			}
		}

		// Client-side validation — enhanceForm is the Proxy target,
		// so reads go through the target which $state Proxy writes to
		const result = enhanceForm.validator.validate(
			enhanceForm.data as Record<string, unknown>,
		);

		if (!result.valid) {
			// Mark all fields as touched so errors become visible
			const keys = Object.keys(enhanceForm.data) as (keyof T & string)[];
			for (const key of keys) {
				enhanceForm.touched[key] = true;
			}
			enhanceForm.errors = result.errors;
			cancel();
			return;
		}

		enhanceForm.errors = {} as FormErrors<T>;

		// Post-submission handler
		return async ({ update, result: actionResult }) => {
			try {
				await update();
				if (actionResult.type === "success" && options.onSuccess) {
					options.onSuccess();
				}
			} finally {
				if (options.onAfterSubmit) {
					options.onAfterSubmit();
				}
			}
		};
	};

	return enhanceForm;
}
