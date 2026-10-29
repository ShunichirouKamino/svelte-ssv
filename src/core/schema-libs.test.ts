import { type } from "arktype";
import * as v from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createForm } from "../form/form";
import { createFormValidator } from "./validator";
import type { SchemaInput, StandardSchema } from "./validator";

// These tests also guard the types: `npm run typecheck` fails if Valibot / ArkType
// schemas stop being assignable to `SchemaInput` (see #16).

const valibotSchema = v.object({
	email: v.pipe(v.string(), v.nonEmpty("Email is required"), v.email("Invalid email format")),
	age: v.pipe(v.number(), v.minValue(18, "Must be 18 or older")),
});

const arktypeSchema = type({
	email: "string.email",
	age: "number >= 18",
});

type Data = { email: string; age: number };

describe("Valibot", () => {
	it("is assignable to SchemaInput", () => {
		expectTypeOf(valibotSchema).toExtend<SchemaInput<Data>>();
	});

	it("validates and returns field errors", () => {
		const validator = createFormValidator(valibotSchema);

		expect(validator.validate({ email: "a@b.com", age: 20 })).toMatchObject({
			valid: true,
			data: { email: "a@b.com", age: 20 },
		});

		const result = validator.validate({ email: "", age: 10 });
		expect(result.valid).toBe(false);
		expect(result.errors?.email?.[0]).toBe("Email is required");
		expect(result.errors?.age).toEqual(["Must be 18 or older"]);
	});

	it("works with createForm and infers the data type", () => {
		const form = createForm(valibotSchema, { email: "", age: 0 });
		expectTypeOf(form.data).toEqualTypeOf<Data>();

		form.blur("age");
		expect(form.errors.age).toEqual(["Must be 18 or older"]);
	});
});

describe("ArkType", () => {
	it("is assignable to SchemaInput", () => {
		expectTypeOf(arktypeSchema).toExtend<SchemaInput<Data>>();
	});

	it("validates and returns field errors", () => {
		const validator = createFormValidator(arktypeSchema);

		expect(validator.validate({ email: "a@b.com", age: 20 }).valid).toBe(true);

		const result = validator.validate({ email: "bad", age: 10 });
		expect(result.valid).toBe(false);
		expect(result.errors?.email).toHaveLength(1);
		expect(result.errors?.age).toHaveLength(1);
	});

	it("works with createForm", () => {
		const form = createForm(arktypeSchema, { email: "", age: 0 });
		expectTypeOf(form.data).toEqualTypeOf<Data>();

		form.validate();
		expect(form.errors.email).toBeDefined();
	});
});

describe("async Standard Schema", () => {
	const asyncSchema: StandardSchema<{ name: string }> = {
		"~standard": {
			version: 1,
			vendor: "test",
			validate: async (value) => ({ value: value as { name: string } }),
		},
	};

	it("is accepted by the type but rejected at runtime", () => {
		const validator = createFormValidator(asyncSchema);
		expect(() => validator.validate({ name: "x" })).toThrow(/async validation/);
	});
});
