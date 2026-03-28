<script lang="ts">
	import { createForm, type Form } from "@svelte-ssv/core/form";
	import { loginSchemaValibot, type LoginDataValibot } from "../lib/schemas/login-valibot";

	let form: Form<LoginDataValibot> = $state(
		createForm(loginSchemaValibot, { email: "", password: "" }),
	);
	let submitted = $state(false);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) return;

		console.log("Login (Valibot):", result.data);
		submitted = true;
		form.reset();
	}
</script>

<h1>Login — Valibot</h1>
<p class="description">
	Same ssv API, but the schema is defined with <strong>Valibot</strong> instead of Zod.
	Works via <a href="https://github.com/standard-schema/standard-schema">Standard Schema V1</a>.
</p>

<div class="lib-badge">Schema: <code>valibot</code></div>

{#if submitted}
	<div class="success-banner">
		Login successful!
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<form onsubmit={handleSubmit} novalidate>
	<div class="field">
		<label for="email">Email</label>
		<input id="email" type="email" placeholder="you@example.com"
			bind:value={form.data.email} onblur={() => form.blur("email")}
			class:invalid={form.touched.email && form.errors.email}
		/>
		{#if form.touched.email && form.errors.email}
			<p class="error">{form.errors.email[0]}</p>
		{/if}
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input id="password" type="password" placeholder="At least 8 characters"
			bind:value={form.data.password} onblur={() => form.blur("password")}
			class:invalid={form.touched.password && form.errors.password}
		/>
		{#if form.touched.password && form.errors.password}
			<p class="error">{form.errors.password[0]}</p>
		{/if}
	</div>

	<button type="submit" class="submit-btn">Sign In</button>
</form>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: #6b7280; margin-bottom: 1rem; }
	.lib-badge { display: inline-block; font-size: 0.75rem; font-weight: 600; background: #fbbf24; color: #78350f; padding: 0.15rem 0.6rem; border-radius: 4px; margin-bottom: 1rem; }
	form { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	label { font-size: 0.875rem; font-weight: 600; }
	input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
	input:focus { border-color: #4f46e5; }
	input.invalid { border-color: #dc2626; }
	.error { color: #dc2626; font-size: 0.8rem; }
	.submit-btn { padding: 0.6rem 1.2rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover { background: #4338ca; }
	.success-banner { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; max-width: 400px; }
	.success-banner button { background: none; border: none; color: #16a34a; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
</style>
