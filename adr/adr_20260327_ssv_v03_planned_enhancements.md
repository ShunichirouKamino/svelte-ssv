# ADR: @svelte-ssv/core v0.3 — Planned Enhancements

- **Date**: 2026-03-27
- **Status**: Proposed
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.2 Enhancement](adr_20260325_ssv_v02_enhancement.md)

## Context

ssv v0.2 provides per-field validation (`validateField`), error merging (`mergeFieldErrors`), and SvelteKit `use:enhance` integration (`createEnhanceHandler`). However, consumers still face repetitive boilerplate when setting up forms:

1. **Repeated `$state` declarations** — Every form requires both `formData` and `errors` state, plus an `onblur` handler that calls `validateField` then `mergeFieldErrors`
2. **No touched/dirty tracking** — Errors appear for fields the user hasn't interacted with yet, leading to poor UX
3. **Validation timing is manual** — Consumers must wire up `onblur`/`oninput` handlers themselves with no built-in strategy

## Decision

### Phase 1: `createForm` — Unified Form State (Priority: High)

Introduce a `createForm` function that encapsulates `$state` for form data, errors, and field metadata into a single reactive object.

#### Proposed API

```typescript
import { createForm } from '@svelte-ssv/core';

const form = createForm(schema, { name: '', email: '' });
```

#### Returned object

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `form.data` | `T` (reactive) | Current form data bound to inputs |
| `form.errors` | `FormErrors<T>` (reactive) | Current validation errors |
| `form.blur(field)` | `(field: keyof T & string) => void` | Runs `validateField` + `mergeFieldErrors` internally |
| `form.validate()` | `() => ValidationResult<T>` | Validates the entire form |
| `form.reset()` | `() => void` | Resets data to initial values and clears errors |

#### Usage

```svelte
<input bind:value={form.data.name} onblur={() => form.blur('name')} />
{#if form.errors.name}<p class="error">{form.errors.name[0]}</p>{/if}
```

**Rationale**: This eliminates the 3-line setup (`$state` x2 + handler) that is duplicated in every form. The underlying `FormValidator` remains available for advanced use cases.

**Trade-off**: This introduces Svelte 5 (`$state`) as a hard dependency for `createForm`, whereas the current `createFormValidator` is framework-agnostic. To preserve this separation, `createForm` should be exposed via a separate subpath export (e.g., `@svelte-ssv/core/form`) or colocated with the enhance module.

### Phase 2: Touched / Dirty State Tracking (Priority: High)

Add field interaction state to `createForm`.

#### Proposed API

| Property | Type | Description |
|----------|------|-------------|
| `form.touched` | `Record<keyof T, boolean>` | Whether a field has been blurred at least once |
| `form.dirty` | `Record<keyof T, boolean>` | Whether a field's value differs from the initial value |
| `form.isDirty` | `boolean` | `true` if any field is dirty |

#### Behavior

- `form.blur(field)` sets `touched[field] = true`
- Error messages are only rendered for touched fields (consumer-side convention, not enforced)
- `form.reset()` clears both touched and dirty state

**Rationale**: Without touched tracking, calling `validate()` on mount or displaying errors before user interaction creates a poor UX. This is the most requested pattern in form libraries (Formik, React Hook Form, Felte, etc.).

### Phase 3: Validation Mode Configuration (Priority: Medium)

Allow consumers to configure when validation triggers.

#### Proposed API

```typescript
const form = createForm(schema, initial, {
  validateOn: 'blur',       // default
  // validateOn: 'input',   // validate on every keystroke
  // validateOn: 'submit',  // only on form submission
});
```

**Rationale**: Different forms have different UX requirements. A login form may prefer submit-only validation, while a registration form benefits from real-time feedback. Currently consumers must implement this logic themselves.

**Trade-off**: `'input'` mode may cause performance issues on large forms. Consider debouncing or limiting to the active field only.

### Phase 4: Async Validation (Priority: Medium)

Support server-side validation (e.g., uniqueness checks) alongside Zod schema validation.

#### Proposed API

```typescript
const form = createForm(schema, initial, {
  asyncValidators: {
    email: async (value) => {
      const exists = await checkEmailExists(value);
      return exists ? 'Email already registered' : undefined;
    },
  },
  debounce: 300,
});
```

| Property | Type | Description |
|----------|------|-------------|
| `form.validating` | `Record<keyof T, boolean>` | Whether an async validation is in progress per field |

**Rationale**: Email uniqueness, username availability, and similar checks require server round-trips. Without built-in support, consumers must manage debouncing, loading state, and error merging themselves.

**Trade-off**: Introduces complexity around cancellation (AbortController), race conditions, and error ordering. Should be opt-in and only triggered after synchronous Zod validation passes.

### Phase 5: Field Arrays (Priority: Low)

Support dynamic repeated fields (e.g., multiple addresses, line items).

#### Proposed API

```typescript
const schema = z.object({
  addresses: z.array(z.object({
    street: z.string().min(1),
    city: z.string().min(1),
  })).min(1),
});

form.array('addresses').append({ street: '', city: '' });
form.array('addresses').remove(0);
form.array('addresses').fields;  // reactive array of field states
```

**Rationale**: Dynamic forms are common in real applications (invoices, surveys, multi-step wizards). The current `parseErrors` implementation only reads `path[0]`, which cannot distinguish between `addresses[0].street` and `addresses[1].street`.

**Trade-off**: This is the highest-complexity feature. It requires changes to `parseErrors` for nested path handling and introduces array index management. Should be deferred until Phases 1–3 are stable.

## Implementation Order

```
Phase 1: createForm          ← reduces boilerplate significantly
Phase 2: touched / dirty     ← improves UX with minimal API surface
Phase 3: validateOn          ← small addition on top of Phase 1
Phase 4: async validation    ← independent feature, medium complexity
Phase 5: field arrays        ← highest complexity, deferred
```

Phases 1 and 2 should ship together as v0.3, as `createForm` without touched tracking would still result in suboptimal UX. Phases 3–5 are candidates for subsequent minor releases.

## Alternatives Considered

### Wrap an existing library (Felte, Superforms)

Rejected. The goal of ssv is to be a thin, Zod-first layer. Wrapping another form library would defeat the purpose and reintroduce the dependency weight that motivated ssv's creation.

### Ship a `<Field>` component in core

Deferred. A component that bundles `<input>` + error display would further reduce boilerplate, but it constrains styling and markup. This is better suited for an optional addon package (e.g., `@svelte-ssv/ui`) rather than core.
