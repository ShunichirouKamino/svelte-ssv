import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFormValidator } from "./validator";

const testSchema = z.object({
	name: z.string().min(1, "Name is required").max(10, "Max 10 characters"),
	email: z.string().email("Invalid email format"),
});

describe("createFormValidator", () => {
	const validator = createFormValidator(testSchema);

	// ---------------------------------------------------------------
	// validate (all fields)
	// ---------------------------------------------------------------

	describe("validate", () => {
		it("returns valid: true for valid data", () => {
			const result = validator.validate({
				name: "Taro",
				email: "taro@example.com",
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual({});
			if (result.valid) {
				expect(result.data).toEqual({
					name: "Taro",
					email: "taro@example.com",
				});
			}
		});

		it("returns field errors for empty name", () => {
			const result = validator.validate({ name: "", email: "a@b.com" });
			expect(result.valid).toBe(false);
			expect(result.errors.name).toContain("Name is required");
		});

		it("returns field errors for invalid email", () => {
			const result = validator.validate({
				name: "Taro",
				email: "invalid",
			});
			expect(result.valid).toBe(false);
			expect(result.errors.email).toContain("Invalid email format");
		});

		it("returns errors for multiple fields simultaneously", () => {
			const result = validator.validate({ name: "", email: "invalid" });
			expect(result.valid).toBe(false);
			expect(result.errors.name).toBeDefined();
			expect(result.errors.email).toBeDefined();
		});

		it("returns errors when max length is exceeded", () => {
			const result = validator.validate({
				name: "a".repeat(11),
				email: "a@b.com",
			});
			expect(result.valid).toBe(false);
			expect(result.errors.name).toContain("Max 10 characters");
		});

		it("includes parsed data when valid: true", () => {
			const result = validator.validate({
				name: "Taro",
				email: "taro@example.com",
			});
			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.data.name).toBe("Taro");
				expect(result.data.email).toBe("taro@example.com");
			}
		});

		it("data is undefined when valid: false", () => {
			const result = validator.validate({ name: "", email: "" });
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.data).toBeUndefined();
			}
		});
	});

	// ---------------------------------------------------------------
	// validateField (per field)
	// ---------------------------------------------------------------

	describe("validateField", () => {
		it("returns only errors for the specified field", () => {
			const result = validator.validateField("email", {
				name: "",
				email: "bad",
			});
			expect(result.errors.email).toContain("Invalid email format");
			expect(result.errors.name).toBeUndefined();
		});

		it("returns empty errors if the specified field is valid", () => {
			const result = validator.validateField("email", {
				name: "",
				email: "valid@example.com",
			});
			expect(result.errors.email).toBeUndefined();
		});

		it("returns empty errors if all fields are valid", () => {
			const result = validator.validateField("name", {
				name: "Taro",
				email: "a@b.com",
			});
			expect(result.errors).toEqual({});
		});

		it("returns empty errors for a nonexistent field name", () => {
			// biome-ignore lint/suspicious/noExplicitAny: intentionally testing a nonexistent field name
			const result = validator.validateField("nonexistent" as any, {
				name: "",
				email: "",
			});
			expect(result.errors).toEqual({});
		});
	});

	// ---------------------------------------------------------------
	// mergeFieldErrors
	// ---------------------------------------------------------------

	describe("mergeFieldErrors", () => {
		it("merges field errors into existing errors", () => {
			const current = { name: ["Name is required"] };
			const fieldResult = validator.validateField("email", {
				name: "",
				email: "bad",
			});
			const merged = validator.mergeFieldErrors(current, "email", fieldResult);
			expect(merged.name).toEqual(["Name is required"]);
			expect(merged.email).toContain("Invalid email format");
		});

		it("removes field errors when resolved", () => {
			const current = { name: ["Name is required"], email: ["Old error"] };
			const fieldResult = validator.validateField("email", {
				name: "",
				email: "valid@example.com",
			});
			const merged = validator.mergeFieldErrors(current, "email", fieldResult);
			expect(merged.name).toEqual(["Name is required"]);
			expect(merged.email).toBeUndefined();
		});

		it("does not mutate the original object (immutable)", () => {
			const current = { name: ["Name is required"] };
			const fieldResult = validator.validateField("email", {
				name: "",
				email: "bad",
			});
			const merged = validator.mergeFieldErrors(current, "email", fieldResult);
			// biome-ignore lint/suspicious/noExplicitAny: checking immutability by inspecting the original object
			expect((current as any).email).toBeUndefined();
			expect(merged.email).toBeDefined();
		});
	});

	// ---------------------------------------------------------------
	// setServerError
	// ---------------------------------------------------------------

	describe("setServerError", () => {
		it("stores server error in the _form field", () => {
			const errors = validator.setServerError("Failed to save");
			expect(errors._form).toContain("Failed to save");
		});

		it("returns _form as an array", () => {
			const errors = validator.setServerError("Error");
			expect(Array.isArray(errors._form)).toBe(true);
			expect(errors._form?.length).toBe(1);
		});
	});

	// ---------------------------------------------------------------
	// parseErrors
	// ---------------------------------------------------------------

	describe("parseErrors", () => {
		it("converts Zod errors into field-indexed errors", () => {
			const errors = validator.parseErrors({
				issues: [
					{ path: ["name"], message: "Required" },
					{ path: ["email"], message: "Invalid" },
				],
			});
			expect(errors.name).toEqual(["Required"]);
			expect(errors.email).toEqual(["Invalid"]);
		});

		it("groups multiple errors for the same field into an array", () => {
			const errors = validator.parseErrors({
				issues: [
					{ path: ["name"], message: "Error 1" },
					{ path: ["name"], message: "Error 2" },
				],
			});
			expect(errors.name).toEqual(["Error 1", "Error 2"]);
		});

		it("ignores issues with an empty path", () => {
			const errors = validator.parseErrors({
				issues: [{ path: [], message: "Root error" }],
			});
			expect(errors).toEqual({});
		});
	});
});

// ---------------------------------------------------------------
// Cross-field validation (refine)
// ---------------------------------------------------------------

describe("cross-field validation", () => {
	const passwordSchema = z
		.object({
			password: z.string().min(8, "Must be at least 8 characters"),
			confirmPassword: z.string(),
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: "Passwords do not match",
			path: ["confirmPassword"],
		});

	const validator = createFormValidator(passwordSchema);

	it("assigns refine errors to the correct field", () => {
		const result = validator.validate({
			password: "12345678",
			confirmPassword: "different",
		});
		expect(result.valid).toBe(false);
		expect(result.errors.confirmPassword).toContain("Passwords do not match");
	});

	it("retrieves refine errors via validateField", () => {
		const result = validator.validateField("confirmPassword", {
			password: "12345678",
			confirmPassword: "different",
		});
		expect(result.errors.confirmPassword).toContain("Passwords do not match");
	});
});
