# CLAUDE.md

Project-level instructions for Claude Code.

## Project overview

`@svelte-ssv/core` — A lightweight, validation-library agnostic form validation utility for Svelte/SvelteKit. Supports Zod, Valibot, ArkType via Standard Schema V1.

## Repository structure

- `src/` — Core library source (TypeScript)
  - `core/` — `createFormValidator` and Standard Schema adapter
  - `form/` — `createForm` (unified reactive form state)
  - `enhance/` — `createEnhanceHandler` / `buildEnhanceHandler` (SvelteKit `use:enhance` integration)
- `sample-svelte/` — SPA demo app (Vite + Svelte, deployed to GitHub Pages)
- `sample-sveltekit/` — SvelteKit demo app (server-side, local dev only)
- `adr/` — Architecture Decision Records

## Build and test

```bash
npm run build        # tsup
npm test             # vitest run
npm run format       # biome format --write .
npm run format:check # biome format . (CI uses this)
```

## Formatting

- **Biome** is the project formatter (`biome.json` at root)
- Style: tabs, indent width 2, line width 120
- Scope: all `.ts` files in `src/`, `sample-svelte/src/`, `sample-sveltekit/src/`, and root `*.config.ts`
- Run `npm run format` before committing, or rely on CI to catch issues
- Linter is disabled — Biome is used for formatting only

## CI / CD

- **CI** (`.github/workflows/ci.yml`) — Runs on `main`, `feature/**`, PRs, and `workflow_dispatch`
  - `audit` job: `npm audit --omit=dev`
  - `biome` job: `npx biome format .`
- **Pages** (`.github/workflows/pages.yml`) — Deploys `sample-svelte` to GitHub Pages on `main` push
  - Pins `@svelte-ssv/core` to latest published npm version (not local `file:` ref)
- **Release** (`.github/workflows/release.yml`) — `workflow_dispatch` only
  - Requires approval via `production` environment protection rules
  - Handles version bump, tag, GitHub Release, and npm publish

## Release process

- `/tag` skill — read-only version resolution (does not publish)
- `/release` skill — triggers GitHub Actions release workflow (build, test, tag, publish)
- Never publish from local machine; always go through GitHub Actions
- **JSR**: published alongside npm in the release workflow (config in `jsr.json`). Version is synced automatically

## Conventions

- Commit messages: lowercase prefix (`feat:`, `fix:`, `docs:`, `release:`)
- Branch naming: `feature/issue<N>/<description>`
- ADR files: `adr/adr_<YYYYMMDD>_ssv_<topic>.md`
