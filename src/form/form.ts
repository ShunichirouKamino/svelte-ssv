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
 * A Svelte attachment (`{@attach ...}`) returned by `form.field()`.
 *
 * Declared structurally so the core has no dependency on `svelte`.
 * Compatible with `Attachment<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>`.
 */
export type FieldAttachment = (element: Element) => () => void;

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

	/**
	 * Create a Svelte attachment that wires an input to a field.
	 *
	 * Replaces `bind:value` + `onblur`: syncs the element value with
	 * `form.data[name]`, calls `blur(name)` on blur, sets `aria-invalid`
	 * while the field is touched and invalid, and sets `name` if missing.
	 *
	 * Supports text-like `<input>`, `<textarea>`, single `<select>`,
	 * `type="number" | "range"` (empty → `null`), `type="checkbox"` (boolean),
	 * and `type="radio"` (value of the checked radio).
	 *
	 * Requires Svelte 5.29+ (`{@attach}`).
	 *
	 * @example
	 * ```svelte
	 * <input {@attach form.field('name')} />
	 * ```
	 */
	field: (name: keyof T & string) => FieldAttachment;
};

// ---------------------------------------------------------------------------
// Field attachment helpers
// ---------------------------------------------------------------------------

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function inputType(el: FieldElement): string {
	return el.tagName === "INPUT" ? (el as HTMLInputElement).type : "";
}

function isNumeric(el: FieldElement): boolean {
	const type = inputType(el);
	return type === "number" || type === "range";
}

/** Same coercion as Svelte's `bind:value` on number inputs */
function toNumber(value: string): number | null {
	return value === "" ? null : +value;
}

function writeValue(el: FieldElement, value: unknown): void {
	const type = inputType(el);
	if (type === "checkbox") {
		(el as HTMLInputElement).checked = Boolean(value);
	} else if (type === "radio") {
		(el as HTMLInputElement).checked = el.value === value;
	} else if (isNumeric(el)) {
		// Compare as numbers so intermediate input like "1." is not overwritten
		if (toNumber(el.value) !== (value ?? null)) el.value = value == null ? "" : String(value);
	} else {
		const next = value == null ? "" : String(value);
		// Guard to avoid moving the caret when the value is unchanged
		if (el.value !== next) el.value = next;
	}
}

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
 *
 * @example Custom error keys for cross-field validation
 * ```typescript
 * // When using Zod .refine() with a custom path (e.g., path: ["_kbGroup"]),
 * // pass the extra key as the second type parameter so form.errors._kbGroup
 * // is type-safe. TypeScript cannot infer E from the schema, so it must be
 * // specified explicitly:
 * type MyForm = z.infer<typeof schema>;
 * let form = $state(createForm<MyForm, '_kbGroup'>(schema, initial));
 * ```
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

		field(name: keyof T & string): FieldAttachment {
			// `this` is the $state proxy, so reads below are tracked by the
			// attachment's effect and it re-runs on reset/populate/blur.
			const form = this;
			return (element) => {
				const el = element as FieldElement;
				const type = inputType(el);

				if (!el.getAttribute("name")) el.setAttribute("name", name);
				writeValue(el, form.data[name]);
				if (form.touched[name] && form.errors[name]?.length) {
					el.setAttribute("aria-invalid", "true");
				} else {
					el.removeAttribute("aria-invalid");
				}

				const onInput = () => {
					let value: unknown;
					if (type === "checkbox") value = (el as HTMLInputElement).checked;
					else if (type === "radio") {
						if (!(el as HTMLInputElement).checked) return;
						value = el.value;
					} else if (isNumeric(el)) value = toNumber(el.value);
					else value = el.value;
					(form.data as Record<string, unknown>)[name] = value;
				};
				const onBlur = () => form.blur(name);

				const event = type === "checkbox" || type === "radio" || el.tagName === "SELECT" ? "change" : "input";
				el.addEventListener(event, onInput);
				el.addEventListener("blur", onBlur);
				return () => {
					el.removeEventListener(event, onInput);
					el.removeEventListener("blur", onBlur);
				};
			};
		},
	};
}
