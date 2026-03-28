import * as v from "valibot";

export const loginSchemaValibot = v.object({
	email: v.pipe(
		v.string(),
		v.nonEmpty("Email is required"),
		v.email("Invalid email format"),
	),
	password: v.pipe(
		v.string(),
		v.nonEmpty("Password is required"),
		v.minLength(8, "Password must be at least 8 characters"),
	),
});

export type LoginDataValibot = {
	email: string;
	password: string;
};
