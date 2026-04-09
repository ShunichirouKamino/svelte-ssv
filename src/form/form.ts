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

import type { FormErrors, FormValidator, SchemaInput, ValidationResult } from "../core/validator";
import { createFormValidator } from "../core/validator";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Unified form state object.
 *
 * Holds reactive data, errors, touched/dirty tracking, and provides
 * methods for validation, blur handling, and reset.
 *
 * The optional second type parameter `E` allows declaring additional error keys
 * for custom validation paths (e.g., Zod's `.refine()` with a `path` that does
 * not correspond to any schema field).
 */
export type Form<T extends Record<string, unknown>, E extends string = never> = {
	/** Current form data (mutable, bind-friendly) */
	data: T;

	/** Current validation errors */
	errors: FormErrors<T, E>;

	/** Per-field touched state (set to `true` on blur) */
	touched: { [K in keyof T]: boolean };

	/** Per-field dirty state (`true` if value differs from initial) */
	dirty: { [K in keyof T]: boolean };

	/** `true` if any field is dirty */
	readonly isDirty: boolean;

	/** The underlying FormValidator (useful for `createEnhanceHandler`) */
	readonly validator: FormValidator<T, E>;

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
	validate: () => ValidationResult<T, E>;

	/** Reset form to its initial state (data, errors, touched, dirty). */
	reset: () => void;

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
export function createForm<T extends Record<string, unknown>, E extends string = never>(
	schema: SchemaInput<T>,
	initial: T,
): Form<T, E> {
	const _validator = createFormValidator<T, E>(schema);
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
		errors: {} as FormErrors<T, E>,
		touched,
		dirty,

		get isDirty(): boolean {
			return keys.some((key) => this.data[key] !== _initialData[key]);
		},

		get validator(): FormValidator<T, E> {
			return _validator;
		},

		blur(field: keyof T & string): void {
			this.touched[field] = true;
			this.dirty[field] = this.data[field] !== _initialData[field];

			const result = _validator.validateField(field, this.data as Record<string, unknown>);
			this.errors = _validator.mergeFieldErrors(this.errors, field, result);
		},

		validate(): ValidationResult<T, E> {
			// Mark all fields as touched and update dirty state
			for (const key of keys) {
				this.touched[key] = true;
				this.dirty[key] = this.data[key] !== _initialData[key];
			}

			const result = _validator.validate(this.data as Record<string, unknown>);
			this.errors = result.valid ? ({} as FormErrors<T, E>) : result.errors;
			return result;
		},

		reset(): void {
			const fresh = structuredClone(_initialData);
			for (const key of keys) {
				(this.data as Record<string, unknown>)[key] = (fresh as Record<string, unknown>)[key];
				this.touched[key] = false;
				this.dirty[key] = false;
			}
			this.errors = {} as FormErrors<T, E>;
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
			this.errors = {} as FormErrors<T, E>;
		},
	};
}
