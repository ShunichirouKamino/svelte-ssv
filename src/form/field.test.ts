// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createForm } from "./form";

const schema = z.object({
	name: z.string().min(1, "Name is required"),
	bio: z.string(),
	role: z.string().min(1, "Role is required"),
	age: z.number({ error: "Age is required" }).nullable(),
	agree: z.boolean(),
	plan: z.string(),
});

type TestForm = z.infer<typeof schema>;

const initial: TestForm = { name: "Taro", bio: "", role: "", age: 20, agree: false, plan: "free" };

function input(type = "text", value?: string): HTMLInputElement {
	const el = document.createElement("input");
	el.type = type;
	if (value !== undefined) el.value = value;
	return el;
}

function fire(el: Element, type: string) {
	el.dispatchEvent(new Event(type));
}

describe("form.field()", () => {
	describe("text input", () => {
		it("writes the initial value and does not set name", () => {
			const form = createForm(schema, initial);
			const el = input();
			form.field("name")(el);

			expect(el.value).toBe("Taro");
			expect(el.hasAttribute("name")).toBe(false);
		});

		it("adopts a value typed before the first run (hydration)", () => {
			const form = createForm(schema, initial);
			const el = input();
			el.value = "typed before hydration";
			form.field("name")(el);

			expect(el.value).toBe("typed before hydration");
			expect(form.data.name).toBe("typed before hydration");
		});

		it("does not treat the markup value attribute as user input", () => {
			const form = createForm(schema, initial);
			const el = input();
			el.setAttribute("value", "from markup");
			form.field("name")(el);

			expect(el.value).toBe("Taro");
		});

		it("updates form.data on input", () => {
			const form = createForm(schema, initial);
			const el = input();
			form.field("name")(el);

			el.value = "Hanako";
			fire(el, "input");

			expect(form.data.name).toBe("Hanako");
		});

		it("calls blur() on blur, marking touched and validating", () => {
			const form = createForm(schema, initial);
			const el = input();
			form.field("name")(el);

			el.value = "";
			fire(el, "input");
			fire(el, "blur");

			expect(form.touched.name).toBe(true);
			expect(form.dirty.name).toBe(true);
			expect(form.errors.name).toEqual(["Name is required"]);
		});

		it("removes listeners on cleanup", () => {
			const form = createForm(schema, initial);
			const el = input();
			const cleanup = form.field("name")(el);
			cleanup();

			el.value = "Changed";
			fire(el, "input");
			fire(el, "blur");

			expect(form.data.name).toBe("Taro");
			expect(form.touched.name).toBe(false);
		});
	});

	describe("aria-invalid", () => {
		it("is set when touched and invalid, and removed when fixed (on re-run)", () => {
			const form = createForm(schema, initial);
			const el = input();
			const attach = form.field("role");

			attach(el);
			expect(el.hasAttribute("aria-invalid")).toBe(false);

			fire(el, "blur");
			// Svelte re-runs the attachment when touched/errors change
			attach(el);
			expect(el.getAttribute("aria-invalid")).toBe("true");

			el.value = "Admin";
			fire(el, "input");
			fire(el, "blur");
			attach(el);
			expect(el.hasAttribute("aria-invalid")).toBe(false);
		});
	});

	describe("re-sync on re-run", () => {
		it("writes reset() / populate() values back into the element", () => {
			const form = createForm(schema, initial);
			const el = input();
			const attach = form.field("name");
			attach(el);

			el.value = "Edited";
			fire(el, "input");
			form.reset();
			attach(el);
			expect(el.value).toBe("Taro");

			form.populate({ name: "Jiro" });
			attach(el);
			expect(el.value).toBe("Jiro");
		});

		it("writes null/undefined as an empty string", () => {
			const form = createForm(schema, initial);
			const el = input();
			el.setAttribute("value", "x");
			form.populate({ name: undefined as unknown as string });
			form.field("name")(el);

			expect(el.value).toBe("");
		});
	});

	describe("textarea", () => {
		it("syncs value on input", () => {
			const form = createForm(schema, initial);
			const el = document.createElement("textarea");
			form.field("bio")(el);

			el.value = "Hello";
			fire(el, "input");

			expect(form.data.bio).toBe("Hello");
		});
	});

	describe("select", () => {
		it("writes the value and updates on change", () => {
			const form = createForm(schema, { ...initial, role: "Editor" });
			const el = document.createElement("select");
			for (const v of ["", "Admin", "Editor"]) {
				const opt = document.createElement("option");
				opt.value = v;
				el.append(opt);
			}
			form.field("role")(el);
			expect(el.value).toBe("Editor");

			el.value = "Admin";
			fire(el, "change");
			expect(form.data.role).toBe("Admin");
		});
	});

	describe("number input", () => {
		it("coerces to number, and empty to null", () => {
			const form = createForm(schema, initial);
			const el = input("number");
			form.field("age")(el);
			expect(el.value).toBe("20");

			el.value = "42";
			fire(el, "input");
			expect(form.data.age).toBe(42);

			el.value = "";
			fire(el, "input");
			expect(form.data.age).toBeNull();
		});

		it("does not overwrite an element value that is numerically equal", () => {
			const form = createForm(schema, { ...initial, age: 1 });
			const el = input("number");
			const attach = form.field("age");
			attach(el);

			el.value = "1.0";
			fire(el, "input");
			attach(el);

			expect(form.data.age).toBe(1);
			expect(el.value).toBe("1.0");
		});
	});

	describe("checkbox", () => {
		it("syncs checked as boolean on change", () => {
			const form = createForm(schema, { ...initial, agree: true });
			const el = input("checkbox");
			form.field("agree")(el);
			expect(el.checked).toBe(true);

			el.checked = false;
			fire(el, "change");
			expect(form.data.agree).toBe(false);
		});
	});

	describe("radio", () => {
		it("checks the matching radio and stores the checked value", () => {
			const form = createForm(schema, initial);
			const free = input("radio", "free");
			const pro = input("radio", "pro");
			form.field("plan")(free);
			form.field("plan")(pro);

			expect(free.checked).toBe(true);
			expect(pro.checked).toBe(false);

			pro.checked = true;
			fire(pro, "change");
			expect(form.data.plan).toBe("pro");
		});

		it("ignores change events from an unchecked radio", () => {
			const form = createForm(schema, initial);
			const free = input("radio", "free");
			form.field("plan")(free);

			free.checked = false;
			fire(free, "change");
			expect(form.data.plan).toBe("free");
		});
	});
	describe("review fixes", () => {
		const numSchema = z.object({ n: z.number(), tags: z.array(z.string()) });

		function select(values: string[]): HTMLSelectElement {
			const el = document.createElement("select");
			for (const v of values) {
				const opt = document.createElement("option");
				opt.value = v;
				el.append(opt);
			}
			return el;
		}

		it("radio with a numeric field checks the matching radio and keeps a number", () => {
			const form = createForm(numSchema, { n: 2, tags: [] });
			const radios = ["1", "2", "3"].map((v) => input("radio", v));
			for (const r of radios) form.field("n")(r);

			expect(radios.map((r) => r.checked)).toEqual([false, true, false]);

			radios[0].checked = true;
			fire(radios[0], "change");
			expect(form.data.n).toBe(1);
		});

		it("select with a numeric field keeps a number", () => {
			const form = createForm(numSchema, { n: 2, tags: [] });
			const el = select(["1", "2"]);
			form.field("n")(el);
			expect(el.value).toBe("2");

			el.value = "1";
			fire(el, "change");
			expect(form.data.n).toBe(1);
		});

		it("select re-applies the value when options are added after mount", async () => {
			const form = createForm(schema, { ...initial, role: "Editor" });
			const el = select([]);
			form.field("role")(el);

			for (const v of ["Admin", "Editor"]) {
				const opt = document.createElement("option");
				opt.value = v;
				el.append(opt);
			}
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(el.value).toBe("Editor");
			expect(form.data.role).toBe("Editor");
		});

		it("select without an explicit selected option is not treated as user input", () => {
			const form = createForm(schema, { ...initial, role: "Editor" });
			const el = select(["", "Admin", "Editor"]);
			form.field("role")(el);

			expect(form.data.role).toBe("Editor");
			expect(el.value).toBe("Editor");
		});

		it("throws for checkbox groups (array values)", () => {
			const form = createForm(numSchema, { n: 0, tags: ["a"] });
			const el = input("checkbox", "a");

			expect(() => form.field("tags")(el)).toThrow(/bind:group/);
		});
	});
});
