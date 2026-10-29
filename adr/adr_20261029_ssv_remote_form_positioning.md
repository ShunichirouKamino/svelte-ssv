# ADR: Positioning vs. SvelteKit remote functions `form()`

- **Date**: 2026-10-29
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.1 Architecture](adr_20260325_ssv_architecture.md)
- **Issue**: [#10](https://github.com/ShunichirouKamino/svelte-ssv/issues/10)

## Context

SvelteKit's remote functions `form()` has grown most of the client-side form features ssv provides. As of SvelteKit 3.1 (checked against `@sveltejs/kit@3.1.0` type definitions):

| Concern | ssv | SvelteKit remote `form()` |
|---------|-----|---------------------------|
| Schema | Standard Schema V1 / Zod `safeParse` | Standard Schema V1 |
| Client validation before submit | `createEnhanceHandler` / `buildEnhanceHandler` | `.preflight(schema)` |
| Field errors | `form.errors.x` | `fields.x.issues()` |
| Touched / dirty | `form.touched.x` / `form.dirty.x` | `fields.x.touched()` / `fields.x.dirty()` |
| Validate everything | `form.validate()` | `validate({ all: true })` |
| Seed data (edit dialogs) | `form.populate(data)` | `fields.set(data)` |
| Input wiring + `aria-invalid` | `{@attach form.field('x')}` | `{...fields.x.as('text')}` |
| Server validation | `createFormValidator` in actions | Built into `form(schema, handler)` |

However, remote functions are still **experimental** (`experimental.remoteFunctions: true`; "not subject to semantic versioning"), and they exist only inside SvelteKit.

## Decision

1. **Recommend remote `form()` to users who can adopt it.** ssv does not try to compete with or wrap it.
2. **Position ssv for the cases remote `form()` does not cover:**
   - SvelteKit apps on stable form actions + `use:enhance`
   - Plain Svelte SPAs (no SvelteKit, e.g. Vite + Svelte, Tauri, embedded widgets)
   - Framework-agnostic validation shared between server and client (`createFormValidator` is pure TypeScript)
   - Teams that cannot enable experimental flags in production
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
