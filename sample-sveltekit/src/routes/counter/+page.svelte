<script lang="ts">
	import { z } from "zod";
	import { createFormValidator, type FormErrors } from "@svelte-ssv/core";

	const counterSchema = z.object({
		count: z
			.number()
			.min(0, "Count cannot be negative")
			.max(100, "Count cannot exceed 100"),
	});

	type CounterForm = z.infer<typeof counterSchema>;

	const validator = createFormValidator(counterSchema);

	let count = $state(0);
	let errors = $state<FormErrors<CounterForm>>({});

	function updateCount(next: number) {
		const result = validator.validate({ count: next });
		if (result.valid) {
			count = next;
			errors = {};
		} else {
			errors = result.errors;
		}
	}

	function handleInput(e: Event) {
		const value = Number((e.target as HTMLInputElement).value);
		updateCount(value);
	}
</script>

<h1>Counter</h1>
<p class="description">
	A counter with min/max bounds (0–100) validated by Zod.
	Shows how ssv works for non-form use cases with <code>validate</code> directly.
</p>

<div class="counter-card">
	<div class="counter-display">{count}</div>

	<div class="controls">
		<button onclick={() => updateCount(count - 10)} class="btn">-10</button>
		<button onclick={() => updateCount(count - 1)} class="btn">-1</button>
		<button onclick={() => updateCount(count + 1)} class="btn">+1</button>
		<button onclick={() => updateCount(count + 10)} class="btn">+10</button>
	</div>

	<div class="input-row">
		<label for="direct-input">Set directly:</label>
		<input
			id="direct-input"
			type="number"
			min="0"
			max="100"
			value={count}
			oninput={handleInput}
			class:invalid={errors.count}
		/>
	</div>

	{#if errors.count}
		<p class="error">{errors.count[0]}</p>
	{/if}

	<button onclick={() => updateCount(0)} class="reset-btn">Reset</button>
</div>

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li><code>validator.validate({"{ count }"}) </code> checks bounds on every update</li>
		<li>If invalid, the count stays at its previous value and the error is displayed</li>
		<li>This demonstrates that ssv's core <code>createFormValidator</code> is framework-agnostic — no SvelteKit form actions needed</li>
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

	.counter-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2rem;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.counter-display {
		font-size: 3rem;
		font-weight: 700;
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
	}

	.controls {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.btn:hover {
		border-color: var(--color-primary);
		background: #f0f0ff;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	input[type="number"] {
		width: 80px;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		font-size: 0.9rem;
		text-align: center;
		outline: none;
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

	.reset-btn {
		padding: 0.4rem 1rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		font-size: 0.8rem;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.reset-btn:hover {
		border-color: var(--color-text-muted);
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
