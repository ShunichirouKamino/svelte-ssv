import type { Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { createFormValidator } from "@svelte-ssv/core";

const registerSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z
			.string()
			.min(1, "Email is required")
			.email("Invalid email format"),
		password: z
			.string()
			.min(1, "Password is required")
			.min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

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
				errors: validator.setServerError(
					"This email is already registered.",
				),
			});
		}

		console.log("Registration:", result.data.name, result.data.email);

		return { success: true };
	},
} satisfies Actions;
