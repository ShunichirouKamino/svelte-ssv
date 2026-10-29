# ADR: form.field() — Svelte attachment for input wiring

- **Date**: 2026-10-29
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.3.2 Enhance + Populate](adr_20260330_ssv_v032_enhance_form_populate.md)
- **Issue**: [#12](https://github.com/ShunichirouKamino/svelte-ssv/issues/12)

## Context

Every input bound to a `createForm` instance repeats the same wiring:

```svelte
<input bind:value={form.data.name} onblur={() => form.blur('name')}
  class:invalid={form.touched.name && form.errors.name} />
```

The field name appears three to four times per input, and accessibility attributes (`aria-invalid`) are usually forgotten. Svelte 5.29 introduced attachments (`{@attach fn}`), which let a library attach behavior to an element through a plain function.

## Decision

Add `form.field(name)` that returns an attachment:

```svelte
<input {@attach form.field('name')} />
```

On each run, the attachment:

1. On the first run for an element only: if the element holds a user-entered value (differs from its markup default, e.g. typed before hydration), copies it into `form.data[name]`
2. Writes `form.data[name]` into the element
3. Sets / removes `aria-invalid="true"` based on `touched[name] && errors[name]`
4. Adds an `input` (text-like) or `change` (checkbox / radio / select) listener that writes back to `form.data[name]`, and a `blur` listener that calls `form.blur(name)`
5. For `<select>`, observes option changes and re-applies the value
6. Returns a cleanup that removes the listeners / observer

It does not set `name`. An earlier draft did, but auto-named radios in two form instances outside a `<form>` element joined one browser radio group and unchecked each other.

Radio and select values are strings in the DOM; when the field currently holds a number, the value is converted back to a number. Checkbox groups (array values) throw a `TypeError` instead of silently turning the array into a boolean.

### Reactivity model

`field()` captures `this`, which is the `$state` proxy when called as `form.field(...)`. Reads of `data[name]`, `touched[name]` and `errors[name]` inside the attachment are tracked by Svelte's effect, so the attachment re-runs after `reset()`, `populate()`, `blur()`, or typing. A re-run is cheap (two listeners), and writes are guarded so they do not disturb the user:

- Text: only assigns `el.value` when it differs, so the caret is not moved
- Number: compares numerically, so intermediate input such as `1.0` is not rewritten to `1`

Coercion follows Svelte's `bind:value` (`number` / `range`: `""` → `null`, otherwise `+value`) so switching between `bind:value` and `field()` does not change data types.

### No dependency on `svelte`

The return type is declared structurally (`FieldAttachment = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => () => void`). It is assignable to Svelte's `Attachment<HTMLInputElement>` etc., and using it on other elements (e.g. `<div>`) is a type error. The `/form` declarations therefore reference DOM types, as `/enhance` already does. The core keeps zero runtime dependencies and no `svelte` peer dependency.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Spread props (`{...form.props('name')}` returning `value` / `oninput` / `onblur`) | Cannot express checkbox `checked` vs. `value` without knowing the element type; requires the caller to pick the right variant |
| Svelte action (`use:field`) | Attachments are the recommended replacement for actions since Svelte 5.29; they compose better and re-run reactively without an `update` method |
| Shipping a `.svelte.ts` module using `$effect` | Requires `svelte` as a peer dependency and a Svelte-aware build for the library |

## Consequences

- Opt-in and additive: `bind:value` + `onblur` keeps working
- Requires Svelte 5.29+ only for consumers who use `field()`
- Attachments do not run during SSR: server HTML has no value. Inputs whose initial value must be server-rendered (edit forms without JS) should keep `bind:value`. Values typed before hydration are preserved
- `name` must be written in markup for native / `use:enhance` submission
- `aria-invalid` is applied at runtime, so component-scoped CSS must use `:global([aria-invalid='true'])` or Svelte prunes the selector
- `<select multiple>`, file inputs and custom components are out of scope
