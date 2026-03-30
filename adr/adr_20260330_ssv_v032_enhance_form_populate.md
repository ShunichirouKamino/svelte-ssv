# ADR: @svelte-ssv/core v0.3.2 — populate() + buildEnhanceHandler

- **Date**: 2026-03-30
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.3.1 Standard Schema](adr_20260328_ssv_v031_standard_schema.md)
- **Issue**: [#5](https://github.com/ShunichirouKamino/svelte-ssv/issues/5)

## Context

In real-world SvelteKit apps, two patterns of boilerplate emerged:

1. **CRUD edit dialogs** require manual data population and state reset when switching between create/edit modes
2. **Every SvelteKit form** requires wiring `getData`, `setErrors`, and `form.validator` into `createEnhanceHandler`

## Decision

### 1. `form.populate(data)` — Form data seeding with baseline reset

Add a `populate` method to `Form<T>`. It sets `data` to new values and clears `errors`, `touched`, and `dirty`. Unlike `reset()` which restores the initial values passed to `createForm`, `populate()` **updates the dirty tracking baseline** so `isDirty` starts as `false`.

```typescript
// Edit dialog: load existing data with clean state
function openEdit(user: User) {
  form.populate({ name: user.name, email: user.email, role: user.role });
  // isDirty === false — user hasn't changed anything yet
  // reset() would restore to these values, not the createForm initial
}

// Create dialog: start fresh
function openCreate() {
  form.populate({ name: "", email: "", role: "" });
}
```

Use cases where `populate()` is essential (not replaceable by re-creating the form):

- **Step forms**: a single form instance shared across steps; `populate()` restores step data when navigating back (supports `Partial<T>`)
- **Inline table editing**: switching between rows reuses the same form; `populate()` clears previous row's errors/touched without DOM re-mount

### 2. `buildEnhanceHandler(form, options)` — Sugar syntax for `createEnhanceHandler`

A shorthand in `@svelte-ssv/core/enhance` that eliminates the `getData` / `setErrors` / `validator` wiring boilerplate.

```typescript
// Before: createEnhanceHandler (7 lines)
const handleEnhance = createEnhanceHandler(form.validator, {
  getData: () => form.data,
  setErrors: (e) => {
    const keys = Object.keys(form.data);
    for (const key of keys) form.touched[key] = true;
    form.errors = e;
  },
  onSuccess: () => closeDialog(),
});

// After: buildEnhanceHandler (3 lines)
const handleEnhance = buildEnhanceHandler(form, {
  onSuccess: () => closeDialog(),
});
```

### Relationship between the two APIs

| | `createEnhanceHandler` | `buildEnhanceHandler` |
|---|---|---|
| `getData` | Manual | Automatic (`form.data`) |
| `setErrors` | Manual (full control) | Automatic (marks touched + sets errors) |
| `form.validator` | Must pass explicitly | Read from form |
| Custom error handling (toast, summary) | Supported | Not supported — use `createEnhanceHandler` |
| Use with `createForm` | Optional | Required |

`buildEnhanceHandler` is intentionally limited. When `setErrors` needs custom logic (showing toasts, building summary boxes), use `createEnhanceHandler` directly.

### Rejected: `createEnhanceForm`

We initially attempted a `createEnhanceForm` that returned a `Form<T>` with a built-in `enhance` property. This failed because of Svelte 5's `$state` Proxy interaction:

- `createEnhanceForm` runs **inside** `$state()`, before the Proxy is created
- The `enhance` handler captures a closure reference to the raw object
- `bind:value` writes go through the `$state` Proxy to the target
- But `getData()` reads from the raw object (closure), which is a **different reference** from the Proxy target

```
$state(createEnhanceForm(...))
       ^^^^^^^^^^^^^^^^^^^^^ runs BEFORE Proxy exists
                               → getData captures raw object
                               → bind:value writes to Proxy target
                               → getData reads from raw object → stale data
```

`buildEnhanceHandler` solves this by being called **after** `$state()`:

```typescript
let form = $state(createForm(schema, initial));  // Proxy created
const handler = buildEnhanceHandler(form, ...);  // form IS the Proxy
// getData: () => form.data → reads through Proxy → latest values ✅
```

This is a fundamental constraint of Svelte 5's `$state` compiler magic, not a limitation of ssv.

## Results

| Metric | Before | After |
|--------|--------|-------|
| SvelteKit form setup (with `createForm`) | ~7 lines | ~3 lines |
| Edit dialog setup | ~3 lines (manual copy + reset) | 1 line (`form.populate()`) |
| New API surface | 0 | `form.populate()`, `buildEnhanceHandler()` |
| Rejected API | N/A | `createEnhanceForm` (incompatible with `$state` Proxy) |
| Breaking changes | N/A | None |
