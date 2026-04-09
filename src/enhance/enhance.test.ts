// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createEnhanceHandler } from "./enhance";
import { buildEnhanceHandler } from "./enhance-form";
import { createForm } from "../form/form";
import { createFormValidator } from "../core/validator";

const testSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email format"),
});

function createMockInput(overrides?: Partial<Parameters<ReturnType<typeof createEnhanceHandler>>[0]>) {
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
// createEnhanceHandler — custom error keys
// ---------------------------------------------------------------

describe("createEnhanceHandler with custom error keys", () => {
	const groupSchema = z
		.object({
			kbId: z.string().optional(),
			kbName: z.string().optional(),
			kbRegion: z.string().optional(),
		})
		.refine(
			(data) => {
				const fields = [data.kbId, data.kbName, data.kbRegion];
				const filled = fields.filter(Boolean).length;
				return filled === 0 || filled === 3;
			},
			{
				message: "All fields must be filled or all must be empty",
				path: ["_kbGroup"],
			},
		);

	type GroupForm = z.infer<typeof groupSchema>;

	const validator = createFormValidator<GroupForm, "_kbGroup">(groupSchema);

	it("surfaces custom key errors on validation failure", () => {
		const setErrors = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ kbId: "id1", kbName: undefined, kbRegion: undefined }),
			setErrors,
		});

		const input = createMockInput();
		handler(input);

		expect(input.cancel).toHaveBeenCalled();
		expect(setErrors).toHaveBeenCalledWith(
			expect.objectContaining({
				_kbGroup: expect.arrayContaining(["All fields must be filled or all must be empty"]),
			}),
		);
	});

	it("clears errors on successful validation with custom keys", () => {
		const setErrors = vi.fn();
		const handler = createEnhanceHandler(validator, {
			getData: () => ({ kbId: undefined, kbName: undefined, kbRegion: undefined }),
			setErrors,
		});

		const input = createMockInput();
		handler(input);

		expect(input.cancel).not.toHaveBeenCalled();
		expect(setErrors).toHaveBeenCalledWith({});
	});
});

// ---------------------------------------------------------------
// buildEnhanceHandler
// ---------------------------------------------------------------

describe("buildEnhanceHandler", () => {
	it("returns a function", () => {
		const form = createForm(testSchema, { name: "", email: "" });
		const handler = buildEnhanceHandler(form);

		expect(typeof handler).toBe("function");
	});

	it("cancels on validation failure and marks all fields touched", () => {
		const form = createForm(testSchema, { name: "", email: "bad" });
		const handler = buildEnhanceHandler(form);

		const input = createMockInput();
		const result = handler(input);

		expect(input.cancel).toHaveBeenCalled();
		expect(result).toBeUndefined();
		expect(form.touched.name).toBe(true);
		expect(form.touched.email).toBe(true);
		expect(form.errors.name).toBeDefined();
		expect(form.errors.email).toBeDefined();
	});

	it("does not cancel on validation success", () => {
		const form = createForm(testSchema, { name: "Taro", email: "a@b.com" });
		const handler = buildEnhanceHandler(form);

		const input = createMockInput();
		const result = handler(input);

		expect(input.cancel).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});

	it("calls onSuccess on server success", async () => {
		const onSuccess = vi.fn();
		const form = createForm(testSchema, { name: "Taro", email: "a@b.com" });
		const handler = buildEnhanceHandler(form, { onSuccess });

		const input = createMockInput();
		// biome-ignore lint/complexity/noBannedTypes: type assertion for testing
		const afterSubmit = handler(input) as Function;

		await afterSubmit({
			update: vi.fn(),
			result: { type: "success" },
			formData: new FormData(),
			formElement: document.createElement("form"),
			action: new URL("http://localhost"),
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("reads latest form data (simulating Proxy behavior)", () => {
		const form = createForm(testSchema, { name: "", email: "" });
		const handler = buildEnhanceHandler(form);

		// Simulate bind:value updating the form data
		form.data.name = "Taro";
		form.data.email = "taro@example.com";

		const input = createMockInput();
		const result = handler(input);

		// Should pass validation since data was updated
		expect(input.cancel).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});
});

// ---------------------------------------------------------------
// buildEnhanceHandler — custom error keys
// ---------------------------------------------------------------

describe("buildEnhanceHandler with custom error keys", () => {
	const groupSchema = z
		.object({
			kbId: z.string().optional(),
			kbName: z.string().optional(),
			kbRegion: z.string().optional(),
		})
		.refine(
			(data) => {
				const fields = [data.kbId, data.kbName, data.kbRegion];
				const filled = fields.filter(Boolean).length;
				return filled === 0 || filled === 3;
			},
			{
				message: "All fields must be filled or all must be empty",
				path: ["_kbGroup"],
			},
		);

	type GroupForm = z.infer<typeof groupSchema>;

	it("cancels on custom key validation failure and sets errors", () => {
		const form = createForm<GroupForm, "_kbGroup">(groupSchema, {
			kbId: "id1",
			kbName: undefined,
			kbRegion: undefined,
		});
		const handler = buildEnhanceHandler(form);

		const input = createMockInput();
		handler(input);

		expect(input.cancel).toHaveBeenCalled();
		expect(form.errors._kbGroup).toContain("All fields must be filled or all must be empty");
	});

	it("passes validation when all group fields are empty", () => {
		const form = createForm<GroupForm, "_kbGroup">(groupSchema, {
			kbId: undefined,
			kbName: undefined,
			kbRegion: undefined,
		});
		const handler = buildEnhanceHandler(form);

		const input = createMockInput();
		const result = handler(input);

		expect(input.cancel).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});
});
