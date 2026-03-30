<script lang="ts">
	import { enhance } from "$app/forms";
	import { createEnhanceForm } from "@svelte-ssv/core/enhance";
	import { userSchema, type User } from "$lib/schemas/user";

	let users = $state<User[]>([
		{ id: 1, name: "Alice", email: "alice@example.com", role: "Admin" },
		{ id: 2, name: "Bob", email: "bob@example.com", role: "Editor" },
		{ id: 3, name: "Charlie", email: "charlie@example.com", role: "Viewer" },
	]);

	let editTarget = $state<User | null>(null);
	let showDialog = $state(false);

	let form = $state(
		createEnhanceForm(userSchema, {
			initial: { name: "", email: "", role: "" },
			onSuccess: () => {
				if (editTarget) {
					users = users.map((u) =>
						u.id === editTarget!.id ? { ...u, ...form.data } : u,
					);
				} else {
					const newId = Math.max(...users.map((u) => u.id)) + 1;
					users = [...users, { id: newId, ...form.data }];
				}
				showDialog = false;
				editTarget = null;
			},
		}),
	);

	function openEdit(user: User) {
		editTarget = user;
		form.populate({ name: user.name, email: user.email, role: user.role });
		showDialog = true;
	}

	function openCreate() {
		editTarget = null;
		form.populate({ name: "", email: "", role: "" });
		showDialog = true;
	}
</script>

<h1>Edit Users</h1>
<p class="description">
	<code>createEnhanceForm</code> + <code>form.populate()</code> — CRUD pattern with
	modal dialog. Same form handles both create and edit.
</p>

<button type="button" class="create-btn" onclick={openCreate}>+ Add User</button>

<table>
	<thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
	<tbody>
		{#each users as user}
			<tr>
				<td>{user.name}</td>
				<td>{user.email}</td>
				<td><span class="role-badge">{user.role}</span></td>
				<td><button class="edit-btn" onclick={() => openEdit(user)}>Edit</button></td>
			</tr>
		{/each}
	</tbody>
</table>

{#if showDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" onclick={() => { showDialog = false; editTarget = null; }}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>{editTarget ? "Edit User" : "New User"}</h2>

			<form method="POST" novalidate use:enhance={form.enhance}>
				<div class="field">
					<label for="name">Name {#if form.dirty.name}<span class="dirty-badge">modified</span>{/if}</label>
					<input id="name" name="name" type="text" bind:value={form.data.name}
						onblur={() => form.blur("name")} class:invalid={form.touched.name && form.errors.name} />
					{#if form.touched.name && form.errors.name}<p class="error">{form.errors.name[0]}</p>{/if}
				</div>

				<div class="field">
					<label for="email">Email {#if form.dirty.email}<span class="dirty-badge">modified</span>{/if}</label>
					<input id="email" name="email" type="email" bind:value={form.data.email}
						onblur={() => form.blur("email")} class:invalid={form.touched.email && form.errors.email} />
					{#if form.touched.email && form.errors.email}<p class="error">{form.errors.email[0]}</p>{/if}
				</div>

				<div class="field">
					<label for="role">Role {#if form.dirty.role}<span class="dirty-badge">modified</span>{/if}</label>
					<select id="role" name="role" bind:value={form.data.role}
						onblur={() => form.blur("role")} class:invalid={form.touched.role && form.errors.role}>
						<option value="">Select role...</option>
						<option value="Admin">Admin</option>
						<option value="Editor">Editor</option>
						<option value="Viewer">Viewer</option>
					</select>
					{#if form.touched.role && form.errors.role}<p class="error">{form.errors.role[0]}</p>{/if}
				</div>

				<div class="actions">
					<button type="submit" class="submit-btn" disabled={!form.isDirty}>
						{editTarget ? "Save Changes" : "Create"}
					</button>
					<button type="button" class="reset-btn" onclick={() => form.reset()} disabled={!form.isDirty}>Undo</button>
					<button type="button" class="cancel-btn" onclick={() => { showDialog = false; editTarget = null; }}>Cancel</button>
				</div>

				{#if form.isDirty}<p class="dirty-notice">You have unsaved changes.</p>{/if}
			</form>
		</div>
	</div>
{/if}

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li><code>form.populate(user)</code> sets data and updates dirty baseline — <code>isDirty</code> starts <code>false</code></li>
		<li>Save is disabled until user edits (<code>disabled={"{"}!form.isDirty{"}"}</code>)</li>
		<li>Undo restores to populated values (not empty initial)</li>
		<li><code>populate()</code> preserves the <code>enhance</code> reference — no re-creation needed</li>
	</ul>
</section>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: var(--color-text-muted); margin-bottom: 1rem; }
	.create-btn { padding: 0.5rem 1rem; background: var(--color-primary); color: white; border: none; border-radius: var(--radius); font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-bottom: 1rem; }
	.create-btn:hover { background: var(--color-primary-hover); }
	table { width: 100%; max-width: 600px; border-collapse: collapse; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
	th { text-align: left; padding: 0.6rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); }
	td { padding: 0.6rem 0.75rem; font-size: 0.9rem; border-bottom: 1px solid var(--color-border); }
	tr:last-child td { border-bottom: none; }
	.role-badge { font-size: 0.75rem; background: #eef2ff; color: var(--color-primary); padding: 0.15rem 0.5rem; border-radius: 4px; }
	.edit-btn { padding: 0.3rem 0.6rem; background: none; border: 1px solid var(--color-border); border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.edit-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
	.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.dialog { background: var(--color-surface); border-radius: var(--radius); padding: 1.5rem; width: 400px; max-width: 90vw; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
	.dialog h2 { font-size: 1.1rem; margin-bottom: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
	label { font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
	.dirty-badge { font-size: 0.7rem; font-weight: 500; color: var(--color-primary); background: #eef2ff; padding: 0.1rem 0.4rem; border-radius: 4px; }
	input, select { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 0.9rem; outline: none; }
	input:focus, select:focus { border-color: var(--color-primary); }
	.invalid { border-color: var(--color-error) !important; }
	.error { color: var(--color-error); font-size: 0.8rem; }
	.actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
	.submit-btn { padding: 0.5rem 1rem; background: var(--color-primary); color: white; border: none; border-radius: var(--radius); font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover:not(:disabled) { background: var(--color-primary-hover); }
	.submit-btn:disabled, .reset-btn:disabled { opacity: 0.4; cursor: default; }
	.reset-btn { padding: 0.5rem 1rem; background: none; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 0.85rem; cursor: pointer; }
	.cancel-btn { padding: 0.5rem 1rem; background: none; border: none; font-size: 0.85rem; color: var(--color-text-muted); cursor: pointer; }
	.dirty-notice { font-size: 0.8rem; color: var(--color-primary); font-style: italic; margin-top: 0.25rem; }
	.code-note { margin-top: 2rem; padding: 1rem 1.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); max-width: 600px; }
	.code-note h2 { font-size: 0.95rem; margin-bottom: 0.5rem; }
	.code-note ul { font-size: 0.85rem; color: var(--color-text-muted); padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; }
</style>
