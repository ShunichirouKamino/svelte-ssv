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

	<a href="/register" class="card">
		<h2>Register Form <span class="badge">v0.3</span></h2>
		<p>
			Unified form state with <code>createForm</code> — automatic
			<strong>touched</strong> / <strong>dirty</strong> tracking, cross-field
			validation via <code>.refine()</code>, and reset support.
		</p>
	</a>

	<a href="/register-toast" class="card">
		<h2>Register — Toast <span class="badge">v0.3</span></h2>
		<p>
			Same <code>createForm</code> API, but errors appear as
			<strong>toast notifications</strong> in the top-right corner
			instead of inline text.
		</p>
	</a>

	<a href="/register-summary" class="card">
		<h2>Register — Summary <span class="badge">v0.3</span></h2>
		<p>
			Errors are collected in a <strong>summary box at the top</strong>
			of the form with click-to-scroll links. Follows the GOV.UK
			accessibility pattern.
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

	.badge {
		font-size: 0.7rem;
		font-weight: 600;
		background: var(--color-primary);
		color: white;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		vertical-align: middle;
	}
</style>
