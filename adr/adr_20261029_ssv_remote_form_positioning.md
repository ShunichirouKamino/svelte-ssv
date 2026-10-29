# ADR: Positioning vs. SvelteKit remote functions `form()`

- **Date**: 2026-10-29
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.1 Architecture](adr_20260325_ssv_architecture.md)
- **Issue**: [#10](https://github.com/ShunichirouKamino/svelte-ssv/issues/10)

## Context

SvelteKit's remote functions `form()` has grown most of the client-side form features ssv provides. The closest equivalents as of SvelteKit 3.1 (checked against the `@sveltejs/kit@3.1.0` type definitions and runtime source) are below. They are not drop-in replacements:

| Concern | ssv | SvelteKit remote `form()` |
|---------|-----|---------------------------|
| Schema | Standard Schema V1 / Zod `safeParse` | Standard Schema V1 |
| Client validation before submit | `createEnhanceHandler` / `buildEnhanceHandler` | `.preflight(schema)` |
| Field errors | `form.errors.x` | `fields.x.issues()` |
| Touched | `form.touched.x` (set by `blur()`) | `fields.x.touched()` (set on `focusout`) |
| Dirty | `form.dirty.x`: differs from the baseline, back to `false` when reverted | `fields.x.dirty()`: edited since mount, stays `true` |
| Validate everything | `form.validate()`: sync, returns the result | `myForm.validate({ all: true })`: async, returns `void`, calls the server when there is no `.preflight()` schema |
| Seed data (edit dialogs) | `form.populate(data)`: new baseline, clears touched/dirty/errors | `fields.x.as(type, value)` sets the element default used on reset. `fields.set(data)` replaces the input but does not reset touched/dirty |
| Input wiring + `aria-invalid` | `{@attach form.field('x')}` (client only) | `{...fields.x.as('text')}` (server-rendered) |
| Server validation | `createFormValidator` in actions | Built into `form(schema, handler)`; `form('unchecked', handler)` skips it |

Notes:

- `touched()` / `dirty()` exist in the 3.1.0 types but are not yet described in the docs.
- The docs say `validate({ includeUntouched: true })`, but 3.1.0 only accepts `all`; `includeUntouched` is silently ignored. Re-check on each Kit release.

Remote functions are still **experimental**: they require both `experimental.remoteFunctions: true` (SvelteKit plugin) and `compilerOptions.experimental.async: true` (Svelte), and are "not subject to semantic versioning". They exist only inside SvelteKit, and `form()` submits to a server endpoint, so it needs a server runtime.

## Decision

1. **Recommend remote `form()` to users who can adopt it.** ssv does not try to compete with or wrap it.
2. **Position ssv for the cases remote `form()` does not cover:**
   - SvelteKit apps on stable form actions + `use:enhance`
   - Plain Svelte SPAs (no SvelteKit, e.g. Vite + Svelte, Tauri, embedded widgets)
   - Framework-agnostic validation shared between server and client (`createFormValidator` is pure TypeScript)
   - Teams that cannot enable experimental flags in production
   - SvelteKit SPA / static builds without a server
3. **Document the decision guide in the README.**
4. **Revisit when remote functions become stable.** Options at that point:
   - Keep ssv focused on SPA / non-Kit usage and form actions
   - Shrink the `enhance` entry point if form actions usage declines
   - Provide helpers that complement remote `form()` only if a real gap appears

Until then, ssv's API stays stable and no migration is forced on existing users.

## Consequences

- New users get a clear answer to "should I use ssv or remote forms?"
- ssv's API shape (`touched`, `dirty`, `issues`-like errors) remains conceptually close to remote `form()`, which keeps a later migration simple for users who move
- The comparison table must be re-checked on each SvelteKit minor release while remote functions are experimental
