<script lang="ts">
	import LoginForm from "./components/LoginForm.svelte";
	import LoginValibot from "./components/LoginValibot.svelte";
	import LoginArktype from "./components/LoginArktype.svelte";
	import Counter from "./components/Counter.svelte";
	import RegisterForm from "./components/RegisterForm.svelte";
	import RegisterToast from "./components/RegisterToast.svelte";
	import RegisterSummary from "./components/RegisterSummary.svelte";
	import EditUsers from "./components/EditUsers.svelte";
	import StepForm from "./components/StepForm.svelte";
	import InlineTable from "./components/InlineTable.svelte";

	type Page = "login" | "valibot" | "arktype" | "register" | "toast" | "summary" | "edit" | "step" | "inline" | "counter";
	let currentPage = $state<Page>("login");

	const sections: { label: string; items: { id: Page; label: string }[] }[] = [
		{
			label: "Simple Form",
			items: [
				{ id: "login", label: "Login (Zod)" },
				{ id: "valibot", label: "Valibot" },
				{ id: "arktype", label: "ArkType" },
			],
		},
		{
			label: "Register",
			items: [
				{ id: "register", label: "Register" },
				{ id: "toast", label: "Toast" },
				{ id: "summary", label: "Summary" },
			],
		},
		{
			label: "CRUD",
			items: [
				{ id: "edit", label: "Edit (Modal)" },
				{ id: "step", label: "Steps" },
				{ id: "inline", label: "Inline" },
			],
		},
		{
			label: "Other",
			items: [
				{ id: "counter", label: "Counter" },
			],
		},
	];

</script>

<div class="layout">
	<aside>
		<span class="logo">@svelte-ssv/core</span>
		<span class="env-badge">Svelte (no SvelteKit)</span>

		<nav>
			{#each sections as section}
				<div class="section">
					<h3>{section.label}</h3>
					{#each section.items as item}
						<button
							class:active={currentPage === item.id}
							onclick={() => (currentPage = item.id)}
						>
							{item.label}
						</button>
					{/each}
				</div>
			{/each}
		</nav>
	</aside>

	<main>
		{#if currentPage === "login"}
			<LoginForm />
		{:else if currentPage === "valibot"}
			<LoginValibot />
		{:else if currentPage === "arktype"}
			<LoginArktype />
		{:else if currentPage === "register"}
			<RegisterForm />
		{:else if currentPage === "toast"}
			<RegisterToast />
		{:else if currentPage === "summary"}
			<RegisterSummary />
		{:else if currentPage === "edit"}
			<EditUsers />
		{:else if currentPage === "step"}
			<StepForm />
		{:else if currentPage === "inline"}
			<InlineTable />
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

	.layout {
		display: flex;
		min-height: 100vh;
	}

	aside {
		width: 220px;
		flex-shrink: 0;
		background: #fff;
		border-right: 1px solid #d1d5db;
		padding: 1.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}

	.logo {
		font-weight: 700;
		font-size: 0.95rem;
		color: #4f46e5;
	}

	.env-badge {
		font-size: 0.65rem;
		font-weight: 600;
		background: #059669;
		color: white;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		align-self: flex-start;
		margin-bottom: 0.75rem;
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section h3 {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		padding: 0.5rem 0.5rem 0.2rem;
		margin: 0;
	}

	.section button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
		color: #1f2937;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.1s;
	}

	.section button:hover {
		background: #f3f4f6;
	}

	.section button.active {
		background: #eef2ff;
		color: #4f46e5;
		font-weight: 600;
	}

	main {
		flex: 1;
		padding: 2rem 2.5rem;
		max-width: 900px;
	}
</style>
