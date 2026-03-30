<script lang="ts">
	import { enhance } from "$app/forms";
	import { createForm } from "@svelte-ssv/core/form";
	import { buildEnhanceHandler } from "@svelte-ssv/core/enhance";
	import { registerSchema } from "$lib/schemas/register";

	let submitted = $state(false);

	let form = $state(
		createForm(registerSchema, {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		}),
	);

	// buildEnhanceHandler must be called AFTER $state() wrapping.
	// It reads form.data through the Proxy to get latest bind:value values.
	const handleEnhance = buildEnhanceHandler(form, {
		onSuccess: () => {
			submitted = true;
			form.reset();
		},
	});
</script>

<h1>Register Form</h1>
<p class="description">
	<code>createForm</code> + <code>buildEnhance()</code> — unified form state with
	SvelteKit <code>use:enhance</code> in just 2 calls.
</p>

{#if submitted}
	<div class="success-banner">
		Registration successful!
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<form method="POST" novalidate use:enhance={handleEnhance}>
	<div class="field">
		<label for="name">Name {#if form.dirty.name}<span class="dirty-badge">modified</span>{/if}</label>
		<input id="name" name="name" type="text" placeholder="Your name"
			bind:value={form.data.name} onblur={() => form.blur("name")}
			class:invalid={form.touched.name && form.errors.name} />
		{#if form.touched.name && form.errors.name}<p class="error">{form.errors.name[0]}</p>{/if}
	</div>

	<div class="field">
		<label for="email">Email {#if form.dirty.email}<span class="dirty-badge">modified</span>{/if}</label>
		<input id="email" name="email" type="email" placeholder="you@example.com"
			bind:value={form.data.email} onblur={() => form.blur("email")}
			class:invalid={form.touched.email && form.errors.email} />
		{#if form.touched.email && form.errors.email}<p class="error">{form.errors.email[0]}</p>{/if}
	</div>

	<div class="field">
		<label for="password">Password {#if form.dirty.password}<span class="dirty-badge">modified</span>{/if}</label>
		<input id="password" name="password" type="password" placeholder="At least 8 characters"
			bind:value={form.data.password} onblur={() => form.blur("password")}
			class:invalid={form.touched.password && form.errors.password} />
		{#if form.touched.password && form.errors.password}<p class="error">{form.errors.password[0]}</p>{/if}
	</div>

	<div class="field">
		<label for="confirmPassword">Confirm Password {#if form.dirty.confirmPassword}<span class="dirty-badge">modified</span>{/if}</label>
		<input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your password"
			bind:value={form.data.confirmPassword} onblur={() => form.blur("confirmPassword")}
			class:invalid={form.touched.confirmPassword && form.errors.confirmPassword} />
		{#if form.touched.confirmPassword && form.errors.confirmPassword}<p class="error">{form.errors.confirmPassword[0]}</p>{/if}
	</div>

	{#if form.errors._form}
		<p class="error form-error">{form.errors._form[0]}</p>
	{/if}

	<div class="actions">
		<button type="submit" class="submit-btn">Create Account</button>
		<button type="button" class="reset-btn" disabled={!form.isDirty} onclick={() => form.reset()}>Reset</button>
	</div>

	{#if form.isDirty}<p class="dirty-notice">You have unsaved changes.</p>{/if}
</form>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: var(--color-text-muted); margin-bottom: 1.5rem; }
	form { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	label { font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
	.dirty-badge { font-size: 0.7rem; font-weight: 500; color: var(--color-primary); background: #eef2ff; padding: 0.1rem 0.4rem; border-radius: 4px; }
	input { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
	input:focus { border-color: var(--color-primary); }
	input.invalid { border-color: var(--color-error); }
	.error { color: var(--color-error); font-size: 0.8rem; }
	.form-error { padding: 0.5rem 0.75rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); }
	.actions { display: flex; gap: 0.75rem; }
	.submit-btn { padding: 0.6rem 1.2rem; background: var(--color-primary); color: white; border: none; border-radius: var(--radius); font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover { background: var(--color-primary-hover); }
	.reset-btn { padding: 0.6rem 1.2rem; background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 0.9rem; cursor: pointer; }
	.reset-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-text); }
	.reset-btn:disabled { opacity: 0.4; cursor: default; }
	.dirty-notice { font-size: 0.8rem; color: var(--color-primary); font-style: italic; }
	.success-banner { background: #f0fdf4; border: 1px solid #bbf7d0; color: var(--color-success); padding: 0.75rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; max-width: 400px; }
	.success-banner button { background: none; border: none; color: var(--color-success); cursor: pointer; font-weight: 600; font-size: 0.8rem; }
</style>
