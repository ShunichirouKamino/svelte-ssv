<script lang="ts">
	import { createForm } from "@svelte-ssv/core/form";
	import { userSchema, type User, type UserForm, type UserExtraErrors } from "$lib/schemas/user";

	// Mock data — in a real app this would come from a server load function
	let users = $state<User[]>([
		{ id: 1, name: "Alice", email: "alice@example.com", role: "Admin", age: 30 },
		{ id: 2, name: "Bob", email: "bob@example.com", role: "Editor", age: 25 },
		{ id: 3, name: "Charlie", email: "charlie@example.com", role: "Viewer", age: 15 },
	]);

	let form = $state(
		createForm<UserForm, UserExtraErrors>(userSchema, { name: "", email: "", role: "", age: 0 }),
	);

	let editTarget = $state<User | null>(null);
	let showDialog = $state(false);

	function openEdit(user: User) {
		editTarget = user;
		form.populate({ name: user.name, email: user.email, role: user.role, age: user.age });
		showDialog = true;
	}

	function openCreate() {
		editTarget = null;
		form.populate({ name: "", email: "", role: "", age: 0 });
		showDialog = true;
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) return;

		if (editTarget) {
			// Update existing user
			users = users.map((u) =>
				u.id === editTarget!.id ? { ...u, ...result.data } : u,
			);
		} else {
			// Create new user
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

<h1>Edit Users <span class="badge">populate()</span></h1>
<p class="description">
	Click a user to edit. Demonstrates <code>form.populate()</code> for
	loading existing data with clean dirty/touched state.<br />
	<strong>Custom error keys demo:</strong> Try setting Role to "Admin" with Age &lt; 18.
	The cross-field error (<code>_adminAge</code>) appears in the banner below the form fields.
</p>

<button type="button" class="create-btn" onclick={openCreate}>
	+ Add User
</button>

<table>
	<thead>
		<tr>
			<th>Name</th>
			<th>Email</th>
			<th>Role</th>
			<th>Age</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each users as user}
			<tr>
				<td>{user.name}</td>
				<td>{user.email}</td>
				<td><span class="role-badge">{user.role}</span></td>
				<td>{user.age}</td>
				<td>
					<button class="edit-btn" onclick={() => openEdit(user)}>Edit</button>
				</td>
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
					<label for="name">
						Name
						{#if form.dirty.name}<span class="dirty-badge">modified</span>{/if}
					</label>
					<input id="name" type="text" bind:value={form.data.name}
						onblur={() => form.blur("name")}
						class:invalid={form.touched.name && form.errors.name}
					/>
					{#if form.touched.name && form.errors.name}
						<p class="error">{form.errors.name[0]}</p>
					{/if}
				</div>

				<div class="field">
					<label for="email">
						Email
						{#if form.dirty.email}<span class="dirty-badge">modified</span>{/if}
					</label>
					<input id="email" type="email" bind:value={form.data.email}
						onblur={() => form.blur("email")}
						class:invalid={form.touched.email && form.errors.email}
					/>
					{#if form.touched.email && form.errors.email}
						<p class="error">{form.errors.email[0]}</p>
					{/if}
				</div>

				<div class="field">
					<label for="role">
						Role
						{#if form.dirty.role}<span class="dirty-badge">modified</span>{/if}
					</label>
					<select id="role" bind:value={form.data.role}
						onblur={() => form.blur("role")}
						class:invalid={form.touched.role && form.errors.role}
					>
						<option value="">Select role...</option>
						<option value="Admin">Admin</option>
						<option value="Editor">Editor</option>
						<option value="Viewer">Viewer</option>
					</select>
					{#if form.touched.role && form.errors.role}
						<p class="error">{form.errors.role[0]}</p>
					{/if}
				</div>

				<div class="field">
					<label for="age">
						Age
						{#if form.dirty.age}<span class="dirty-badge">modified</span>{/if}
					</label>
					<input id="age" type="number" bind:value={form.data.age}
						onblur={() => form.blur("age")}
						class:invalid={form.touched.age && form.errors.age}
					/>
					{#if form.touched.age && form.errors.age}
						<p class="error">{form.errors.age[0]}</p>
					{/if}
				</div>

				{#if form.errors._adminAge}
					<div class="cross-field-error">
						⚠️ {form.errors._adminAge[0]}
					</div>
				{/if}

				<div class="actions">
					<button type="submit" class="submit-btn" disabled={!form.isDirty}>
						{editTarget ? "Save Changes" : "Create"}
					</button>
					<button type="button" class="reset-btn" onclick={() => form.reset()} disabled={!form.isDirty}>
						Undo
					</button>
					<button type="button" class="cancel-btn" onclick={closeDialog}>Cancel</button>
				</div>

				{#if form.isDirty}
					<p class="dirty-notice">You have unsaved changes.</p>
				{/if}
			</form>
		</div>
	</div>
{/if}

<section class="code-note">
	<h2>What's happening</h2>
	<ul>
		<li>
			<code>form.populate(user)</code> sets data and updates the dirty baseline —
			<code>isDirty</code> starts as <code>false</code>
		</li>
		<li>
			<strong>Save</strong> button is disabled until the user actually edits something
			(<code>disabled={"{"}!form.isDirty{"}"}</code>)
		</li>
		<li>
			<strong>Undo</strong> calls <code>form.reset()</code> which restores to the
			populated values (not the empty initial), because <code>populate()</code> updates
			the baseline
		</li>
		<li>
			Same form handles both <strong>create</strong> (populate with empty) and
			<strong>edit</strong> (populate with existing data)
		</li>
	</ul>
</section>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.badge { font-size: 0.7rem; font-weight: 600; background: var(--color-primary); color: white; padding: 0.1rem 0.4rem; border-radius: 4px; vertical-align: middle; }
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
	.submit-btn:disabled { opacity: 0.4; cursor: default; }
	.reset-btn { padding: 0.5rem 1rem; background: none; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 0.85rem; cursor: pointer; }
	.reset-btn:disabled { opacity: 0.4; cursor: default; }
	.cancel-btn { padding: 0.5rem 1rem; background: none; border: none; font-size: 0.85rem; color: var(--color-text-muted); cursor: pointer; }
	.dirty-notice { font-size: 0.8rem; color: var(--color-primary); font-style: italic; margin-top: 0.25rem; }
	.cross-field-error { background: #fef2f2; border: 1px solid #fecaca; color: var(--color-error); padding: 0.5rem 0.75rem; border-radius: var(--radius); font-size: 0.85rem; margin-bottom: 0.5rem; }

	.code-note { margin-top: 2rem; padding: 1rem 1.5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); max-width: 600px; }
	.code-note h2 { font-size: 0.95rem; margin-bottom: 0.5rem; }
	.code-note ul { font-size: 0.85rem; color: var(--color-text-muted); padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; }
</style>
