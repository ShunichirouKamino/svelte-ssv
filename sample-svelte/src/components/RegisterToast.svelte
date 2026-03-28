<script lang="ts">
	import { z } from "zod";
	import { createForm, type Form } from "@svelte-ssv/core/form";

	const registerSchema = z
		.object({
			name: z.string().min(1, "Name is required"),
			email: z.string().min(1, "Email is required").email("Invalid email format"),
			password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
			confirmPassword: z.string().min(1, "Please confirm your password"),
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: "Passwords do not match",
			path: ["confirmPassword"],
		});

	type RegisterData = z.infer<typeof registerSchema>;

	let form: Form<RegisterData> = $state(
		createForm(registerSchema, { name: "", email: "", password: "", confirmPassword: "" }),
	);

	// --- Toast state ---
	type Toast = { id: number; message: string; type: "error" | "success" };
	let toasts = $state<Toast[]>([]);
	let nextId = 0;

	function addToast(message: string, type: "error" | "success" = "error") {
		const id = nextId++;
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 4000);
	}

	function removeToast(id: number) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	function handleBlur(field: keyof RegisterData) {
		form.blur(field);
		const fieldErrors = form.errors[field];
		if (fieldErrors && fieldErrors.length > 0) {
			addToast(fieldErrors[0]);
		}
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const result = form.validate();
		if (!result.valid) {
			for (const [field, messages] of Object.entries(form.errors)) {
				if (messages && (messages as string[]).length > 0) {
					addToast((messages as string[])[0]);
				}
			}
			return;
		}

		console.log("Register:", result.data);
		form.reset();
		addToast("Registration successful!", "success");
	}
</script>

<h1>Register — Toast</h1>
<p class="description">
	Validation errors appear as <strong>toast notifications</strong> in the top-right corner
	instead of inline text. Same <code>createForm</code> API — only the display changes.
</p>

<!-- Toast container -->
<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}">
			<span>{toast.message}</span>
			<button onclick={() => removeToast(toast.id)}>×</button>
		</div>
	{/each}
</div>

<form onsubmit={handleSubmit} novalidate>
	<div class="field">
		<label for="name">Name</label>
		<input id="name" type="text" placeholder="Your name"
			bind:value={form.data.name} onblur={() => handleBlur("name")}
			class:invalid={form.touched.name && form.errors.name}
		/>
	</div>

	<div class="field">
		<label for="email">Email</label>
		<input id="email" type="email" placeholder="you@example.com"
			bind:value={form.data.email} onblur={() => handleBlur("email")}
			class:invalid={form.touched.email && form.errors.email}
		/>
	</div>

	<div class="field">
		<label for="password">Password</label>
		<input id="password" type="password" placeholder="At least 8 characters"
			bind:value={form.data.password} onblur={() => handleBlur("password")}
			class:invalid={form.touched.password && form.errors.password}
		/>
	</div>

	<div class="field">
		<label for="confirmPassword">Confirm Password</label>
		<input id="confirmPassword" type="password" placeholder="Re-enter your password"
			bind:value={form.data.confirmPassword} onblur={() => handleBlur("confirmPassword")}
			class:invalid={form.touched.confirmPassword && form.errors.confirmPassword}
		/>
	</div>

	<button type="submit" class="submit-btn">Create Account</button>
</form>

<style>
	h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
	.description { color: #6b7280; margin-bottom: 1.5rem; }

	.toast-container { position: fixed; top: 1rem; right: 1rem; display: flex; flex-direction: column; gap: 0.5rem; z-index: 1000; max-width: 360px; }
	.toast { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); animation: slide-in 0.25s ease-out; }
	.toast-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
	.toast-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
	.toast button { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: inherit; opacity: 0.6; line-height: 1; }
	.toast button:hover { opacity: 1; }
	@keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

	form { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	label { font-size: 0.875rem; font-weight: 600; }
	input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.15s; }
	input:focus { border-color: #4f46e5; }
	input.invalid { border-color: #dc2626; }
	.submit-btn { padding: 0.6rem 1.2rem; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.submit-btn:hover { background: #4338ca; }
</style>
