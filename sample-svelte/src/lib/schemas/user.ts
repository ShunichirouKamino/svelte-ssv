import { z } from "zod";

export const userSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().min(1, "Email is required").email("Invalid email format"),
	role: z.string().min(1, "Role is required"),
});

export type UserForm = {
	name: string;
	email: string;
	role: string;
};

export type User = UserForm & { id: number };
