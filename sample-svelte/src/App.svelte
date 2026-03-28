<script lang="ts">
	import LoginForm from "./components/LoginForm.svelte";
	import Counter from "./components/Counter.svelte";
	import RegisterForm from "./components/RegisterForm.svelte";
	import RegisterToast from "./components/RegisterToast.svelte";
	import RegisterSummary from "./components/RegisterSummary.svelte";

	type Page = "login" | "register" | "toast" | "summary" | "counter";
	let currentPage = $state<Page>("login");

	const pages: { id: Page; label: string }[] = [
		{ id: "login", label: "Login" },
		{ id: "register", label: "Register" },
		{ id: "toast", label: "Toast" },
		{ id: "summary", label: "Summary" },
		{ id: "counter", label: "Counter" },
	];
</script>

<div class="app">
	<header>
		<nav>
			<span class="logo">@svelte-ssv/core</span>
			<span class="badge">Svelte only (no SvelteKit)</span>
			<div class="links">
				{#each pages as page}
					<button class:active={currentPage === page.id} onclick={() => (currentPage = page.id)}>
						{page.label}
					</button>
				{/each}
			</div>
		</nav>
	</header>

	<main>
		{#if currentPage === "login"}
			<LoginForm />
		{:else if currentPage === "register"}
			<RegisterForm />
		{:else if currentPage === "toast"}
			<RegisterToast />
		{:else if currentPage === "summary"}
			<RegisterSummary />
		{:else}
			<Counter />
		{/if}
	</main>
</div>

<style>
	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		background: #f8f9fa;
		color: #1f2937;
		line-height: 1.6;
	}

	.app {
		max-width: 800px;
		margin: 0 auto;
	}

	header {
		border-bottom: 1px solid #d1d5db;
		padding: 0 1.5rem;
		background: #fff;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
		height: 56px;
		flex-wrap: wrap;
	}

	.logo {
		font-weight: 700;
		color: #4f46e5;
	}

	.badge {
		font-size: 0.7rem;
		font-weight: 600;
		background: #059669;
		color: white;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
	}

	.links {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}

	.links button {
		padding: 0.4rem 0.8rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: #fff;
		font-size: 0.85rem;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.links button:hover {
		border-color: #4f46e5;
	}

	.links button.active {
		background: #4f46e5;
		color: white;
		border-color: #4f46e5;
	}

	main {
		padding: 2rem 1.5rem;
	}
</style>
