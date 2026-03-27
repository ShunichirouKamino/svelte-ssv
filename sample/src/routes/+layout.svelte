<script>
	import "../app.css";

	let { children } = $props();
</script>

<header>
	<nav>
		<a href="/" class="logo">@svelte-ssv/core</a>
		<div class="links">
			<a href="/login">Login Form</a>
			<a href="/register">Register Form</a>
			<a href="/counter">Counter</a>
		</div>
	</nav>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		padding: 0 1.5rem;
	}

	nav {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
	}

	.logo {
		font-weight: 700;
		font-size: 1rem;
		color: var(--color-primary);
	}

	.links {
		display: flex;
		gap: 1.5rem;
	}

	main {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1.5rem;
	}
</style>
