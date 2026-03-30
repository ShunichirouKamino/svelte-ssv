import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createForm } from "./form";

const testSchema = z.object({
	name: z.string().min(1, "Name is required").max(10, "Max 10 characters"),
	email: z.string().email("Invalid email format"),
});

type TestForm = z.infer<typeof testSchema>;

const initial: TestForm = { name: "", email: "" };

describe("createForm", () => {
	// ---------------------------------------------------------------
	// Initial state
	// ---------------------------------------------------------------

	describe("initial state", () => {
		it("initializes data with a deep copy of initial values", () => {
			const form = createForm(testSchema, initial);
			expect(form.data).toEqual({ name: "", email: "" });
			// Must be a copy, not the same reference
			expect(form.data).not.toBe(initial);
		});

		it("initializes errors as empty", () => {
			const form = createForm(testSchema, initial);
			expect(form.errors).toEqual({});
		});

		it("initializes all fields as untouched", () => {
			const form = createForm(testSchema, initial);
			expect(form.touched.name).toBe(false);
			expect(form.touched.email).toBe(false);
		});

		it("initializes all fields as not dirty", () => {
			const form = createForm(testSchema, initial);
			expect(form.dirty.name).toBe(false);
			expect(form.dirty.email).toBe(false);
		});

		it("isDirty is false initially", () => {
			const form = createForm(testSchema, initial);
			expect(form.isDirty).toBe(false);
		});

		it("exposes the underlying validator", () => {
			const form = createForm(testSchema, initial);
			expect(form.validator).toBeDefined();
			expect(typeof form.validator.validate).toBe("function");
			expect(typeof form.validator.validateField).toBe("function");
		});
	});

	// ---------------------------------------------------------------
	// blur
	// ---------------------------------------------------------------

	describe("blur", () => {
		it("marks the field as touched", () => {
			const form = createForm(testSchema, initial);
			form.blur("name");
			expect(form.touched.name).toBe(true);
			expect(form.touched.email).toBe(false);
		});

		it("sets errors for an invalid field", () => {
			const form = createForm(testSchema, initial);
			form.blur("name");
			expect(form.errors.name).toContain("Name is required");
		});

		it("clears errors for a valid field", () => {
			const form = createForm(testSchema, initial);
			// First trigger an error
			form.blur("name");
			expect(form.errors.name).toBeDefined();

			// Fix the value and blur again
			form.data.name = "Taro";
			form.blur("name");
			expect(form.errors.name).toBeUndefined();
		});

		it("only updates errors for the blurred field", () => {
			const form = createForm(testSchema, initial);
			form.blur("name");
			// email was never blurred, should have no errors
			expect(form.errors.email).toBeUndefined();
		});

		it("marks field as dirty when value differs from initial", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "changed";
			form.blur("name");
			expect(form.dirty.name).toBe(true);
			expect(form.isDirty).toBe(true);
		});

		it("marks field as not dirty when value matches initial", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "changed";
			form.blur("name");
			expect(form.dirty.name).toBe(true);

			// Revert to initial value
			form.data.name = "";
			form.blur("name");
			expect(form.dirty.name).toBe(false);
		});

		it("isDirty reflects current data without requiring blur", () => {
			const form = createForm(testSchema, initial);
			expect(form.isDirty).toBe(false);

			// Change data without blurring
			form.data.name = "changed";
			expect(form.isDirty).toBe(true);

			// Revert without blurring
			form.data.name = "";
			expect(form.isDirty).toBe(false);
		});
	});

	// ---------------------------------------------------------------
	// validate
	// ---------------------------------------------------------------

	describe("validate", () => {
		it("returns valid: true for valid data", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "Taro";
			form.data.email = "taro@example.com";
			const result = form.validate();
			expect(result.valid).toBe(true);
		});

		it("returns valid: false and sets errors for invalid data", () => {
			const form = createForm(testSchema, initial);
			const result = form.validate();
			expect(result.valid).toBe(false);
			expect(form.errors.name).toBeDefined();
			expect(form.errors.email).toBeDefined();
		});

		it("marks all fields as touched", () => {
			const form = createForm(testSchema, initial);
			expect(form.touched.name).toBe(false);
			expect(form.touched.email).toBe(false);

			form.validate();

			expect(form.touched.name).toBe(true);
			expect(form.touched.email).toBe(true);
		});

		it("updates dirty state for all fields", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "changed";
			expect(form.dirty.name).toBe(false); // not yet computed

			form.validate();

			expect(form.dirty.name).toBe(true);
			expect(form.dirty.email).toBe(false);
		});

		it("clears errors on successful validation", () => {
			const form = createForm(testSchema, initial);
			// First create errors
			form.validate();
			expect(form.errors.name).toBeDefined();

			// Fix data and validate again
			form.data.name = "Taro";
			form.data.email = "taro@example.com";
			const result = form.validate();

			expect(result.valid).toBe(true);
			expect(form.errors).toEqual({});
		});
	});

	// ---------------------------------------------------------------
	// reset
	// ---------------------------------------------------------------

	describe("reset", () => {
		it("resets data to initial values", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "changed";
			form.data.email = "changed@example.com";

			form.reset();

			expect(form.data.name).toBe("");
			expect(form.data.email).toBe("");
		});

		it("clears all errors", () => {
			const form = createForm(testSchema, initial);
			form.validate(); // creates errors
			expect(Object.keys(form.errors).length).toBeGreaterThan(0);

			form.reset();

			expect(form.errors).toEqual({});
		});

		it("resets touched state", () => {
			const form = createForm(testSchema, initial);
			form.blur("name");
			form.blur("email");
			expect(form.touched.name).toBe(true);

			form.reset();

			expect(form.touched.name).toBe(false);
			expect(form.touched.email).toBe(false);
		});

		it("resets dirty state", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "changed";
			form.blur("name");
			expect(form.dirty.name).toBe(true);

			form.reset();

			expect(form.dirty.name).toBe(false);
			expect(form.isDirty).toBe(false);
		});

		it("allows re-validation after reset", () => {
			const form = createForm(testSchema, initial);
			form.data.name = "Taro";
			form.data.email = "taro@example.com";
			form.validate();

			form.reset();
			const result = form.validate();

			expect(result.valid).toBe(false);
			expect(form.errors.name).toBeDefined();
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

		it("detects cross-field errors via blur", () => {
			const form = createForm(passwordSchema, {
				password: "12345678",
				confirmPassword: "different",
			});

			form.blur("confirmPassword");

			expect(form.errors.confirmPassword).toContain(
				"Passwords do not match",
			);
		});

		it("detects cross-field errors via validate", () => {
			const form = createForm(passwordSchema, {
				password: "12345678",
				confirmPassword: "different",
			});

			const result = form.validate();

			expect(result.valid).toBe(false);
			expect(form.errors.confirmPassword).toContain(
				"Passwords do not match",
			);
		});
	});

	// ---------------------------------------------------------------
	// populate
	// ---------------------------------------------------------------

	describe("populate", () => {
		it("sets new data values", () => {
			const form = createForm(testSchema, initial);
			form.populate({ name: "Taro", email: "taro@example.com" });

			expect(form.data.name).toBe("Taro");
			expect(form.data.email).toBe("taro@example.com");
		});

		it("clears errors, touched, and dirty", () => {
			const form = createForm(testSchema, initial);
			form.blur("name"); // sets touched, may set errors
			form.data.name = "modified";
			form.blur("name"); // sets dirty

			form.populate({ name: "New", email: "new@example.com" });

			expect(form.errors).toEqual({});
			expect(form.touched.name).toBe(false);
			expect(form.touched.email).toBe(false);
			expect(form.dirty.name).toBe(false);
			expect(form.dirty.email).toBe(false);
		});

		it("supports partial data (only updates specified fields)", () => {
			const form = createForm(testSchema, { name: "Original", email: "orig@example.com" });
			form.populate({ name: "Updated" });

			expect(form.data.name).toBe("Updated");
			expect(form.data.email).toBe("orig@example.com"); // unchanged
		});

		it("does not affect isDirty after populate", () => {
			const form = createForm(testSchema, initial);
			form.populate({ name: "Taro", email: "taro@example.com" });

			// isDirty compares against _initialData (the original initial values)
			// After populate, data differs from initial, so isDirty is true
			expect(form.isDirty).toBe(true);
		});
	});
});
