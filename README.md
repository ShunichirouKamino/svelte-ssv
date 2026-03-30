# @svelte-ssv/core

**SSV (Svelte Simple Validation)** — A lightweight, validation-library agnostic form validation utility for Svelte/SvelteKit.

## Why ssv?

Svelte 5's `$state`, `bind:value`, and SvelteKit's `use:enhance` already cover 90% of form management that React developers need react-hook-form for. The one missing piece is converting validation errors into field-indexed errors — and that's exactly what ssv does, as a lightweight utility.

### Zod direct vs ssv

With Zod alone, handling blur-time field validation requires manual issue filtering, immutable merging, and touched/dirty state management:

```typescript
// ❌ Zod direct: blur handler for a single field
function handleBlur(field) {
  touched[field] = true;
  dirty[field] = formData[field] !== initial[field];
  const result = schema.safeParse(formData);
  if (result.success) {
    errors = { ...errors };
    delete errors[field];
  } else {
    const fieldIssues = result.error.issues.filter(i => i.path[0] === field);
    errors = { ...errors };
    if (fieldIssues.length > 0) {
      errors[field] = fieldIssues.map(i => i.message);
    } else {
      delete errors[field];
    }
  }
}
```

With ssv's `createForm`, the same behavior is a single line:

```svelte
<script>
  import { createForm } from '@svelte-ssv/core/form';
  import { z } from 'zod';

  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  });

  let form = $state(createForm(schema, { name: '', email: '' }));
</script>

<!-- ✅ ssv: blur, touched, dirty, errors — all handled -->
<input bind:value={form.data.name} onblur={() => form.blur('name')} />
{#if form.touched.name && form.errors.name}
  <p class="error">{form.errors.name[0]}</p>
{/if}

{#if form.isDirty}
  <p>You have unsaved changes.</p>
{/if}
<button onclick={() => form.reset()} disabled={!form.isDirty}>Reset</button>
```

### What ssv covers

| Concern | Zod direct | ssv |
|---------|-----------|-----|
| Full form validation → field errors | Manual issue-to-field conversion | `validate()` |
| **Per-field validation on blur** | Full `safeParse` + manual filtering (`.refine()` breaks with `.pick()`) | `validateField()` |
| **Immutable error merging** | Spread + delete boilerplate each time | `mergeFieldErrors()` |
| Server error formatting | Build `{ _form: [msg] }` manually | `setServerError()` |
| **Touched / dirty tracking** | Multiple `$state` declarations + manual blur handler | Built into `createForm()` |
| **CRUD data population** | Manual state reset + dirty baseline management | `form.populate()` |
| **SvelteKit `use:enhance` integration** | cancel/update/result.type branching each form | `createEnhanceHandler()` / `buildEnhanceHandler()` |

### Features

