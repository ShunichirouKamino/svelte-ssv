<script lang="ts">
	import { createForm, type Form } from "@svelte-ssv/core/form";
	import { registerSchema, type RegisterData } from "../lib/schemas/register";

	let form: Form<RegisterData> = $state(
		createForm(registerSchema, { name: "", email: "", password: "", confirmPassword: "" }),
	);
	let submitted = $state(false);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) return;

		console.log("Register:", result.data);
		submitted = true;
		form.reset();
	}
</script>

<h1>Register Form</h1>
<p class="description">
	Unified form state via <code>createForm</code> with <strong>touched</strong> /
	<strong>dirty</strong> tracking and cross-field validation (<code>.refine()</code>).
</p>

{#if submitted}
	<div class="success-banner">
		Registration successful! (Demo — no actual request.)
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<form onsubmit={handleSubmit} novalidate>
	<div class="field">
		<label for="name">
			Name
			{#if form.dirty.name}<span class="dirty-badge">modified</span>{/if}
		</label>
		<input id="name" type="text" placeholder="Your name"
			bind:value={form.data.name} onblur={() => form.blur("name")}
			class:invalid={form.touched.name && form.errors.name}
		/>
		{#if form.touched.name && form.errors.name}
			<p class="error">{form.errors.name[0]}</p>
		{/if}
	</div>

	<div class="field">
		<label for="email">
			Email
			{#if form.dirty.email}<span class="dirty-badge">modified</span>{/if}
		</label>
		<input id="email" type="email" placeholder="you@example.com"
			bind:value={form.data.email} onblur={() => form.blur("email")}
			class:invalid={form.touched.email && form.errors.email}
		/>
		{#if form.touched.email && form.errors.email}
			<p class="error">{form.errors.email[0]}</p>
		{/if}
	</div>

	<div class="field">
		<label for="password">
			Password
			{#if form.dirty.password}<span class="dirty-badge">modified</span>{/if}
		</label>
		<input id="password" type="password" placeholder="At least 8 characters"
			bind:value={form.data.password} onblur={() => form.blur("password")}
			class:invalid={form.touched.password && form.errors.password}
		/>
		{#if form.touched.password && form.errors.password}
			<p class="error">{form.errors.password[0]}</p>
		{/if}
	</div>

	<div class="field">
		<label for="confirmPassword">
			Confirm Password
			{#if form.dirty.confirmPassword}<span class="dirty-badge">modified</span>{/if}
		</label>
		<input id="confirmPassword" type="password" placeholder="Re-enter your password"
			bind:value={form.data.confirmPassword} onblur={() => form.blur("confirmPassword")}
			class:invalid={form.touched.confirmPassword && form.errors.confirmPassword}
		/>
		{#if form.touched.confirmPassword && form.errors.confirmPassword}
			<p class="error">{form.errors.confirmPassword[0]}</p>
		{/if}
	</div>

	<div class="actions">
		<button type="submit" class="submit-btn">Create Account</button>
		<button type="button" class="reset-btn" onclick={() => form.reset()} disabled={!form.isDirty}>Reset</button>
	</div>

	{#if form.isDirty}
		<p class="dirty-notice">You have unsaved changes.</p>
	{/if}
</form>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: #6b7280; margin-bottom: 1.5rem; }
	form { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	label { font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
	.dirty-badge { font-size: 0.7rem; font-weight: 500; color: #4f46e5; background: #eef2ff; padding: 0.1rem 0.4rem; border-radius: 4px; }
	input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
	input:focus { border-color: #4f46e5; }
	input.invalid { border-color: #dc2626; }
	.error { color: #dc2626; font-size: 0.8rem; }
	.actions { display: flex; gap: 0.75rem; }
	.submit-btn { padding: 0.6rem 1.2rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover { background: #4338ca; }
	.reset-btn { padding: 0.6rem 1.2rem; background: transparent; color: #6b7280; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
	.reset-btn:hover:not(:disabled) { border-color: #4f46e5; color: #1f2937; }
	.reset-btn:disabled { opacity: 0.4; cursor: default; }
	.dirty-notice { font-size: 0.8rem; color: #4f46e5; font-style: italic; }
	.success-banner { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; max-width: 400px; }
	.success-banner button { background: none; border: none; color: #16a34a; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
</style>
