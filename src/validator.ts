/**
 * @module validator
 *
 * Core form validation built on Zod.
 * Framework-agnostic (pure TypeScript).
 *
 * @example
 * ```typescript
 * import { createFormValidator } from '@classification/ssv';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email format'),
 * });
 *
 * const validator = createFormValidator(schema);
 *
 * // Validate the entire form
 * const result = validator.validate({ name: '', email: 'bad' });
 * // → { valid: false, errors: { name: ['Name is required'], email: ['Invalid email format'] } }
 *
 * // Validate a single field
 * const fieldResult = validator.validateField('email', { name: '', email: 'bad' });
 * // → { errors: { email: ['Invalid email format'] } }
 * ```
 */

// ---------------------------------------------------------------------------
// Internal types (Zod version-independent)
// ---------------------------------------------------------------------------

/**
 * Minimal interface for Zod issue types (compatible with both v3 and v4).
 * Self-defined to avoid direct type dependency on Zod.
 */
type ZodIssueMinimal = {
	path: (string | number)[];
	message: string;
};

/**
 * Minimal interface for a Zod schema with a `safeParse` method.
 * Compatible with both Zod v3 and v4.
 */
type ZodSchema<T = unknown> = {
	safeParse: (
		data: unknown,
	) =>
		| { success: true; data: T }
		| { success: false; error: { issues: ZodIssueMinimal[] } };
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Field-level error type.
 *
 * The `_form` key is reserved for form-level errors (not associated with a specific field).
 *
 * @example
 * ```typescript
 * const errors: FormErrors<{ name: string; email: string }> = {
 *   name: ['Name is required'],
 *   _form: ['A server error occurred'],
 * };
 * ```
 */
export type FormErrors<
	T extends Record<string, unknown> = Record<string, unknown>,
> = {
	[K in keyof T]?: string[];
} & {
	/** Form-level errors (not associated with a specific field) */
	_form?: string[];
};

/**
 * Validation result.
 */
export type ValidationResult<T extends Record<string, unknown>> =
	| { valid: true; data: T; errors: FormErrors<T> }
	| { valid: false; data: undefined; errors: FormErrors<T> };

/**
 * Field validation result.
 *
 * Contains only the errors for the specified field. Empty object if no errors.
 */
export type FieldValidationResult<T extends Record<string, unknown>> = {
	errors: FormErrors<T>;
};

/**
 * Form validator.
 *
 * Provides validation functionality from a Zod schema.
 * Framework-agnostic — works with Svelte, React, Vue, or any other framework.
 */
export type FormValidator<T extends Record<string, unknown>> = {
	/** Validate the entire form */
	validate: (data: Record<string, unknown>) => ValidationResult<T>;

	/**
	 * Validate a single field (for onblur / oninput handlers).
	 *
	 * Runs `safeParse` on the entire form data and extracts only the errors
	 * for the specified field. This ensures cross-field validations (refine)
	 * work correctly.
	 */
	validateField: (
		field: keyof T & string,
		data: Record<string, unknown>,
	) => FieldValidationResult<T>;

	/** Convert Zod errors into field-indexed FormErrors */
	parseErrors: (error: { issues: ZodIssueMinimal[] }) => FormErrors<T>;

	/** Create a form-level error from a server error message */
	setServerError: (message: string) => FormErrors<T>;

	/**
	 * Merge field validation results into existing errors.
	 *
	 * Used for real-time validation to update only the field being edited.
	 */
	mergeFieldErrors: (
		current: FormErrors<T>,
		field: keyof T & string,
		fieldResult: FieldValidationResult<T>,
	) => FormErrors<T>;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Create a form validator from a Zod schema.
 *
 * @param schema - A Zod schema (any object with a `safeParse` method)
 * @returns A form validator
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormValidator } from '@classification/ssv';
 *   import { mySchema, type MyForm } from '$lib/schemas';
 *
 *   const validator = createFormValidator(mySchema);
 *   let formData = $state<MyForm>({ name: '', email: '' });
 *   let errors = $state<FormErrors<MyForm>>({});
 * </script>
 *
 * <input
 *   bind:value={formData.name}
 *   onblur={() => {
 *     const result = validator.validateField('name', formData);
 *     errors = validator.mergeFieldErrors(errors, 'name', result);
 *   }}
 * />
 * {#if errors.name}
 *   <p class="text-red-600">{errors.name[0]}</p>
 * {/if}
 * ```
 */
export function createFormValidator<T extends Record<string, unknown>>(
	schema: ZodSchema<T>,
): FormValidator<T> {
	function parseErrors(error: { issues: ZodIssueMinimal[] }): FormErrors<T> {
		const errors: FormErrors<T> = {} as FormErrors<T>;
		for (const issue of error.issues) {
			const field = issue.path[0]?.toString() as keyof T | undefined;
			if (field) {
				const fieldErrors = errors[field];
				if (!fieldErrors) {
					(errors as Record<string, string[]>)[field as string] = [];
				}
				(errors[field] as string[]).push(issue.message);
			}
		}
		return errors;
	}

	function validate(data: Record<string, unknown>): ValidationResult<T> {
		const result = schema.safeParse(data);
		if (result.success) {
			return {
				valid: true,
				data: result.data,
				errors: {} as FormErrors<T>,
			};
		}
		return {
			valid: false,
			data: undefined,
			errors: parseErrors(result.error),
		};
	}

	function validateField(
		field: keyof T & string,
		data: Record<string, unknown>,
	): FieldValidationResult<T> {
		const result = schema.safeParse(data);
		if (result.success) {
			return { errors: {} as FormErrors<T> };
		}

		// Extract only the errors for the specified field
		const fieldErrors: string[] = [];
		for (const issue of result.error.issues) {
			if (issue.path[0]?.toString() === field) {
				fieldErrors.push(issue.message);
			}
		}

		if (fieldErrors.length === 0) {
			return { errors: {} as FormErrors<T> };
		}

		return {
			errors: { [field]: fieldErrors } as unknown as FormErrors<T>,
		};
	}

	function setServerError(message: string): FormErrors<T> {
		return { _form: [message] } as FormErrors<T>;
	}

	function mergeFieldErrors(
		current: FormErrors<T>,
		field: keyof T & string,
		fieldResult: FieldValidationResult<T>,
	): FormErrors<T> {
		const merged = { ...current };
		const fieldErrors = fieldResult.errors[field];
		if (fieldErrors && fieldErrors.length > 0) {
			(merged as Record<string, string[]>)[field] = fieldErrors;
		} else {
			delete merged[field];
		}
		return merged;
	}

	return {
		validate,
		validateField,
		parseErrors,
		setServerError,
		mergeFieldErrors,
	};
}
