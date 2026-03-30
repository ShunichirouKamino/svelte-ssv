import type { Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { createFormValidator } from "@svelte-ssv/core";
import { registerSchema } from "$lib/schemas/register";

const validator = createFormValidator(registerSchema);

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const result = validator.validate(data);
		if (!result.valid) {
			return fail(400, { errors: result.errors });
		}

		// Simulate duplicate email for demo purposes
		if (result.data.email === "taken@example.com") {
			return fail(409, {
				errors: validator.setServerError("This email is already registered."),
			});
		}

		console.log("Registration:", result.data.name, result.data.email);

		return { success: true };
	},
} satisfies Actions;
