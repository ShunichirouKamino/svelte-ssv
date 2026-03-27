<script lang="ts">
	import { enhance } from "$app/forms";
	import { createForm } from "@svelte-ssv/core/form";
	import { createEnhanceHandler } from "@svelte-ssv/core/enhance";
	import { registerSchema, type RegisterForm } from "$lib/schemas/register";

	const fieldLabels: Record<keyof RegisterForm, string> = {
		name: "Name",
		email: "Email",
		password: "Password",
		confirmPassword: "Confirm Password",
	};

	let form = $state(
		createForm(registerSchema, {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		}),
	);

	let submitted = $state(false);
	let showSummary = $state(false);

	// Collect all visible errors (touched fields only)
	function getVisibleErrors(): { field: string; label: string; message: string }[] {
		const result: { field: string; label: string; message: string }[] = [];
		for (const [field, messages] of Object.entries(form.errors)) {
			if (field === "_form") {
				for (const msg of messages as string[]) {
					result.push({ field: "_form", label: "Form", message: msg });
				}
			} else if (
				form.touched[field as keyof RegisterForm] &&
				messages &&
				(messages as string[]).length > 0
			) {
				result.push({
					field,
					label: fieldLabels[field as keyof RegisterForm] ?? field,
					message: (messages as string[])[0],
				});
			}
		}
		return result;
	}

	function handleBlur(field: keyof RegisterForm) {
		form.blur(field);
		showSummary = true;
	}

	const handleEnhance = createEnhanceHandler(form.validator, {
		getData: () => form.data,
		setErrors: (e) => {
			form.errors = e;
			showSummary = true;
		},
		onSuccess: () => {
			submitted = true;
			showSummary = false;
			form.reset();
		},
	});
</script>

<h1>Register Form — Error Summary Pattern</h1>
<p class="description">
	All validation errors are collected in a <strong>summary box at the top</strong>
	of the form. Clicking an error scrolls to the corresponding field.
</p>

{#if submitted}
	<div class="success-banner">
		Registration successful! (This is a demo — no actual account was created.)
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<!-- Error summary at the top -->
{#if showSummary && getVisibleErrors().length > 0}
	<div class="error-summary" role="alert">
		<h3>Please fix the following errors:</h3>
		<ul>
			{#each getVisibleErrors() as error}
				<li>
					<a href="#{error.field}" class="error-link">
						<strong>{error.label}:</strong>
						{error.message}
					</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<form method="POST" novalidate use:enhance={handleEnhance}>
	<div class="field">
		<label for="name">Name</label>
		<input
			id="name"
			name="name"
			type="text"
			placeholder="Your name"
			bind:value={form.data.name}
			onblur={() => handleBlur("name")}
			class:invalid={form.touched.name && form.errors.name}
		/>
	</div>

	<div class="field">
		<label for="email">Email</label>
		<input
			id="email"
			name="email"
			type="email"
			placeholder="you@example.com"
			bind:value={form.data.email}
			onblur={() => handleBlur("email")}
			class:invalid={form.touched.email && form.errors.email}
		/>
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input
			id="password"
			name="password"
			type="password"
			placeholder="At least 8 characters"
			bind:value={form.data.password}
			onblur={() => handleBlur("password")}
			class:invalid={form.touched.password && form.errors.password}
		/>
	</div>

	<div class="field">
		<label for="confirmPassword">Confirm Password</label>
		<input
			id="confirmPassword"
			name="confirmPassword"
			type="password"
			placeholder="Re-enter your password"
			bind:value={form.data.confirmPassword}
			onblur={() => handleBlur("confirmPassword")}
			class:invalid={form.touched.confirmPassword &&
				form.errors.confirmPassword}
		/>
	</div>

	<div class="actions">
		<button type="submit" class="submit-btn">Create Account</button>
		<button
			type="button"
			class="reset-btn"
			disabled={!form.isDirty}
			onclick={() => { form.reset(); showSummary = false; }}
		>
			Reset
		</button>
	</div>
</form>

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li>
			<code>getVisibleErrors()</code> iterates over <code>form.errors</code>
			and filters by <code>form.touched</code> — only errors for fields the
			user has interacted with appear in the summary
		</li>
		<li>
			Each error links to its input via <code>href="#{'{'}field{'}'}"</code> for
			quick navigation (click-to-scroll)
		</li>
		<li>
			No inline error messages — the input border turns red but the text lives
			in the summary box only
		</li>
		<li>
			The summary uses <code>role="alert"</code> for screen reader
			accessibility
		</li>
		<li>
			This pattern is common in government and accessibility-focused forms
			(e.g., GOV.UK Design System)
		</li>
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

	/* Error summary */
	.error-summary {
		background: #fef2f2;
		border: 2px solid var(--color-error);
		border-radius: var(--radius);
		padding: 1rem 1.5rem;
		margin-bottom: 1.5rem;
		max-width: 400px;
	}

	.error-summary h3 {
		font-size: 0.95rem;
		color: var(--color-error);
		margin-bottom: 0.5rem;
	}

	.error-summary ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.error-summary li {
		font-size: 0.85rem;
	}

	.error-link {
		color: var(--color-error);
		text-decoration: underline;
	}

	.error-link:hover {
		color: #991b1b;
	}

	/* Form */
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

	.actions {
		display: flex;
		gap: 0.75rem;
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

	.reset-btn {
		padding: 0.6rem 1.2rem;
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		font-size: 0.9rem;
		cursor: pointer;
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.reset-btn:hover:not(:disabled) {
		border-color: var(--color-primary);
		color: var(--color-text);
	}

	.reset-btn:disabled {
		opacity: 0.4;
		cursor: default;
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
