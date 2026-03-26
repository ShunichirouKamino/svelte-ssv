<script lang="ts">
	import { enhance } from "$app/forms";
	import { z } from "zod";
	import {
		createFormValidator,
		createEnhanceHandler,
		type FormErrors,
	} from "@svelte-ssv/core";

	const loginSchema = z.object({
		email: z.string().min(1, "Email is required").email("Invalid email format"),
		password: z
			.string()
			.min(1, "Password is required")
			.min(8, "Password must be at least 8 characters"),
	});

	type LoginForm = z.infer<typeof loginSchema>;

	const validator = createFormValidator(loginSchema);

	let formData = $state<LoginForm>({ email: "", password: "" });
	let errors = $state<FormErrors<LoginForm>>({});
	let submitted = $state(false);

	function handleBlur(field: keyof LoginForm) {
		const result = validator.validateField(field, formData);
		errors = validator.mergeFieldErrors(errors, field, result);
	}

	const handleEnhance = createEnhanceHandler(validator, {
		getData: () => formData,
		setErrors: (e) => {
			errors = e;
		},
		onSuccess: () => {
			submitted = true;
			formData = { email: "", password: "" };
			errors = {};
		},
	});
</script>

<h1>Login Form</h1>
<p class="description">
	Real-time validation on blur + submit-time validation via <code>createEnhanceHandler</code>.
</p>

{#if submitted}
	<div class="success-banner">
		Login successful! (This is a demo — no actual authentication occurred.)
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<form method="POST" novalidate use:enhance={handleEnhance}>
	<div class="field">
		<label for="email">Email</label>
		<input
			id="email"
			name="email"
			type="email"
			placeholder="you@example.com"
			bind:value={formData.email}
			onblur={() => handleBlur("email")}
			class:invalid={errors.email}
		/>
		{#if errors.email}
			<p class="error">{errors.email[0]}</p>
		{/if}
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input
			id="password"
			name="password"
			type="password"
			placeholder="At least 8 characters"
			bind:value={formData.password}
			onblur={() => handleBlur("password")}
			class:invalid={errors.password}
		/>
		{#if errors.password}
			<p class="error">{errors.password[0]}</p>
		{/if}
	</div>

	<button type="submit" class="submit-btn">Sign In</button>
</form>

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li><code>validateField</code> + <code>mergeFieldErrors</code> run on each <code>blur</code> event for instant field-level feedback</li>
		<li><code>createEnhanceHandler</code> wraps SvelteKit's <code>use:enhance</code> to validate all fields on submit, cancel if invalid, and call <code>onSuccess</code> on server success</li>
		<li>The Zod schema is defined once and shared between client and server</li>
	</ul>
</section>

<style>
	h1 {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.description {
		color: var(--color-text-muted);
		margin-bottom: 1.5rem;
	}

	form {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 400px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: var(--color-primary);
	}

	input.invalid {
		border-color: var(--color-error);
	}

	.error {
		color: var(--color-error);
		font-size: 0.8rem;
	}

	.submit-btn {
		padding: 0.6rem 1.2rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.submit-btn:hover {
		background: var(--color-primary-hover);
	}

	.success-banner {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: var(--color-success);
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.9rem;
		max-width: 400px;
	}

	.success-banner button {
		background: none;
		border: none;
		color: var(--color-success);
		cursor: pointer;
		font-weight: 600;
		font-size: 0.8rem;
	}

	.code-note {
		margin-top: 2rem;
		padding: 1rem 1.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		max-width: 400px;
	}

	.code-note h2 {
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
	}

	.code-note ul {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
</style>
