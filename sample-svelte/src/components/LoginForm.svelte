<script lang="ts">
	import { createForm, type Form } from "@svelte-ssv/core/form";
	import { loginSchema, type LoginData } from "../lib/schemas/login";

	let form: Form<LoginData> = $state(
		createForm(loginSchema, { email: "", password: "" }),
	);
	let submitted = $state(false);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) return;

		// Simulate submission — in a real app this would be a fetch() call
		console.log("Login:", result.data);
		submitted = true;
		form.reset();
	}
</script>

<h1>Login Form</h1>
<p class="description">
	Pure Svelte (no SvelteKit). Uses <code>createForm</code> for unified state with
	touched/dirty tracking. Submission is handled via plain <code>onsubmit</code>.
</p>

{#if submitted}
	<div class="success-banner">
		Login successful! (Demo — no actual request was made.)
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<form onsubmit={handleSubmit} novalidate>
	<div class="field">
		<label for="email">Email</label>
		<input
			id="email"
			type="email"
			placeholder="you@example.com"
			bind:value={form.data.email}
			onblur={() => form.blur("email")}
			class:invalid={form.touched.email && form.errors.email}
		/>
		{#if form.touched.email && form.errors.email}
			<p class="error">{form.errors.email[0]}</p>
		{/if}
		{#if form.dirty.email}
			<span class="dirty-indicator">modified</span>
		{/if}
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input
			id="password"
			type="password"
			placeholder="At least 8 characters"
			bind:value={form.data.password}
			onblur={() => form.blur("password")}
			class:invalid={form.touched.password && form.errors.password}
		/>
		{#if form.touched.password && form.errors.password}
			<p class="error">{form.errors.password[0]}</p>
		{/if}
		{#if form.dirty.password}
			<span class="dirty-indicator">modified</span>
		{/if}
	</div>

	<div class="actions">
		<button type="submit" class="submit-btn">Sign In</button>
		<button type="button" class="reset-btn" onclick={() => form.reset()} disabled={!form.isDirty}>
			Reset
		</button>
	</div>
</form>

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li><code>createForm(schema, defaults)</code> creates unified state with <code>data</code>, <code>errors</code>, <code>touched</code>, <code>dirty</code></li>
		<li><code>form.blur('field')</code> on <code>onblur</code> marks the field as touched and validates it</li>
		<li><code>form.validate()</code> on submit marks all fields as touched and validates everything</li>
		<li><code>form.reset()</code> restores initial values and clears all state</li>
		<li>No SvelteKit required — works with plain <code>onsubmit</code> + <code>fetch()</code></li>
	</ul>
</section>

<style>
	h1 {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.description {
		color: #6b7280;
		margin-bottom: 1.5rem;
	}

	form {
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 8px;
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
		position: relative;
	}

	label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: #4f46e5;
	}

	input.invalid {
		border-color: #dc2626;
	}

	.error {
		color: #dc2626;
		font-size: 0.8rem;
	}

	.dirty-indicator {
		position: absolute;
		right: 0;
		top: 0;
		font-size: 0.7rem;
		color: #f59e0b;
		font-weight: 600;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.submit-btn {
		padding: 0.6rem 1.2rem;
		background: #4f46e5;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.submit-btn:hover {
		background: #4338ca;
	}

	.reset-btn {
		padding: 0.6rem 1.2rem;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.reset-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.reset-btn:not(:disabled):hover {
		border-color: #6b7280;
	}

	.success-banner {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #16a34a;
		padding: 0.75rem 1rem;
		border-radius: 8px;
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
		color: #16a34a;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.8rem;
	}

	.code-note {
		margin-top: 2rem;
		padding: 1rem 1.5rem;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		max-width: 400px;
	}

	.code-note h2 {
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
	}

	.code-note ul {
		font-size: 0.85rem;
		color: #6b7280;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
</style>
