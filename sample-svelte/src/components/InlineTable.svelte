<script lang="ts">
	import { createForm, type Form } from "@svelte-ssv/core/form";
	import { userSchema, type User, type UserForm } from "../lib/schemas/user";

	let users = $state<User[]>([
		{ id: 1, name: "Alice", email: "alice@example.com", role: "Admin" },
		{ id: 2, name: "Bob", email: "bob@example.com", role: "Editor" },
		{ id: 3, name: "Charlie", email: "charlie@example.com", role: "Viewer" },
	]);

	let form: Form<UserForm> = $state(
		createForm(userSchema, { name: "", email: "", role: "" }),
	);

	let editingId = $state<number | null>(null);

	function startEdit(user: User) {
		editingId = user.id;
		form.populate({ name: user.name, email: user.email, role: user.role });
	}

	function saveEdit() {
		const result = form.validate();
		if (!result.valid) return;
		users = users.map((u) => u.id === editingId ? { ...u, ...result.data } : u);
		editingId = null;
	}
</script>

<h1>Inline Table Edit</h1>
<p class="description">
	Click Edit to transform a row into inputs. <code>populate()</code>
	switches between rows without re-creating the form.
</p>

<table>
	<thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
	<tbody>
		{#each users as user}
			{#if editingId === user.id}
				<tr class="editing-row">
					<td>
						<input type="text" bind:value={form.data.name}
							onblur={() => form.blur("name")} class:invalid={form.touched.name && form.errors.name} />
						{#if form.touched.name && form.errors.name}<span class="cell-error">{form.errors.name[0]}</span>{/if}
					</td>
					<td>
						<input type="email" bind:value={form.data.email}
							onblur={() => form.blur("email")} class:invalid={form.touched.email && form.errors.email} />
						{#if form.touched.email && form.errors.email}<span class="cell-error">{form.errors.email[0]}</span>{/if}
					</td>
					<td>
						<select bind:value={form.data.role}
							onblur={() => form.blur("role")} class:invalid={form.touched.role && form.errors.role}>
							<option value="">Select...</option>
							<option value="Admin">Admin</option>
							<option value="Editor">Editor</option>
							<option value="Viewer">Viewer</option>
						</select>
						{#if form.touched.role && form.errors.role}<span class="cell-error">{form.errors.role[0]}</span>{/if}
					</td>
					<td class="action-cell">
						<button class="save-btn" onclick={saveEdit} disabled={!form.isDirty}>Save</button>
						<button class="cancel-btn" onclick={() => editingId = null}>Cancel</button>
					</td>
				</tr>
			{:else}
				<tr>
					<td>{user.name}</td>
					<td>{user.email}</td>
					<td><span class="role-badge">{user.role}</span></td>
					<td><button class="edit-btn" onclick={() => startEdit(user)}>Edit</button></td>
				</tr>
			{/if}
		{/each}
	</tbody>
</table>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: #6b7280; margin-bottom: 1.5rem; }
	table { width: 100%; max-width: 700px; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
	th { text-align: left; padding: 0.6rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: #6b7280; border-bottom: 1px solid #d1d5db; }
	td { padding: 0.5rem 0.75rem; font-size: 0.9rem; border-bottom: 1px solid #d1d5db; vertical-align: top; }
	tr:last-child td { border-bottom: none; }
	.editing-row { background: #fafbff; }
	.editing-row td input, .editing-row td select { width: 100%; padding: 0.35rem 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.85rem; outline: none; }
	.editing-row td input:focus, .editing-row td select:focus { border-color: #4f46e5; }
	.invalid { border-color: #dc2626 !important; }
	.cell-error { display: block; color: #dc2626; font-size: 0.75rem; margin-top: 0.15rem; }
	.role-badge { font-size: 0.75rem; background: #eef2ff; color: #4f46e5; padding: 0.15rem 0.5rem; border-radius: 4px; }
	.action-cell { white-space: nowrap; }
	.edit-btn { padding: 0.3rem 0.6rem; background: none; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.edit-btn:hover { border-color: #4f46e5; color: #4f46e5; }
	.save-btn { padding: 0.3rem 0.6rem; background: #4f46e5; color: white; border: none; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.save-btn:disabled { opacity: 0.4; cursor: default; }
	.cancel-btn { padding: 0.3rem 0.6rem; background: none; border: none; font-size: 0.8rem; color: #6b7280; cursor: pointer; }
</style>
