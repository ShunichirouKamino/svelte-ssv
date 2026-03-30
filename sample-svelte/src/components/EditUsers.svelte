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

	let editTarget = $state<User | null>(null);
	let showDialog = $state(false);

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

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) return;

		if (editTarget) {
			users = users.map((u) =>
				u.id === editTarget!.id ? { ...u, ...result.data } : u,
			);
		} else {
			const newId = Math.max(...users.map((u) => u.id)) + 1;
			users = [...users, { id: newId, ...result.data }];
		}

		showDialog = false;
		editTarget = null;
	}

	function closeDialog() {
		showDialog = false;
		editTarget = null;
	}
</script>

<h1>Edit Users</h1>
<p class="description">
	Click a user to edit. Demonstrates <code>form.populate()</code> for
	loading existing data with clean dirty/touched state.
</p>

<button type="button" class="create-btn" onclick={openCreate}>+ Add User</button>

<table>
	<thead>
		<tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
	</thead>
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
	<div class="overlay" onclick={closeDialog}>
		<div class="dialog" onclick={(e) => e.stopPropagation()}>
			<h2>{editTarget ? "Edit User" : "New User"}</h2>

			<form onsubmit={handleSubmit} novalidate>
				<div class="field">
					<label for="name">Name {#if form.dirty.name}<span class="dirty-badge">modified</span>{/if}</label>
					<input id="name" type="text" bind:value={form.data.name}
						onblur={() => form.blur("name")} class:invalid={form.touched.name && form.errors.name} />
					{#if form.touched.name && form.errors.name}<p class="error">{form.errors.name[0]}</p>{/if}
				</div>

				<div class="field">
					<label for="email">Email {#if form.dirty.email}<span class="dirty-badge">modified</span>{/if}</label>
					<input id="email" type="email" bind:value={form.data.email}
						onblur={() => form.blur("email")} class:invalid={form.touched.email && form.errors.email} />
					{#if form.touched.email && form.errors.email}<p class="error">{form.errors.email[0]}</p>{/if}
				</div>

				<div class="field">
					<label for="role">Role {#if form.dirty.role}<span class="dirty-badge">modified</span>{/if}</label>
					<select id="role" bind:value={form.data.role}
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
					<button type="button" class="cancel-btn" onclick={closeDialog}>Cancel</button>
				</div>

				{#if form.isDirty}<p class="dirty-notice">You have unsaved changes.</p>{/if}
			</form>
		</div>
	</div>
{/if}

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: #6b7280; margin-bottom: 1rem; }
	.create-btn { padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-bottom: 1rem; }
	.create-btn:hover { background: #4338ca; }

	table { width: 100%; max-width: 600px; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
	th { text-align: left; padding: 0.6rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: #6b7280; border-bottom: 1px solid #d1d5db; }
	td { padding: 0.6rem 0.75rem; font-size: 0.9rem; border-bottom: 1px solid #d1d5db; }
	tr:last-child td { border-bottom: none; }
	.role-badge { font-size: 0.75rem; background: #eef2ff; color: #4f46e5; padding: 0.15rem 0.5rem; border-radius: 4px; }
	.edit-btn { padding: 0.3rem 0.6rem; background: none; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
	.edit-btn:hover { border-color: #4f46e5; color: #4f46e5; }

	.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100; }
	.dialog { background: #fff; border-radius: 8px; padding: 1.5rem; width: 400px; max-width: 90vw; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
	.dialog h2 { font-size: 1.1rem; margin-bottom: 1rem; }

	.field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
	label { font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
	.dirty-badge { font-size: 0.7rem; font-weight: 500; color: #4f46e5; background: #eef2ff; padding: 0.1rem 0.4rem; border-radius: 4px; }
	input, select { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; }
	input:focus, select:focus { border-color: #4f46e5; }
	.invalid { border-color: #dc2626 !important; }
	.error { color: #dc2626; font-size: 0.8rem; }
	.actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
	.submit-btn { padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover:not(:disabled) { background: #4338ca; }
	.submit-btn:disabled, .reset-btn:disabled { opacity: 0.4; cursor: default; }
	.reset-btn { padding: 0.5rem 1rem; background: none; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
	.cancel-btn { padding: 0.5rem 1rem; background: none; border: none; font-size: 0.85rem; color: #6b7280; cursor: pointer; }
	.dirty-notice { font-size: 0.8rem; color: #4f46e5; font-style: italic; margin-top: 0.25rem; }
</style>
