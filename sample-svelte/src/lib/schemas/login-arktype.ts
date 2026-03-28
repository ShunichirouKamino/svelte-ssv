import { type } from "arktype";

export const loginSchemaArktype = type({
	email: "string.email",
	password: "string >= 8",
});

export type LoginDataArktype = {
	email: string;
	password: string;
};
