# ADR: @svelte-ssv/core v0.3.2 — createEnhanceForm + form.populate()

- **Date**: 2026-03-30
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.3.1 Standard Schema](adr_20260328_ssv_v031_standard_schema.md)
- **Issue**: [#5](https://github.com/ShunichirouKamino/svelte-ssv/issues/5)

## Context

In real-world SvelteKit apps, every form requires ~11 lines of boilerplate: `createFormValidator` + `$state` × 2 + `createEnhanceHandler` + blur handler. Pages with multiple forms (e.g., Users page with Create + Reset Password) repeat this for each form.

Additionally, CRUD edit dialogs require manual data population with state reset.

## Decision

### 1. `form.populate(data)` — Edit dialog data seeding

Add a `populate` method to the `Form<T>` type. It sets `data` to new values and clears `errors`, `touched`, and `dirty` — like starting a fresh form with pre-filled values.

```typescript
// Before: manual field-by-field copy + reset
formData = { tenantId: tenant.tenantId, tenantName: tenant.tenantName };
errors = {};

// After: one call
form.populate({ tenantId: tenant.tenantId, tenantName: tenant.tenantName });
```

Difference from `reset()`: `reset()` restores the **initial** values (passed to `createForm`). `populate()` sets **new** values and treats them as the new baseline for dirty tracking.

### 2. `createEnhanceForm(schema, options)` — Unified setup

Combines `createForm` + `createEnhanceHandler` into a single call. Returns a `Form<T>` with an additional `enhance` property.

```typescript
import { createEnhanceForm } from '@svelte-ssv/core/enhance';

let form = $state(createEnhanceForm(schema, {
  initial: { email: '', password: '' },
  onSuccess: () => closeDialogs(),
}));
```

```svelte
<form method="POST" action="?/create" novalidate use:enhance={form.enhance}>
  <input bind:value={form.data.email} onblur={() => form.blur('email')} />
  {#if form.touched.email && form.errors.email}
    <p class="error">{form.errors.email[0]}</p>
  {/if}
</form>
```

### Boilerplate reduction analysis

**Before (per form):**

```typescript
// 11 lines
const validator = createFormValidator(schema);                    // 1
let formData = $state<FormType>({ email: '', password: '' });     // 2
let errors = $state<FormErrors<FormType>>({});                    // 3
const enhance = createEnhanceHandler(validator, {                 // 4
  getData: () => formData,                                        // 5
  setErrors: (e) => { errors = e },                               // 6
  onSuccess: () => closeDialogs(),                                // 7
});                                                               // 8
function handleBlur(field: keyof FormType) {                      // 9
  const result = validator.validateField(field, formData);        // 10
  errors = validator.mergeFieldErrors(errors, field, result);     // 11
}
```

**After (per form):**

```typescript
// 4 lines
let form = $state(createEnhanceForm(schema, {                    // 1
  initial: { email: '', password: '' },                           // 2
  onSuccess: () => closeDialogs(),                                // 3
}));                                                              // 4
// blur handler: form.blur('email') — no function definition needed
```

**Reduction**: ~64% per form. For a page with 2 forms: 22 lines → 8 lines.

### When NOT to use `createEnhanceForm`

- **Non-SvelteKit apps**: `createEnhanceForm` depends on the `use:enhance` pattern. Use `createForm` directly for plain Svelte.
- **Complex submission flows**: If `setErrors` needs custom logic beyond `form.validate(); form.errors = e` (e.g., merging server errors with specific field mappings), use `createForm` + `createEnhanceHandler` separately.
- **Multiple actions on one form**: If a form has multiple submit buttons targeting different actions with different validation needs, the unified helper may be too opinionated.
- **Forms without blur validation**: If you only need submit-time validation without field-level blur feedback, `createFormValidator` + `createEnhanceHandler` is simpler (no touched/dirty overhead).

### Implementation

- `form.populate()` → added to `Form<T>` in `src/form/form.ts`
- `createEnhanceForm()` → new export in `src/enhance/` (keeps `createEnhanceHandler` unchanged)
- `EnhanceForm<T>` → extends `Form<T>` with `enhance` property

## Results

| Metric | Before | After |
|--------|--------|-------|
| Lines per SvelteKit form | ~11 | ~4 |
| Edit dialog setup | ~3 lines (manual copy + reset) | 1 line (`form.populate()`) |
| New API surface | 0 | `form.populate()`, `createEnhanceForm()`, `EnhanceForm<T>` |
| Breaking changes | N/A | None |
