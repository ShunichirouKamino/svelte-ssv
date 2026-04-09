import { z } from "zod";

export const userSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().min(1, "Email is required").email("Invalid email format"),
		role: z.string().min(1, "Role is required"),
		age: z
			.number({ invalid_type_error: "Age must be a number" })
			.int("Age must be a whole number")
			.min(0, "Age must be 0 or older")
			.max(150, "Age must be 150 or younger"),
	})
	.refine((data) => !(data.role === "Admin" && data.age < 18), {
		message: "Admin must be at least 18 years old",
		path: ["_adminAge"],
	});

export type UserForm = {
	name: string;
	email: string;
	role: string;
	age: number;
};

/** Extra error keys from .refine() custom paths */
export type UserExtraErrors = "_adminAge";

export type User = UserForm & { id: number };