- **Validation-library agnostic** — Works with Zod, Valibot, ArkType, TypeBox, or any [Standard Schema V1](https://github.com/standard-schema/standard-schema) library
- **Framework-agnostic core** — `createFormValidator` is pure TypeScript with zero framework dependencies
- **Unified form state** — `createForm` bundles data, errors, touched, dirty, and isDirty into one reactive object
- **CRUD-ready** — `form.populate(data)` seeds form data with a clean dirty baseline, ideal for edit dialogs and step forms
- **SvelteKit integration** — Optional `@svelte-ssv/core/enhance` reduces `use:enhance` boilerplate to a single attribute
- **Tiny** — ~3 KB source, no runtime dependencies

## Supported Validation Libraries

ssv accepts any schema implementing [Standard Schema V1](https://github.com/standard-schema/standard-schema) or Zod's `safeParse` interface:

| Library | Supported | Via |
|---------|:---------:|-----|
| Zod v4 | ✅ | Standard Schema V1 + safeParse |
| Zod v3 | ✅ | safeParse (backward compatible) |
| Valibot v1+ | ✅ | Standard Schema V1 |
| ArkType | ✅ | Standard Schema V1 |
| TypeBox | ✅ | Standard Schema V1 |

## Installation

```bash
npm install @svelte-ssv/core
```

## Quick Start

### With Zod

```typescript
import { createFormValidator } from '@svelte-ssv/core';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});

const validator = createFormValidator(schema);
const result = validator.validate({ name: '', email: 'bad' });
// → { valid: false, data: undefined, errors: { name: ['Name is required'], email: ['Invalid email format'] } }
```

### With Valibot

```typescript
import { createFormValidator } from '@svelte-ssv/core';
import * as v from 'valibot';

const schema = v.object({
  name: v.pipe(v.string(), v.nonEmpty('Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email format')),
});

const validator = createFormValidator(schema);
// Same API — validate(), validateField(), mergeFieldErrors(), etc.
```

### With ArkType

```typescript
import { createFormValidator } from '@svelte-ssv/core';
import { type } from 'arktype';

const schema = type({
  email: 'string.email',
  password: 'string >= 8',
});

const validator = createFormValidator(schema);
```

### Unified Form State with `createForm`

```svelte
<script>
  import { createForm } from '@svelte-ssv/core/form';
  import { z } from 'zod';

  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  });

  let form = $state(createForm(schema, { name: '', email: '' }));

  function handleSubmit(e) {
    e.preventDefault();
    const result = form.validate();  // marks all fields touched
    if (!result.valid) return;
    // submit result.data
  }
</script>

<form onsubmit={handleSubmit} novalidate>
  <input bind:value={form.data.name} onblur={() => form.blur('name')} />
  {#if form.touched.name && form.errors.name}
    <p class="error">{form.errors.name[0]}</p>
  {/if}

  <input bind:value={form.data.email} onblur={() => form.blur('email')} />
  {#if form.touched.email && form.errors.email}
    <p class="error">{form.errors.email[0]}</p>
  {/if}

  <button type="submit">Submit</button>
  <button type="button" onclick={() => form.reset()} disabled={!form.isDirty}>Reset</button>
</form>
```

### SvelteKit Form with `use:enhance`

Using `buildEnhanceHandler` with `createForm` (recommended):

```svelte
<script>
  import { createForm } from '@svelte-ssv/core/form';
  import { buildEnhanceHandler } from '@svelte-ssv/core/enhance';
  import { z } from 'zod';

  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  });

  let form = $state(createForm(schema, { name: '', email: '' }));

  const handleEnhance = buildEnhanceHandler(form, {
    onSuccess: () => closeDialog(),
  });
</script>

<form method="POST" action="?/create" novalidate use:enhance={handleEnhance}>
  <input bind:value={form.data.name} onblur={() => form.blur('name')} />
  {#if form.touched.name && form.errors.name}<p class="error">{form.errors.name[0]}</p>{/if}

  <input bind:value={form.data.email} onblur={() => form.blur('email')} />
  {#if form.touched.email && form.errors.email}<p class="error">{form.errors.email[0]}</p>{/if}

  <button type="submit">Submit</button>
</form>
```

<details>
<summary>Using <code>createEnhanceHandler</code> with manual wiring</summary>

```svelte
<script>
  import { createFormValidator, type FormErrors } from '@svelte-ssv/core';
  import { createEnhanceHandler } from '@svelte-ssv/core/enhance';
  import { z } from 'zod';

  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  });

  const validator = createFormValidator(schema);
  let formData = $state({ name: '', email: '' });
  let errors = $state<FormErrors<typeof formData>>({});

  function handleBlur(field: keyof typeof formData) {
    const result = validator.validateField(field, formData);
    errors = validator.mergeFieldErrors(errors, field, result);
  }

  const handleEnhance = createEnhanceHandler(validator, {
    getData: () => formData,
    setErrors: (e) => { errors = e },
    onSuccess: () => closeDialog(),
  });
</script>

<form method="POST" action="?/create" novalidate use:enhance={handleEnhance}>
  <input bind:value={formData.name} onblur={() => handleBlur('name')} />
  {#if errors.name}<p class="error">{errors.name[0]}</p>{/if}

  <input bind:value={formData.email} onblur={() => handleBlur('email')} />
  {#if errors.email}<p class="error">{errors.email[0]}</p>{/if}

  <button type="submit">Submit</button>
</form>
```

</details>

## API Reference

### `@svelte-ssv/core` — Core (framework-agnostic)

#### `createFormValidator(schema)`

Creates a form validator from any supported schema. Returns a `FormValidator<T>` with the following methods:

| Method | Description |
|--------|-------------|
| `validate(data)` | Validate the entire form. Returns `{ valid, data, errors }` |
| `validateField(field, data)` | Validate a single field (for onblur/oninput). Returns `{ errors }` |
| `mergeFieldErrors(current, field, result)` | Merge field validation results into existing errors (immutable) |
| `parseErrors(issues)` | Convert validation issues into field-indexed `FormErrors<T>` |
| `setServerError(message)` | Create a form-level error (`{ _form: [message] }`) |

### `@svelte-ssv/core/form` — Unified Form State

#### `createForm(schema, initial)`

Creates a unified form state with touched/dirty tracking. Wrap in `$state()` for Svelte 5 reactivity.

```typescript
import { createForm } from '@svelte-ssv/core/form';
let form = $state(createForm(schema, { name: '', email: '' }));

// form.data       — current form data (mutable, bind-friendly)
// form.errors     — current validation errors
// form.touched    — per-field touched state (set on blur)
// form.dirty      — per-field dirty state (differs from initial)
// form.isDirty    — true if any field is dirty
// form.validator  — the underlying FormValidator
// form.blur(field)    — mark touched + validate field
// form.validate()     — validate all + mark all touched
// form.reset()        — restore initial state
// form.populate(data) — set data + clear errors/touched/dirty + update baseline
```

### `@svelte-ssv/core/enhance` — SvelteKit Helper

#### `buildEnhanceHandler(form, options)`

Generates a callback for SvelteKit's `use:enhance` directive from a `Form` instance. Automatically wires `getData`, `setErrors`, and `validator`.

| Option | Type | Description |
|--------|------|-------------|
| `onSuccess?` | `() => void` | Called on successful server response |
| `onBeforeSubmit?` | `() => boolean \| void` | Pre-submit hook. Return `false` to cancel |
| `onAfterSubmit?` | `() => void` | Called after submission regardless of outcome |

#### `createEnhanceHandler(validator, options)`

Lower-level API for manual wiring. Use `buildEnhanceHandler` when working with `createForm`.

| Option | Type | Description |
|--------|------|-------------|
| `getData` | `() => T` | Returns the current form data |
| `setErrors` | `(errors: FormErrors<T>) => void` | Updates the error state |
| `onSuccess?` | `() => void` | Called on successful server response |
| `onBeforeSubmit?` | `() => boolean \| void` | Pre-submit hook. Return `false` to cancel |
| `onAfterSubmit?` | `() => void` | Called after submission regardless of outcome |

## Design Philosophy

**Thin wrapper, thick platform.** ssv does one thing: convert validation results into field-indexed errors. Everything else is handled by the platform:

| Concern | Handled by |
|---------|------------|
| Form state management | Svelte 5's `$state` |
| Form submission | SvelteKit's `use:enhance` or plain `fetch` |
| Server validation | Schema library + SvelteKit Form Actions |
| Error display | `{#if errors.field}` in templates |
| **Validation error → field error conversion** | **ssv** |

## Development

```bash
# Run tests
npx vitest

# Run tests in watch mode
npx vitest --watch
```

## Architecture Decision Records

- [v0.1 Architecture](adr/adr_20260325_ssv_architecture.md) — Why not Superforms, React vs. Svelte form management comparison
- [v0.2 Enhancement](adr/adr_20260325_ssv_v02_enhancement.md) — Real-time validation, enhance handler, TanStack Form comparison
- [v0.3.1 Standard Schema](adr/adr_20260328_ssv_v031_standard_schema.md) — Standard Schema V1 support, dual-interface design
- [v0.3.2 Enhance + Populate](adr/adr_20260330_ssv_v032_enhance_form_populate.md) — `form.populate()`, `buildEnhanceHandler()` sugar syntax

## License

MIT
