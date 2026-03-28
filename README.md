# @svelte-ssv/core

**SSV (Svelte Simple Validation)** — A lightweight, validation-library agnostic form validation utility for Svelte/SvelteKit.

## Why ssv?

Svelte 5's `$state`, `bind:value`, and SvelteKit's `use:enhance` already cover 90% of form management that React developers need react-hook-form for. The one missing piece is converting validation errors into field-indexed errors — and that's exactly what ssv does, as a lightweight utility.

- **Validation-library agnostic** — Works with Zod, Valibot, ArkType, TypeBox, or any [Standard Schema V1](https://github.com/standard-schema/standard-schema) library
- **Framework-agnostic core** — `createFormValidator` is pure TypeScript with zero framework dependencies
- **SvelteKit integration** — Optional `@svelte-ssv/core/enhance` reduces `use:enhance` boilerplate to a single attribute
- **Unified form state** — Optional `@svelte-ssv/core/form` provides `createForm` with touched/dirty tracking
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
// → { valid: false, errors: { name: ['Name is required'], email: ['Invalid email format'] } }
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

### SvelteKit Form with Real-time Validation

```svelte
<script>
  import { createFormValidator, type FormErrors } from '@svelte-ssv/core';
  import { createEnhanceHandler } from '@svelte-ssv/core/enhance';

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

// form.data, form.errors, form.touched, form.dirty, form.isDirty
// form.blur(field), form.validate(), form.reset()
```

### `@svelte-ssv/core/enhance` — SvelteKit Helper

#### `createEnhanceHandler(validator, options)`

Generates a callback for SvelteKit's `use:enhance` directive.

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

## License

MIT
