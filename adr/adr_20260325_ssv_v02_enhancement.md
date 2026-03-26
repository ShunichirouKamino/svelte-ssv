# ADR: @classification/ssv v0.2 — Real-time Validation + Boilerplate Reduction

- **Date**: 2026-03-25
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.1 Architecture](adr_20260325_ssv_architecture.md)

## Context

ssv v0.1 (PR #608) removed Superforms and introduced submit-time validation via `createFormValidator`.
However, the following issues remained:

1. **No real-time validation** — Users couldn't see errors until pressing the submit button
2. **Too much boilerplate** — Validation branching code (~10 lines) inside `use:enhance` was duplicated in every form
3. **No field error merge logic** — When using `onblur` for per-field validation, consumers had to implement their own logic to merge results with existing errors

## Decision

### Added APIs

#### 1. `validateField(field, data)` — Per-field validation

```typescript
const result = validator.validateField("email", formData);
// → { errors: { email: ["Invalid email format"] } } or { errors: {} }
```

**Design decision**: Runs `safeParse` on the entire form data and extracts only the errors for the specified field.
We considered an alternative approach of extracting a per-field schema using `pick`, but rejected it because cross-field validations via `refine` (e.g., password confirmation) would be lost.

#### 2. `mergeFieldErrors(current, field, result)` — Error merging

```typescript
errors = validator.mergeFieldErrors(errors, "email", result);
```

**Design decision**: Immutable composition. Since Svelte 5's `$state` triggers re-renders on reference changes, creating a new object via spread syntax is required.

#### 3. `createEnhanceHandler(validator, options)` — SvelteKit `use:enhance` helper

```svelte
<form use:enhance={enhanceHandler} novalidate>
```

**Design decision**: Accepted the SvelteKit dependency. Reasons:

- Since ssv's primary use case is SvelteKit Form Actions, providing a helper conforming to SvelteKit's `SubmitFunction` type has high value
- The core `createFormValidator` remains framework-agnostic (pure TypeScript)
- `enhance.ts` is a separate file, allowing SvelteKit-free environments to use only the core (`validator.ts`)
- For future npm publishing, it can be separated via subpath exports like `@classification/ssv/enhance`

### Rejected: `createFormState` with built-in $state

The original proposal in Issue #656 considered a `createFormState(schema, defaults)` design that holds `$state` internally.

**Rejection reasons:**
- Svelte 5's `$state` is compiler magic; using it from a library's `.ts` file requires the `.svelte.ts` extension
- For OSS npm publishing, adding a Svelte compiler dependency reduces package versatility
- The cost of writing `let formData = $state<T>({...})` (3 lines) at the consumer site doesn't justify increasing the library's Svelte dependency
- Reducing `use:enhance` boilerplate (~10 lines) via `createEnhanceHandler` provides better cost-effectiveness

### Comparison with TanStack Form

TanStack Form (`@tanstack/svelte-form`) was rejected for the following reasons (continued from v0.1 ADR):

| Aspect | TanStack Form | ssv v0.2 |
|--------|---------------|----------|
| `bind:value` | Not usable (`value` + `oninput` manual) | Native |
| `$state` | Not used (proprietary `@tanstack/store`) | Native |
| SvelteKit `use:enhance` | No integration | Integrated via `createEnhanceHandler` |
| Real-time validation | Built-in (onChange/onBlur) | `validateField` + `onblur` |
| Bundle size | ~1.7 MB install / ~15-30 KB gzip | ~1 KB (Zod already present) |

ssv v0.2's `validateField` + `mergeFieldErrors` + `onblur` achieves equivalent UX to TanStack Form's `onChange`/`onBlur` validation, using Svelte-native patterns.

## Results

### API Changes from v0.1 → v0.2

| API | v0.1 | v0.2 |
|-----|------|------|
| `createFormValidator` | `validate`, `parseErrors`, `serverError` | `validate`, `validateField`, `parseErrors`, `setServerError`, `mergeFieldErrors` |
| `createEnhanceHandler` | None | Generates callback for SvelteKit `use:enhance` |
| `FormErrors<T>` | `{ [K in keyof T]?: string[] }` | Same + `_form?: string[]` |

### Code Reduction in the manage App

| Metric | v0.1 | v0.2 |
|--------|------|------|
| `use:enhance` callback | ~10 lines/form | 0 lines (`use:enhance={handler}` single attribute) |
| Real-time validation | None | Instant feedback via `onblur` |
| Test count (ssv) | 6 | 27 |
