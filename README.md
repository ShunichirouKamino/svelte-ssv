# @svelte-ssv/core

**SSV (Svelte Simple Validation)** — A lightweight Zod-based form validation library for Svelte/SvelteKit.

## Why ssv?

Svelte 5's `$state`, `bind:value`, and SvelteKit's `use:enhance` already cover 90% of form management that React developers need react-hook-form for. The one missing piece is converting Zod validation errors into field-indexed errors — and that's exactly what ssv does, in ~50 lines of code.

- **Framework-agnostic core** — `createFormValidator` is pure TypeScript with zero framework dependencies
- **SvelteKit integration** — Optional `createEnhanceHandler` reduces `use:enhance` boilerplate to a single attribute
- **Zod version independent** — Works with both Zod v3 and v4 (no Zod type imports)
- **Tiny** — ~1 KB source, no runtime dependencies beyond Zod

## Installation

```bash
npm install @svelte-ssv/core
```

> **Peer dependency**: `zod ^3.25.0`

## Quick Start

### Basic Validation

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

### SvelteKit Form with Real-time Validation

```svelte
<script>
  import { createFormValidator, createEnhanceHandler } from '@svelte-ssv/core';
  import type { FormErrors } from '@svelte-ssv/core';
  import { enhance } from '$app/forms';

  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
  });

  const validator = createFormValidator(schema);
  let formData = $state({ name: '', email: '' });
  let errors = $state<FormErrors<typeof formData>>({});

  // Real-time field validation on blur
  function handleBlur(field: keyof typeof formData) {
    const result = validator.validateField(field, formData);
    errors = validator.mergeFieldErrors(errors, field, result);
  }

  // SvelteKit use:enhance handler
  const handleEnhance = createEnhanceHandler(validator, {
    getData: () => formData,
    setErrors: (e) => { errors = e },
    onSuccess: () => closeDialog(),
  });
</script>

<form method="POST" action="?/create" novalidate use:enhance={handleEnhance}>
  <input
    bind:value={formData.name}
    onblur={() => handleBlur('name')}
  />
  {#if errors.name}
    <p class="error">{errors.name[0]}</p>
  {/if}

  <input
    bind:value={formData.email}
    onblur={() => handleBlur('email')}
  />
  {#if errors.email}
    <p class="error">{errors.email[0]}</p>
  {/if}

  <button type="submit">Submit</button>
</form>
```

## API Reference

### `createFormValidator(schema)`

Creates a form validator from a Zod schema. Returns a `FormValidator<T>` with the following methods:

| Method | Description |
|--------|-------------|
| `validate(data)` | Validate the entire form. Returns `{ valid, data, errors }` |
| `validateField(field, data)` | Validate a single field (for onblur/oninput). Returns `{ errors }` |
| `mergeFieldErrors(current, field, result)` | Merge field validation results into existing errors (immutable) |
| `parseErrors(zodError)` | Convert Zod error issues into field-indexed `FormErrors<T>` |
| `setServerError(message)` | Create a form-level error (`{ _form: [message] }`) |

### `createEnhanceHandler(validator, options)`

Generates a callback for SvelteKit's `use:enhance` directive. Handles the validation → cancel/submit → update → onSuccess flow internally.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `getData` | `() => T` | Returns the current form data |
| `setErrors` | `(errors: FormErrors<T>) => void` | Updates the error state |
| `onSuccess?` | `() => void` | Called on successful server response |
| `onBeforeSubmit?` | `() => boolean \| void` | Pre-submit hook. Return `false` to cancel |
| `onAfterSubmit?` | `() => void` | Called after submission regardless of outcome |

### `FormErrors<T>`

```typescript
type FormErrors<T> = {
  [K in keyof T]?: string[];
} & {
  _form?: string[];  // Form-level errors (not tied to a specific field)
};
```

## Design Philosophy

**Thin wrapper, thick platform.** ssv does one thing: convert Zod's `safeParse` result into field-indexed errors. Everything else is handled by the platform:

| Concern | Handled by |
|---------|------------|
| Form state management | Svelte 5's `$state` |
| Form submission | SvelteKit's `use:enhance` |
| Server validation | `zod.safeParse` + SvelteKit Form Actions |
| Error display | `{#if errors.field}` in templates |
| **Zod error → field error conversion** | **ssv** |

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

## License

MIT
