// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createEnhanceHandler } from "./enhance";
import { createEnhanceForm } from "./enhance-form";
import { createFormValidator } from "../core/validator";

const testSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email format"),
});

function createMockInput(
	overrides?: Partial<Parameters<ReturnType<typeof createEnhanceHandler>>[0]>,
) {
	return {
		cancel: vi.fn(),
		formData: new FormData(),
		formElement: document.createElement("form"),
		action: new URL("http://localhost/?/create"),
		submitter: null,
		controller: new AbortController(),
		...overrides,
	};
}

describe("createEnhanceHandler", () => {
	const validator = createFormValidator(testSchema);

	it("does not call cancel on successful validation", () => {
		const setErrors = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ name: "Taro", email: "a@b.com" }),
			setErrors,
		});

		const input = createMockInput();
		const result = handler(input);

		expect(input.cancel).not.toHaveBeenCalled();
		expect(setErrors).toHaveBeenCalledWith({});
		expect(result).toBeDefined(); // post-submit handler is returned
	});

	it("calls cancel and sets errors on validation failure", () => {
		const setErrors = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ name: "", email: "bad" }),
			setErrors,
		});

		const input = createMockInput();
		const result = handler(input);

		expect(input.cancel).toHaveBeenCalled();
		expect(setErrors).toHaveBeenCalledWith(
			expect.objectContaining({
				name: expect.arrayContaining(["Name is required"]),
				email: expect.arrayContaining(["Invalid email format"]),
			}),
		);
		expect(result).toBeUndefined(); // no post-submit handler
	});

	it("calls onSuccess on server success", async () => {
		const onSuccess = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ name: "Taro", email: "a@b.com" }),
			setErrors: vi.fn(),
			onSuccess,
		});

		const input = createMockInput();
		// biome-ignore lint/complexity/noBannedTypes: type assertion for testing
		const afterSubmit = handler(input) as Function;
		expect(afterSubmit).toBeDefined();

		await afterSubmit({
			update: vi.fn(),
			result: { type: "success" },
			formData: new FormData(),
			formElement: document.createElement("form"),
			action: new URL("http://localhost"),
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess on server failure", async () => {
		const onSuccess = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ name: "Taro", email: "a@b.com" }),
			setErrors: vi.fn(),
			onSuccess,
		});

		const input = createMockInput();
		// biome-ignore lint/complexity/noBannedTypes: type assertion for testing
		const afterSubmit = handler(input) as Function;

		await afterSubmit({
			update: vi.fn(),
			result: { type: "failure" },
			formData: new FormData(),
			formElement: document.createElement("form"),
			action: new URL("http://localhost"),
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("cancels submission when onBeforeSubmit returns false", () => {
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ name: "Taro", email: "a@b.com" }),
			setErrors: vi.fn(),
			onBeforeSubmit: () => false,
		});

		const input = createMockInput();
		handler(input);

		expect(input.cancel).toHaveBeenCalled();
	});

	it("calls onAfterSubmit regardless of success or failure", async () => {
		const onAfterSubmit = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ name: "Taro", email: "a@b.com" }),
			setErrors: vi.fn(),
			onAfterSubmit,
		});

		const input = createMockInput();
		// biome-ignore lint/complexity/noBannedTypes: type assertion for testing
		const afterSubmit = handler(input) as Function;

		await afterSubmit({
			update: vi.fn(),
			result: { type: "failure" },
			formData: new FormData(),
			formElement: document.createElement("form"),
			action: new URL("http://localhost"),
		});

		expect(onAfterSubmit).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------
// createEnhanceForm
// ---------------------------------------------------------------

describe("createEnhanceForm", () => {
	it("creates a form with enhance property", () => {
		const form = createEnhanceForm(testSchema, {
			initial: { name: "", email: "" },
		});

		expect(form.data).toEqual({ name: "", email: "" });
		expect(form.errors).toEqual({});
		expect(form.touched.name).toBe(false);
		expect(form.enhance).toBeDefined();
		expect(typeof form.enhance).toBe("function");
	});

	it("enhance cancels on validation failure", () => {
		const form = createEnhanceForm(testSchema, {
			initial: { name: "", email: "bad" },
		});

		const input = createMockInput();
		const result = form.enhance(input);

		expect(input.cancel).toHaveBeenCalled();
		expect(result).toBeUndefined();
		// All fields should be touched after enhance validation
		expect(form.touched.name).toBe(true);
		expect(form.touched.email).toBe(true);
	});

	it("enhance does not cancel on validation success", () => {
		const form = createEnhanceForm(testSchema, {
			initial: { name: "Taro", email: "a@b.com" },
		});

		const input = createMockInput();
		const result = form.enhance(input);

		expect(input.cancel).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});

	it("onSuccess callback is called on server success", async () => {
		const onSuccess = vi.fn();
		const form = createEnhanceForm(testSchema, {
			initial: { name: "Taro", email: "a@b.com" },
			onSuccess,
		});

		const input = createMockInput();
		// biome-ignore lint/complexity/noBannedTypes: type assertion for testing
		const afterSubmit = form.enhance(input) as Function;

		await afterSubmit({
			update: vi.fn(),
			result: { type: "success" },
			formData: new FormData(),
			formElement: document.createElement("form"),
			action: new URL("http://localhost"),
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("blur works on the enhance form", () => {
		const form = createEnhanceForm(testSchema, {
			initial: { name: "", email: "" },
		});

		form.blur("email");

		expect(form.touched.email).toBe(true);
		expect(form.errors.email).toBeDefined();
	});

	it("populate works on the enhance form", () => {
		const form = createEnhanceForm(testSchema, {
			initial: { name: "", email: "" },
		});

		form.populate({ name: "Taro", email: "taro@example.com" });

		expect(form.data.name).toBe("Taro");
		expect(form.data.email).toBe("taro@example.com");
		expect(form.touched.name).toBe(false);
		expect(form.errors).toEqual({});
	});

	it("reset works on the enhance form", () => {
		const form = createEnhanceForm(testSchema, {
			initial: { name: "", email: "" },
		});

		form.data.name = "Modified";
		form.blur("name");
		form.reset();

		expect(form.data.name).toBe("");
		expect(form.touched.name).toBe(false);
		expect(form.errors).toEqual({});
	});
});
