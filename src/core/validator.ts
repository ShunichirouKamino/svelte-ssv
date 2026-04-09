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
 * const zodValidator = createFormValidator(z.object({ name: z.string() }));
 * const valibotValidator = createFormValidator(v.object({ name: v.string() }));
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
		readonly validate: (value: unknown) => { readonly value: T } | { readonly issues: readonly StandardIssue[] };
	};
};

/**
 * Zod-compatible schema interface (safeParse).
 *
 * Supports Zod v3 and v4. Kept for backward compatibility with Zod v3
 * which does not implement Standard Schema.
 */
export type ZodSchema<T = unknown> = {
	safeParse: (data: unknown) =>
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
 * The optional second type parameter `E` allows declaring additional error keys
 * for custom validation paths (e.g., Zod's `.refine()` with a `path` that does
 * not correspond to any schema field).
 *
 * @example
 * ```typescript
 * // Basic usage
 * const errors: FormErrors<{ name: string; email: string }> = {
 *   name: ['Name is required'],
 *   _form: ['A server error occurred'],
 * };
 *
 * // With custom error keys
 * const errors: FormErrors<{ kbId?: string; kbName?: string }, '_kbGroup'> = {
 *   _kbGroup: ['All fields must be filled or all must be empty'],
 * };
 * ```
 */
export type FormErrors<T extends Record<string, unknown> = Record<string, unknown>, E extends string = never> = {
	[K in keyof T]?: string[];
} & {
	/** Form-level errors (not associated with a specific field) */
	_form?: string[];
} & {
	[K in E]?: string[];
};

/**
 * Validation result.
 */
export type ValidationResult<T extends Record<string, unknown>, E extends string = never> =
	| { valid: true; data: T; errors: FormErrors<T, E> }
	| { valid: false; data: undefined; errors: FormErrors<T, E> };

/**
 * Field validation result.
 *
 * Contains only the errors for the specified field. Empty object if no errors.
 */
export type FieldValidationResult<T extends Record<string, unknown>, E extends string = never> = {
	errors: FormErrors<T, E>;
};

/**
 * Form validator.
 *
 * Provides validation functionality from any supported schema.
 * Framework-agnostic — works with Svelte, React, Vue, or any other framework.
 */
export type FormValidator<T extends Record<string, unknown>, E extends string = never> = {
	/** Validate the entire form */
	validate: (data: Record<string, unknown>) => ValidationResult<T, E>;

	/**
	 * Validate a single field (for onblur / oninput handlers).
	 *
	 * Validates the entire form data and extracts only the errors
	 * for the specified field. This ensures cross-field validations work correctly.
	 */
	validateField: (field: (keyof T & string) | E, data: Record<string, unknown>) => FieldValidationResult<T, E>;

	/**
	 * Convert validation issues into field-indexed FormErrors.
	 *
	 * Accepts either a flat array of issues (Standard Schema style) or
	 * an object with an `issues` property (Zod error style) for backward compatibility.
	 */
	parseErrors: (issuesOrError: readonly StandardIssue[] | { issues: readonly StandardIssue[] }) => FormErrors<T, E>;

	/** Create a form-level error from a server error message */
	setServerError: (message: string) => FormErrors<T, E>;

	/**
	 * Merge field validation results into existing errors.
	 *
	 * Used for real-time validation to update only the field being edited.
	 */
	mergeFieldErrors: (
		current: FormErrors<T, E>,
		field: (keyof T & string) | E,
		fieldResult: FieldValidationResult<T, E>,
	) => FormErrors<T, E>;
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
): (data: unknown) => { ok: true; data: T } | { ok: false; issues: readonly StandardIssue[] } {
	if (isStandardSchema(schema)) {
		return (data: unknown) => {
			const result = schema["~standard"].validate(data);
			if (result instanceof Promise) {
				throw new Error("ssv does not support async validation. Use a synchronous schema.");
			}
			// Check issues first: some libraries (e.g., Valibot) return both
			// `value` and `issues` on failure. Issues take precedence.
			if ("issues" in result && result.issues && (result.issues as readonly StandardIssue[]).length > 0) {
				return { ok: false, issues: result.issues as readonly StandardIssue[] };
			}
			if ("value" in result) {
				return { ok: true, data: result.value as T };
			}
			// ArkType may return an array-like object directly
			if (Array.isArray(result)) {
				return {
					ok: false,
					issues: (result as Array<{ message: string; path?: PropertyKey[] }>).map((issue) => ({
						message: issue.message,
						path: issue.path,
					})),
				};
			}
			return { ok: true, data: result as T };
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
 *
 * @example Custom error keys for cross-field validation
 * ```typescript
 * // When using Zod .refine() with a custom path not in the schema,
 * // pass the extra key as the second type parameter:
 * const validator = createFormValidator<MyForm, '_groupError'>(schema);
 * // validator.validate(...).errors._groupError is now type-safe
 * ```
 */
export function createFormValidator<T extends Record<string, unknown>, E extends string = never>(
	schema: SchemaInput<T>,
): FormValidator<T, E> {
	const doValidate = createValidateFn(schema);

	function parseErrors(
		issuesOrError: readonly StandardIssue[] | { issues: readonly StandardIssue[] },
	): FormErrors<T, E> {
		const issues = Array.isArray(issuesOrError)
			? issuesOrError
			: (issuesOrError as { issues: readonly StandardIssue[] }).issues;
		const errors: FormErrors<T, E> = {} as FormErrors<T, E>;
		for (const issue of issues) {
			const firstSegment = issue.path?.[0];
			if (firstSegment == null) {
				if (!errors._form) errors._form = [];
				errors._form.push(issue.message);
				continue;
			}
			const field = resolvePathSegment(firstSegment);
			if (field) {
				if (!(errors as Record<string, string[]>)[field]) {
					(errors as Record<string, string[]>)[field] = [];
				}
				(errors as Record<string, string[]>)[field].push(issue.message);
			}
		}
		return errors;
	}

	function validate(data: Record<string, unknown>): ValidationResult<T, E> {
		const result = doValidate(data);
		if (result.ok) {
			return {
				valid: true,
				data: result.data,
				errors: {} as FormErrors<T, E>,
			};
		}
		return {
			valid: false,
			data: undefined,
			errors: parseErrors(result.issues),
		};
	}

	function validateField(field: (keyof T & string) | E, data: Record<string, unknown>): FieldValidationResult<T, E> {
		const result = doValidate(data);
		if (result.ok) {
			return { errors: {} as FormErrors<T, E> };
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
			return { errors: {} as FormErrors<T, E> };
		}

		return {
			errors: { [field]: fieldErrors } as unknown as FormErrors<T, E>,
		};
	}

	function setServerError(message: string): FormErrors<T, E> {
		return { _form: [message] } as FormErrors<T, E>;
	}

	function mergeFieldErrors(
		current: FormErrors<T, E>,
		field: (keyof T & string) | E,
		fieldResult: FieldValidationResult<T, E>,
	): FormErrors<T, E> {
		const merged = { ...current };
		const fieldErrors = (fieldResult.errors as Record<string, string[]>)[field as string];
		if (fieldErrors && fieldErrors.length > 0) {
			(merged as Record<string, string[]>)[field as string] = fieldErrors;
		} else {
			delete (merged as Record<string, string[]>)[field as string];
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
