import type { Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { createFormValidator } from "@svelte-ssv/core";

const loginSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email format"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(8, "Password must be at least 8 characters"),
});

const validator = createFormValidator(loginSchema);

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const result = validator.validate(data);
		if (!result.valid) {
			return fail(400, { errors: result.errors });
		}

		// Simulate authentication failure for demo purposes
		if (result.data.email === "error@example.com") {
			return fail(500, { errors: validator.setServerError("Authentication service unavailable. Please try again later.") });
		}

		// Demo always succeeds for other emails
		console.log("Login attempt:", result.data.email);

		return { success: true };
	},
} satisfies Actions;
