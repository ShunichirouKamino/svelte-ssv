/**
 * @module enhance
 *
 * SvelteKit `use:enhance` helper.
 *
 * Generates a callback function for SvelteKit's `use:enhance` directive.
 * Internalizes the validation → cancel/submit → update → onSuccess flow,
 * reducing boilerplate on the consumer side.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormValidator, createEnhanceHandler } from '@classification/ssv';
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
 * <form method="POST" action="?/create" novalidate use:enhance={handleEnhance}>
 *   ...
 * </form>
 * ```
 */

import type { FormErrors, FormValidator } from "./validator";

/**
 * Options for `createEnhanceHandler`.
 */
export type EnhanceHandlerOptions<T extends Record<string, unknown>> = {
	/** Function that returns the current form data */
	getData: () => T;

	/** Function to update the error state */
	setErrors: (errors: FormErrors<T>) => void;

	/** Callback on successful submission (e.g., close modal) */
	onSuccess?: () => void;

	/** Pre-submit hook (e.g., show loading). Return false to cancel submission */
	// biome-ignore lint/suspicious/noConfusingVoidType: void is needed to allow functions with no return value
	onBeforeSubmit?: () => boolean | void;

	/** Post-submit hook (e.g., hide loading). Called regardless of success or failure */
	onAfterSubmit?: () => void;
};

/**
 * Generate a callback function for SvelteKit's `use:enhance`.
 *
 * Conforms to SvelteKit's SubmitFunction type:
 * `(input: { cancel: () => void; ... }) => MaybePromise<(() => void) | void>`
 *
 * @param validator - A validator created with `createFormValidator`
 * @param options - Callback options
 * @returns A function to pass to SvelteKit's `use:enhance`
 */
export function createEnhanceHandler<T extends Record<string, unknown>>(
	validator: FormValidator<T>,
	options: EnhanceHandlerOptions<T>,
): (input: {
	cancel: () => void;
	formData: FormData;
	formElement: HTMLFormElement;
	action: URL;
	submitter: HTMLElement | null;
	controller: AbortController;
}) =>
	| ((opts: {
			update: (options?: { reset?: boolean }) => Promise<void>;
			result: { type: string; status?: number; data?: unknown };
			formData: FormData;
			formElement: HTMLFormElement;
			action: URL;
	  }) => Promise<void>)
	| void {
	return ({ cancel }) => {
		// Pre-validation hook
		if (options.onBeforeSubmit) {
			const shouldContinue = options.onBeforeSubmit();
			if (shouldContinue === false) {
				cancel();
				return;
			}
		}

		// Client-side validation
		const result = validator.validate(options.getData());
		if (!result.valid) {
			options.setErrors(result.errors);
			cancel();
			return;
		}
		options.setErrors({} as FormErrors<T>);

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
}
