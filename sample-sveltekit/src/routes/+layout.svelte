<script>
	import "../app.css";
	import { page } from "$app/state";

	let { children } = $props();

	const sections = [
		{
			label: "Simple Form",
			items: [
				{ href: "/login", label: "Login" },
			],
		},
		{
			label: "Register",
			items: [
				{ href: "/register", label: "Register" },
				{ href: "/register-toast", label: "Toast" },
				{ href: "/register-summary", label: "Summary" },
			],
		},
		{
			label: "CRUD",
			items: [
				{ href: "/edit", label: "Edit (Modal)" },
				{ href: "/step-form", label: "Steps" },
				{ href: "/inline-table", label: "Inline" },
			],
		},
		{
			label: "Other",
			items: [
				{ href: "/counter", label: "Counter" },
			],
		},
	];
</script>

<div class="layout">
	<aside>
		<a href="/" class="logo">@svelte-ssv/core</a>
		<span class="env-badge">SvelteKit</span>

		<nav>
			{#each sections as section}
				<div class="section">
					<h3>{section.label}</h3>
					{#each section.items as item}
						<a href={item.href} class:active={page.url.pathname === item.href}>
							{item.label}
						</a>
					{/each}
				</div>
			{/each}
		</nav>
	</aside>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.layout {
		display: flex;
		min-height: 100vh;
	}

	aside {
		width: 220px;
		flex-shrink: 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
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
		color: var(--color-primary);
		text-decoration: none;
		padding-bottom: 0.25rem;
	}

	.env-badge {
		font-size: 0.65rem;
		font-weight: 600;
		background: var(--color-primary);
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
		color: var(--color-text-muted);
		padding: 0.5rem 0.5rem 0.2rem;
		margin: 0;
	}

	.section a {
		display: block;
		padding: 0.35rem 0.5rem;
		font-size: 0.85rem;
		color: var(--color-text);
		text-decoration: none;
		border-radius: 4px;
		transition: background 0.1s;
	}

	.section a:hover {
		background: #f3f4f6;
	}

	.section a.active {
		background: #eef2ff;
		color: var(--color-primary);
		font-weight: 600;
	}

	main {
		flex: 1;
		padding: 2rem 2.5rem;
		max-width: 900px;
	}
</style>
