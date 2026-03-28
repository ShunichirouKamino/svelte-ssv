/**
 * @module validator
 *
 * Core form validation — validation-library agnostic via Standard Schema V1.
 * Framework-agnostic (pure TypeScript).
 *
 * Supports any schema that implements Standard Schema V1 (`~standard` property)
 * or Zod's `safeParse` interface. This means Zod v3/v4, Valibot, ArkType,
 * TypeBox, and any future Standard Schema-compliant library works out of the box.
 *
 * @example
 * ```typescript
 * import { createFormValidator } from '@svelte-ssv/core';
 * import { z } from 'zod';        // Zod
 * import * as v from 'valibot';    // or Valibot
 * import { type } from 'arktype';  // or ArkType
 *
 * // All of these work:
 * const validator = createFormValidator(z.object({ name: z.string() }));
 * const validator = createFormValidator(v.object({ name: v.string() }));
 * ```
 */

// ---------------------------------------------------------------------------
// Schema interfaces
// ---------------------------------------------------------------------------

/**
 * A single path segment in a Standard Schema issue.
 * Can be a PropertyKey directly or an object with a `key` property.
 */
type StandardPathSegment = PropertyKey | { readonly key: PropertyKey };

/**
 * A single validation issue from Standard Schema V1.
 */
type StandardIssue = {
	readonly message: string;
	readonly path?: ReadonlyArray<StandardPathSegment> | undefined;
};

/**
 * Standard Schema V1 interface.
 *
 * Any validation library that implements this interface (via the `~standard`
 * property) can be used with ssv. Supported libraries include:
 * - Zod v4
 * - Valibot v1+
 * - ArkType
 * - TypeBox
 *
 * @see https://github.com/standard-schema/standard-schema
 */
export type StandardSchema<T = unknown> = {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) => { readonly value: T } | { readonly issues: readonly StandardIssue[] };
	};
};

/**
 * Zod-compatible schema interface (safeParse).
 *
 * Supports Zod v3 and v4. Kept for backward compatibility with Zod v3
 * which does not implement Standard Schema.
 */
export type ZodSchema<T = unknown> = {
	safeParse: (
		data: unknown,
	) =>
		| { success: true; data: T }
		| {
				success: false;
				error: {
					issues: { path: PropertyKey[]; message: string }[];
				};
		  };
};

/**
 * Schema input type — accepts either Standard Schema V1 or Zod's safeParse.
 *
 * Detection order:
 * 1. If the schema has a `"~standard"` property → Standard Schema V1
 * 2. If the schema has a `safeParse` method → Zod-compatible
 */
export type SchemaInput<T = unknown> = StandardSchema<T> | ZodSchema<T>;

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
 * Provides validation functionality from any supported schema.
 * Framework-agnostic — works with Svelte, React, Vue, or any other framework.
 */
export type FormValidator<T extends Record<string, unknown>> = {
	/** Validate the entire form */
	validate: (data: Record<string, unknown>) => ValidationResult<T>;

	/**
	 * Validate a single field (for onblur / oninput handlers).
	 *
	 * Validates the entire form data and extracts only the errors
	 * for the specified field. This ensures cross-field validations work correctly.
	 */
	validateField: (
		field: keyof T & string,
		data: Record<string, unknown>,
	) => FieldValidationResult<T>;

	/**
	 * Convert validation issues into field-indexed FormErrors.
	 *
	 * Accepts either a flat array of issues (Standard Schema style) or
	 * an object with an `issues` property (Zod error style) for backward compatibility.
	 */
	parseErrors: (
		issuesOrError:
			| readonly StandardIssue[]
			| { issues: readonly StandardIssue[] },
	) => FormErrors<T>;

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
// Internal helpers
// ---------------------------------------------------------------------------

function isStandardSchema<T>(schema: SchemaInput<T>): schema is StandardSchema<T> {
	return "~standard" in schema;
}

/**
 * Extract the field name (string) from a Standard Schema path segment.
 */
function resolvePathSegment(segment: StandardPathSegment): string | undefined {
	if (typeof segment === "symbol") return undefined;
	if (typeof segment === "object" && segment !== null && "key" in segment) {
		const key = segment.key;
		return typeof key === "symbol" ? undefined : key?.toString();
	}
	return segment?.toString();
}

/**
 * Normalize a schema into a unified validate function.
 */
function createValidateFn<T>(
	schema: SchemaInput<T>,
): (
	data: unknown,
) =>
	| { ok: true; data: T }
	| { ok: false; issues: readonly StandardIssue[] } {
	if (isStandardSchema(schema)) {
		return (data: unknown) => {
			const result = schema["~standard"].validate(data);
			if (result instanceof Promise) {
				throw new Error(
					"ssv does not support async validation. Use a synchronous schema.",
				);
			}
			if ("value" in result) {
				return { ok: true, data: result.value };
			}
			return { ok: false, issues: result.issues };
		};
	}

	// Zod safeParse fallback
	return (data: unknown) => {
		const result = schema.safeParse(data);
		if (result.success) {
			return { ok: true, data: result.data };
		}
		return {
			ok: false,
			issues: result.error.issues.map((issue) => ({
				message: issue.message,
				path: issue.path,
			})),
		};
	};
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Create a form validator from any supported schema.
 *
 * Accepts schemas implementing Standard Schema V1 (Zod v4, Valibot, ArkType,
 * TypeBox) or Zod's `safeParse` interface (Zod v3/v4).
 *
 * @param schema - A Standard Schema V1 or Zod-compatible schema
 * @returns A form validator
 *
 * @example
 * ```svelte
 * <script>
 *   import { createFormValidator } from '@svelte-ssv/core';
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
	schema: SchemaInput<T>,
): FormValidator<T> {
	const doValidate = createValidateFn(schema);

	function parseErrors(
		issuesOrError:
			| readonly StandardIssue[]
			| { issues: readonly StandardIssue[] },
	): FormErrors<T> {
		const issues = Array.isArray(issuesOrError)
			? issuesOrError
			: (issuesOrError as { issues: readonly StandardIssue[] }).issues;
		const errors: FormErrors<T> = {} as FormErrors<T>;
		for (const issue of issues) {
			const firstSegment = issue.path?.[0];
			if (firstSegment == null) {
				if (!errors._form) errors._form = [];
				errors._form.push(issue.message);
				continue;
			}
			const field = resolvePathSegment(firstSegment) as keyof T | undefined;
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
		const result = doValidate(data);
		if (result.ok) {
			return {
				valid: true,
				data: result.data,
				errors: {} as FormErrors<T>,
			};
		}
		return {
			valid: false,
			data: undefined,
			errors: parseErrors(result.issues),
		};
	}

	function validateField(
		field: keyof T & string,
		data: Record<string, unknown>,
	): FieldValidationResult<T> {
		const result = doValidate(data);
		if (result.ok) {
			return { errors: {} as FormErrors<T> };
		}

		// Extract only the errors for the specified field
		const fieldErrors: string[] = [];
		for (const issue of result.issues) {
			const firstSegment = issue.path?.[0];
			if (firstSegment == null) continue;
			const resolved = resolvePathSegment(firstSegment);
			if (resolved === field) {
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
