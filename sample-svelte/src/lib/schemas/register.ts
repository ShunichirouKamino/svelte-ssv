import { z } from "zod";

export const registerSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().min(1, "Email is required").email("Invalid email format"),
		password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type RegisterData = {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
};
