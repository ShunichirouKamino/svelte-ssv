<script lang="ts">
	import { createForm, type Form } from "@svelte-ssv/core/form";
	import { profileSchema, type ProfileForm } from "../lib/schemas/profile";

	let form: Form<ProfileForm> = $state(
		createForm(profileSchema, { name: "", email: "", company: "", role: "" }),
	);

	let step = $state(1);
	let submitted = $state(false);
	let savedSteps = $state<Partial<ProfileForm>>({});

	function nextStep() {
		const fieldsToCheck = step === 1 ? ["name", "email"] : ["company", "role"];
		let hasError = false;
		for (const field of fieldsToCheck) {
			form.blur(field as keyof ProfileForm);
			if (form.errors[field as keyof ProfileForm]) hasError = true;
		}
		if (hasError) return;
		savedSteps = { ...savedSteps, ...form.data };
		step++;
	}

	function prevStep() {
		savedSteps = { ...savedSteps, ...form.data };
		step--;
		form.populate({ ...form.data, ...savedSteps });
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) return;
		console.log("Profile:", result.data);
		submitted = true;
		form.reset();
		step = 1;
		savedSteps = {};
	}
</script>

<h1>Step Form</h1>
<p class="description">
	Multi-step wizard using a single <code>createForm</code>.
	<code>populate()</code> restores data when navigating back.
</p>

<div class="step-indicator">
	<span class="step-dot" class:active={step >= 1}>1</span>
	<span class="step-line" class:active={step >= 2}></span>
	<span class="step-dot" class:active={step >= 2}>2</span>
	<span class="step-line" class:active={step >= 3}></span>
	<span class="step-dot" class:active={step >= 3}>3</span>
</div>

{#if submitted}
	<div class="success-banner">
		Profile created!
		<button onclick={() => (submitted = false)}>Dismiss</button>
	</div>
{/if}

<form onsubmit={handleSubmit} novalidate>
	{#if step === 1}
		<h3>Step 1: Basic Info</h3>
		<div class="field">
			<label for="name">Name</label>
			<input id="name" type="text" placeholder="Your name" bind:value={form.data.name}
				onblur={() => form.blur("name")} class:invalid={form.touched.name && form.errors.name} />
			{#if form.touched.name && form.errors.name}<p class="error">{form.errors.name[0]}</p>{/if}
		</div>
		<div class="field">
			<label for="email">Email</label>
			<input id="email" type="email" placeholder="you@example.com" bind:value={form.data.email}
				onblur={() => form.blur("email")} class:invalid={form.touched.email && form.errors.email} />
			{#if form.touched.email && form.errors.email}<p class="error">{form.errors.email[0]}</p>{/if}
		</div>
		<div class="actions"><button type="button" class="next-btn" onclick={nextStep}>Next →</button></div>

	{:else if step === 2}
		<h3>Step 2: Work Info</h3>
		<div class="field">
			<label for="company">Company</label>
			<input id="company" type="text" placeholder="Company name" bind:value={form.data.company}
				onblur={() => form.blur("company")} class:invalid={form.touched.company && form.errors.company} />
			{#if form.touched.company && form.errors.company}<p class="error">{form.errors.company[0]}</p>{/if}
		</div>
		<div class="field">
			<label for="role">Role</label>
			<input id="role" type="text" placeholder="Your role" bind:value={form.data.role}
				onblur={() => form.blur("role")} class:invalid={form.touched.role && form.errors.role} />
			{#if form.touched.role && form.errors.role}<p class="error">{form.errors.role[0]}</p>{/if}
		</div>
		<div class="actions">
			<button type="button" class="back-btn" onclick={prevStep}>← Back</button>
			<button type="button" class="next-btn" onclick={nextStep}>Next →</button>
		</div>

	{:else}
		<h3>Step 3: Confirm</h3>
		<dl class="summary">
			<dt>Name</dt><dd>{form.data.name}</dd>
			<dt>Email</dt><dd>{form.data.email}</dd>
			<dt>Company</dt><dd>{form.data.company}</dd>
			<dt>Role</dt><dd>{form.data.role}</dd>
		</dl>
		<div class="actions">
			<button type="button" class="back-btn" onclick={prevStep}>← Back</button>
			<button type="submit" class="submit-btn">Submit</button>
		</div>
	{/if}
</form>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	h3 { font-size: 1rem; margin-bottom: 0.75rem; }
	.description { color: #6b7280; margin-bottom: 1.5rem; }
	.step-indicator { display: flex; align-items: center; margin-bottom: 1.5rem; }
	.step-dot { width: 28px; height: 28px; border-radius: 50%; background: #d1d5db; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; }
	.step-dot.active { background: #4f46e5; }
	.step-line { flex: 1; height: 2px; background: #d1d5db; max-width: 60px; }
	.step-line.active { background: #4f46e5; }
	form { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 1.5rem; max-width: 400px; display: flex; flex-direction: column; gap: 0.75rem; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	label { font-size: 0.875rem; font-weight: 600; }
	input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; }
	input:focus { border-color: #4f46e5; }
	.invalid { border-color: #dc2626 !important; }
	.error { color: #dc2626; font-size: 0.8rem; }
	.actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
	.next-btn, .submit-btn { padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.back-btn { padding: 0.5rem 1rem; background: none; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
	.summary { display: grid; grid-template-columns: 100px 1fr; gap: 0.4rem 1rem; font-size: 0.9rem; }
	.summary dt { font-weight: 600; color: #6b7280; }
	.success-banner { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; max-width: 400px; }
	.success-banner button { background: none; border: none; color: #16a34a; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
</style>
