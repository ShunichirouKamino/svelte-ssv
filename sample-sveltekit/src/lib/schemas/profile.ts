import { z } from "zod";

export const profileSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().min(1, "Email is required").email("Invalid email format"),
	company: z.string().min(1, "Company is required"),
	role: z.string().min(1, "Role is required"),
});

export type ProfileForm = {
	name: string;
	email: string;
	company: string;
	role: string;
};
