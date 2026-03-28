<script lang="ts">
	import { z } from "zod";
	import { createForm, type Form } from "@svelte-ssv/core/form";

	const registerSchema = z
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

	type RegisterData = z.infer<typeof registerSchema>;

	const fieldLabels: Record<keyof RegisterData, string> = {
		name: "Name",
		email: "Email",
		password: "Password",
		confirmPassword: "Confirm Password",
	};

	let form: Form<RegisterData> = $state(
		createForm(registerSchema, { name: "", email: "", password: "", confirmPassword: "" }),
	);
	let submitted = $state(false);
	let showSummary = $state(false);

	function getVisibleErrors(): { field: string; label: string; message: string }[] {
		const result: { field: string; label: string; message: string }[] = [];
		for (const [field, messages] of Object.entries(form.errors)) {
			if (field === "_form") {
				for (const msg of messages as string[]) {
					result.push({ field: "_form", label: "Form", message: msg });
				}
			} else if (
				form.touched[field as keyof RegisterData] &&
				messages &&
				(messages as string[]).length > 0
			) {
				result.push({
					field,
					label: fieldLabels[field as keyof RegisterData] ?? field,
					message: (messages as string[])[0],
				});
			}
		}
		return result;
	}

	function handleBlur(field: keyof RegisterData) {
		form.blur(field);
		showSummary = true;
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		showSummary = true;
		if (!result.valid) return;

		console.log("Register:", result.data);
		submitted = true;
		showSummary = false;
		form.reset();
	}
</script>

<h1>Register — Summary</h1>
<p class="description">
	Errors collected in a <strong>summary box at the top</strong> with click-to-scroll links.
	Follows the GOV.UK accessibility pattern.
</p>

{#if submitted}
	<div class="success-banner">
		Registration successful! (Demo — no actual request.)
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

{#if showSummary && getVisibleErrors().length > 0}
	<div class="error-summary" role="alert">
		<h3>Please fix the following errors:</h3>
		<ul>
			{#each getVisibleErrors() as error}
				<li>
					<a href="#{error.field}" class="error-link">
						<strong>{error.label}:</strong> {error.message}
					</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<form onsubmit={handleSubmit} novalidate>
	<div class="field">
		<label for="name">Name</label>
		<input id="name" type="text" placeholder="Your name"
			bind:value={form.data.name} onblur={() => handleBlur("name")}
			class:invalid={form.touched.name && form.errors.name}
		/>
	</div>

	<div class="field">
		<label for="email">Email</label>
		<input id="email" type="email" placeholder="you@example.com"
			bind:value={form.data.email} onblur={() => handleBlur("email")}
			class:invalid={form.touched.email && form.errors.email}
		/>
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input id="password" type="password" placeholder="At least 8 characters"
			bind:value={form.data.password} onblur={() => handleBlur("password")}
			class:invalid={form.touched.password && form.errors.password}
		/>
	</div>

	<div class="field">
		<label for="confirmPassword">Confirm Password</label>
		<input id="confirmPassword" type="password" placeholder="Re-enter your password"
			bind:value={form.data.confirmPassword} onblur={() => handleBlur("confirmPassword")}
			class:invalid={form.touched.confirmPassword && form.errors.confirmPassword}
		/>
	</div>

	<div class="actions">
		<button type="submit" class="submit-btn">Create Account</button>
		<button type="button" class="reset-btn" disabled={!form.isDirty}
			onclick={() => { form.reset(); showSummary = false; }}>Reset</button>
	</div>
</form>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: #6b7280; margin-bottom: 1.5rem; }

	.error-summary { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; max-width: 400px; }
	.error-summary h3 { font-size: 0.95rem; color: #dc2626; margin-bottom: 0.5rem; }
	.error-summary ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
	.error-summary li { font-size: 0.85rem; }
	.error-link { color: #dc2626; text-decoration: underline; }
	.error-link:hover { color: #991b1b; }

	form { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	label { font-size: 0.875rem; font-weight: 600; }
	input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
	input:focus { border-color: #4f46e5; }
	input.invalid { border-color: #dc2626; }
	.actions { display: flex; gap: 0.75rem; }
	.submit-btn { padding: 0.6rem 1.2rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover { background: #4338ca; }
	.reset-btn { padding: 0.6rem 1.2rem; background: transparent; color: #6b7280; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
	.reset-btn:hover:not(:disabled) { border-color: #4f46e5; color: #1f2937; }
	.reset-btn:disabled { opacity: 0.4; cursor: default; }
	.success-banner { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; max-width: 400px; }
	.success-banner button { background: none; border: none; color: #16a34a; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
</style>
