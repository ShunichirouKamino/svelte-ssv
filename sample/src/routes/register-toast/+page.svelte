<script lang="ts">
	import { enhance } from "$app/forms";
	import { createForm } from "@svelte-ssv/core/form";
	import { createEnhanceHandler } from "@svelte-ssv/core/enhance";
	import { registerSchema } from "$lib/schemas/register";

	let form = $state(
		createForm(registerSchema, {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		}),
	);

	let submitted = $state(false);

	// --- Toast state ---
	type Toast = { id: number; message: string; type: "error" | "success" };
	let toasts = $state<Toast[]>([]);
	let nextId = 0;

	function addToast(message: string, type: "error" | "success" = "error") {
		const id = nextId++;
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 4000);
	}

	function removeToast(id: number) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	// --- Blur handler with toast ---
	function handleBlur(field: keyof typeof form.data) {
		form.blur(field);
		const fieldErrors = form.errors[field];
		if (fieldErrors && fieldErrors.length > 0) {
			addToast(fieldErrors[0]);
		}
	}

	const handleEnhance = createEnhanceHandler(form.validator, {
		getData: () => form.data,
		setErrors: (e) => {
			form.errors = e;
			// Show form-level errors as toasts
			if (e._form) {
				for (const msg of e._form) {
					addToast(msg);
				}
			}
		},
		onSuccess: () => {
			submitted = true;
			form.reset();
			addToast("Registration successful!", "success");
		},
	});
</script>

<h1>Register Form — Toast Pattern</h1>
<p class="description">
	Validation errors appear as <strong>toast notifications</strong> instead of
	inline text. Uses the same <code>createForm</code> API — only the display
	logic changes.
</p>

<!-- Toast container -->
<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}">
			<span>{toast.message}</span>
			<button onclick={() => removeToast(toast.id)}>×</button>
		</div>
	{/each}
</div>

{#if submitted}
	<div class="success-banner">
		Registration successful! (This is a demo — no actual account was created.)
		<button onclick={() => (submitted = false)}>Dismiss</button>
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

	<button type="submit" class="submit-btn">Create Account</button>
</form>

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li>
			<code>form.blur(field)</code> is called first, then
			<code>form.errors[field]</code> is checked — if errors exist, a toast
			is shown via a simple <code>addToast()</code> function
		</li>
		<li>
			No inline <code>&lt;p class="error"&gt;</code> elements — the input
			border turns red but the message appears as a toast in the top-right
		</li>
		<li>
			Server errors (<code>_form</code>) are also shown as toasts
		</li>
		<li>
			The toast system is ~20 lines of Svelte state — no external library needed.
			Replace with <code>svelte-french-toast</code> or any toast library of your choice
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

	/* Toast */
	.toast-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 1000;
		max-width: 360px;
	}

	.toast {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: slide-in 0.25s ease-out;
	}

	.toast-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: var(--color-error);
	}

	.toast-success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: var(--color-success);
	}

	.toast button {
		background: none;
		border: none;
		font-size: 1.1rem;
		cursor: pointer;
		color: inherit;
		opacity: 0.6;
		line-height: 1;
	}

	.toast button:hover {
		opacity: 1;
	}

	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
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
