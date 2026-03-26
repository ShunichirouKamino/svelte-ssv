<h1>@svelte-ssv/core — Sample App</h1>

<p class="description">
	Demonstrates how to use <code>@svelte-ssv/core</code> with SvelteKit for form validation.
</p>

<div class="cards">
	<a href="/login" class="card">
		<h2>Login Form</h2>
		<p>
			Email/password validation with real-time field-level feedback using
			<code>validateField</code> + <code>mergeFieldErrors</code>, and submit-time
			validation via <code>createEnhanceHandler</code>.
		</p>
	</a>

	<a href="/counter" class="card">
		<h2>Counter</h2>
		<p>
			A counter with min/max bounds validated by Zod. Shows how ssv works
			for non-form use cases with <code>validate</code> directly.
		</p>
	</a>
</div>

<style>
	h1 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.description {
		color: var(--color-text-muted);
		margin-bottom: 2rem;
	}

	.cards {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	}

	.card {
		display: block;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.5rem;
		transition: border-color 0.15s;
		color: inherit;
	}

	.card:hover {
		border-color: var(--color-primary);
		text-decoration: none;
	}

	.card h2 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		color: var(--color-primary);
	}

	.card p {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
</style>
