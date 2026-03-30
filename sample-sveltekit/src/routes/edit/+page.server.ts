import type { Actions } from "./$types";
import { createFormValidator } from "@svelte-ssv/core";
import { userSchema } from "$lib/schemas/user";

const validator = createFormValidator(userSchema);

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const result = validator.validate(data);
		if (!result.valid) {
			return { success: false };
		}

		console.log("User saved:", result.data);
		return { success: true };
	},
} satisfies Actions;
