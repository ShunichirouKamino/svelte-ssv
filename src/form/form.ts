/**
 * @module form
 *
 * Unified form state with integrated validation, touched, and dirty tracking.
 *
 * Designed to work with Svelte 5's `$state` for automatic reactivity.
 * When wrapped in `$state`, all property mutations trigger re-renders.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createForm } from '@svelte-ssv/core';
 *   import { z } from 'zod';
 *
 *   const schema = z.object({
 *     name: z.string().min(1, 'Name is required'),
 *     email: z.string().email('Invalid email'),
 *   });
 *
 *   let form = $state(createForm(schema, { name: '', email: '' }));
 * </script>
 *
 * <input bind:value={form.data.name} onblur={() => form.blur('name')} />
 * {#if form.touched.name && form.errors.name}
 *   <p class="error">{form.errors.name[0]}</p>
 * {/if}
 * ```
 */

import type {
	FormErrors,
	FormValidator,
	SchemaInput,
	ValidationResult,
} from "../core/validator";
import { createFormValidator } from "../core/validator";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Unified form state object.
 *
 * Holds reactive data, errors, touched/dirty tracking, and provides
 * methods for validation, blur handling, and reset.
 */
export type Form<T extends Record<string, unknown>> = {
	/** Current form data (mutable, bind-friendly) */
	data: T;

	/** Current validation errors */
	errors: FormErrors<T>;

	/** Per-field touched state (set to `true` on blur) */
	touched: { [K in keyof T]: boolean };

	/** Per-field dirty state (`true` if value differs from initial) */
	dirty: { [K in keyof T]: boolean };

	/** `true` if any field is dirty */
	readonly isDirty: boolean;

	/** The underlying FormValidator (useful for `createEnhanceHandler`) */
	readonly validator: FormValidator<T>;

	/**
	 * Mark a field as touched, update dirty state, and run field validation.
	 *
	 * Intended for `onblur` handlers.
	 */
	blur: (field: keyof T & string) => void;

	/**
	 * Validate the entire form.
	 *
	 * Marks all fields as touched so that errors become visible.
	 */
	validate: () => ValidationResult<T>;

	/** Reset form to its initial state (data, errors, touched, dirty). */
	reset: () => void;

	/**
	 * Build a SvelteKit `use:enhance` handler from this form.
	 *
	 * **Must be called after `$state()` wrapping** so that `this` references
	 * the Proxy, not the raw object.
	 *
	 * @example
	 * ```typescript
	 * let form = $state(createForm(schema, initial));
	 * const handleEnhance = form.buildEnhance({ onSuccess: () => closeDialog() });
	 * ```
	 */
	buildEnhance: (options?: {
		onSuccess?: () => void;
		// biome-ignore lint/suspicious/noConfusingVoidType: void is needed
		onBeforeSubmit?: () => boolean | void;
		onAfterSubmit?: () => void;
	}) => (input: {
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
		| void;

	/**
	 * Populate form with new data and clear all state.
	 *
	 * Unlike `reset()` which restores the initial values, `populate()` sets
	 * new values and treats them as the baseline for dirty tracking.
	 * Useful for edit dialogs where existing data is loaded into the form.
	 */
	populate: (data: Partial<T>) => void;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Create a unified form state from a Zod schema and initial values.
 *
 * The returned object is a plain mutable object. Wrap it in Svelte 5's
 * `$state()` to get deep reactivity:
 *
 * ```svelte
 * <script>
 *   let form = $state(createForm(schema, { name: '', email: '' }));
 * </script>
 * ```
 *
 * **Important**: Methods (`blur`, `validate`, `reset`) use `this` internally.
 * Always call them on the form object — do not destructure:
 *
 * ```typescript
 * // ✅ Works
 * form.blur('name');
 *
 * // ❌ Breaks — `this` is lost
 * const { blur } = form;
 * blur('name');
 * ```
 *
 * @param schema - A Standard Schema V1 or Zod-compatible schema
 * @param initial - Initial form data
 * @returns A `Form<T>` object
 */
export function createForm<T extends Record<string, unknown>>(
	schema: SchemaInput<T>,
	initial: T,
): Form<T> {
	const _validator = createFormValidator(schema);
	const _initialData = structuredClone(initial);
	const keys = Object.keys(initial) as (keyof T & string)[];

	const touched = {} as { [K in keyof T]: boolean };
	const dirty = {} as { [K in keyof T]: boolean };
	for (const key of keys) {
		touched[key] = false;
		dirty[key] = false;
	}

	return {
		data: structuredClone(initial),
		errors: {} as FormErrors<T>,
		touched,
		dirty,

		get isDirty(): boolean {
			return keys.some(
				(key) => this.data[key] !== _initialData[key],
			);
		},

		get validator(): FormValidator<T> {
			return _validator;
		},

		blur(field: keyof T & string): void {
			this.touched[field] = true;
			this.dirty[field] = this.data[field] !== _initialData[field];

			const result = _validator.validateField(
				field,
				this.data as Record<string, unknown>,
			);
			this.errors = _validator.mergeFieldErrors(this.errors, field, result);
		},

		validate(): ValidationResult<T> {
			// Mark all fields as touched and update dirty state
			for (const key of keys) {
				this.touched[key] = true;
				this.dirty[key] = this.data[key] !== _initialData[key];
			}

			const result = _validator.validate(
				this.data as Record<string, unknown>,
			);
			this.errors = result.valid
				? ({} as FormErrors<T>)
				: result.errors;
			return result;
		},

		reset(): void {
			const fresh = structuredClone(_initialData);
			for (const key of keys) {
				(this.data as Record<string, unknown>)[key] = (
					fresh as Record<string, unknown>
				)[key];
				this.touched[key] = false;
				this.dirty[key] = false;
			}
			this.errors = {} as FormErrors<T>;
		},

		populate(newData: Partial<T>): void {
			for (const key of keys) {
				if (key in newData) {
					const val = (newData as Record<string, unknown>)[key];
					(this.data as Record<string, unknown>)[key] = val;
					(_initialData as Record<string, unknown>)[key] = val;
				}
				this.touched[key] = false;
				this.dirty[key] = false;
			}
			this.errors = {} as FormErrors<T>;
		},

		buildEnhance(opts?: {
			onSuccess?: () => void;
			onBeforeSubmit?: () => boolean | void;
			onAfterSubmit?: () => void;
		}) {
			// `this` is the $state Proxy (called as form.buildEnhance())
			const self = this;
			return _buildEnhanceHandler(self, _validator, opts);
		},
	};
}

/**
 * Internal helper — builds a SvelteKit use:enhance handler from a form reference.
 * Separated to avoid importing enhance.ts in form.ts (circular dependency prevention).
 */
function _buildEnhanceHandler<T extends Record<string, unknown>>(
	form: Form<T>,
	validator: FormValidator<T>,
	opts?: {
		onSuccess?: () => void;
		onBeforeSubmit?: () => boolean | void;
		onAfterSubmit?: () => void;
	},
) {
	return (input: {
		cancel: () => void;
		formData: FormData;
		formElement: HTMLFormElement;
		action: URL;
		submitter: HTMLElement | null;
		controller: AbortController;
	}) => {
		const { cancel } = input;

		if (opts?.onBeforeSubmit) {
			const shouldContinue = opts.onBeforeSubmit();
			if (shouldContinue === false) {
				cancel();
				return;
			}
		}

		const result = validator.validate(form.data as Record<string, unknown>);
		if (!result.valid) {
			const keys = Object.keys(form.data) as (keyof T & string)[];
			for (const key of keys) {
				form.touched[key] = true;
			}
			form.errors = result.errors;
			cancel();
			return;
		}

		form.errors = {} as FormErrors<T>;

		return async (afterInput: {
			update: (options?: { reset?: boolean }) => Promise<void>;
			result: { type: string; status?: number; data?: unknown };
			formData: FormData;
			formElement: HTMLFormElement;
			action: URL;
		}) => {
			try {
				await afterInput.update();
				if (afterInput.result.type === "success" && opts?.onSuccess) {
					opts.onSuccess();
				}
			} finally {
				if (opts?.onAfterSubmit) {
					opts.onAfterSubmit();
				}
			}
		};
	};
}
