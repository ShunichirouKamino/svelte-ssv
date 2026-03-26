import type { Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { z } from "zod";

const loginSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email format"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(8, "Password must be at least 8 characters"),
});

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const result = loginSchema.safeParse(data);
		if (!result.success) {
			return fail(400, { errors: result.error.flatten().fieldErrors });
		}

		// Simulate authentication — demo always succeeds
		console.log("Login attempt:", result.data.email);

		return { success: true };
	},
} satisfies Actions;
