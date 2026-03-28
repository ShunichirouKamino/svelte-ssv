# Best Practices — svelte-ssv

Lessons learned and design decisions from building `@svelte-ssv/core`.
Referenced by `/review` and `/resolve-issue` skills during implementation and code review.

---

## 1. `this` Binding in Plain Object Methods

**Rule**: Never destructure methods from objects returned by `createForm`.

`createForm` returns a plain object with methods that use `this` to access sibling properties (`data`, `errors`, `touched`, `dirty`). When called as `form.blur('name')`, JavaScript sets `this` to the object (or Svelte's `$state` Proxy). But destructuring breaks `this`:

```typescript
// ✅ Works — this === form (or its Proxy)
form.blur('name');

// ❌ Breaks — this === undefined
const { blur } = form;
blur('name');
```

**Why not bind?** Calling `.bind(obj)` would fix destructuring, but it pins `this` to the raw object, bypassing Svelte 5's `$state` Proxy. Mutations inside the method would no longer trigger reactivity. Documentation is the correct fix.

**Review check**: Flag any destructuring of `createForm` return values.

---

## 2. `$state` Proxy Compatibility

**Rule**: `createForm` must remain a plain TypeScript function (no `.svelte.ts`, no runes). Reactivity comes from the consumer wrapping the result in `$state`.

```svelte
<script>
  let form = $state(createForm(schema, initial));
</script>
```

Svelte 5's `$state` creates a deep reactive Proxy. Key behaviors:

- Property assignment (`form.errors = newErrors`) triggers the Proxy's set trap → reactivity fires
- Nested mutation (`form.data.name = 'foo'`) is tracked by deep reactivity
- Method calls (`form.blur('name')`) set `this` to the Proxy, so mutations inside methods go through the Proxy
- `structuredClone()` on a Proxy works correctly (delegates to the underlying object)
- Getters (`get isDirty()`) are evaluated through the Proxy, so they read reactive properties

**Why not use a class?** Classes work with `$state` Proxy too, but the existing codebase uses factory functions (`createFormValidator`, `createEnhanceHandler`). `createForm` follows the same pattern for consistency.

**Review check**: Ensure new methods added to the form object use `this` (not closure variables) for any mutable state that needs to be reactive.

---

## 3. Touched / Dirty State Design

### touched

- Set to `true` on `blur(field)` and on `validate()` (all fields)
- Never reverts to `false` except on `reset()`
- Primary use: gate error display so untouched fields don't show errors

### dirty

- Per-field: computed on `blur(field)` and `validate()` as `data[field] !== initialData[field]`
- `isDirty` getter: computed dynamically from current data vs initial data (no blur required)
- Reverts to `false` if the user changes value back to initial

**Key design decision**: `isDirty` is a live getter (`keys.some(k => this.data[k] !== initial[k])`) rather than a cached value. This ensures it's always accurate without requiring explicit update calls. The per-field `dirty` map is only updated on `blur()` and `validate()` for performance (avoids re-computing on every keystroke).

**Review check**: If new methods are added that modify `data`, ensure they also update `dirty` state or document that `dirty` will be stale until the next `blur`/`validate`.

---

## 4. createEnhanceHandler + createForm Integration

**Rule**: When using `createEnhanceHandler` with `createForm`, always call `form.validate()` inside the `setErrors` callback.

`createEnhanceHandler` uses `form.validator.validate()` internally (the raw validator, not `form.validate()`). This means `touched` and `dirty` are NOT updated on submit. The consumer must bridge this gap:

```typescript
const handleEnhance = createEnhanceHandler(form.validator, {
  getData: () => form.data,
  setErrors: (e) => {
    form.validate();    // ← marks all fields touched + updates dirty
    form.errors = e;    // ← override with enhance handler's errors
  },
  onSuccess: () => { form.reset(); },
});
```

Without the `form.validate()` call, errors are set but `touched` remains `false`, so conditional error display (`{#if form.touched.email && form.errors.email}`) won't show anything on first submit.

**Review check**: Any sample or consumer code using both `createForm` and `createEnhanceHandler` must include `form.validate()` in `setErrors`.

---

## 5. Zod Version Independence

**Rule**: Never import types directly from the `zod` package in library source code.

The library defines minimal structural types (`ZodSchema`, `ZodIssueMinimal`) that match Zod's `safeParse` signature. This enables compatibility with both Zod v3 and v4 without type-level coupling.

```typescript
// ✅ Library code — self-defined minimal type
type ZodSchema<T> = {
  safeParse: (data: unknown) =>
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
};

// ❌ Library code — direct Zod import (creates version coupling)
import type { ZodObject } from 'zod';
```

`ZodSchema` is exported from `@svelte-ssv/core` for advanced consumers who need to type their own wrappers.

**Breaking risk**: If a future Zod version changes the `safeParse` return shape (e.g., `success` → `ok`), the structural type will stop matching. Monitor Zod major releases.

**Review check**: Ensure no `import ... from 'zod'` appears in `src/core/`, `src/enhance/`, or `src/form/`. Zod imports are only allowed in test files and sample code.

---

## 6. Schema Sharing Between Client and Server

**Rule**: Define Zod schemas in a shared module (`$lib/schemas/`) and import from both client (`.svelte`) and server (`.server.ts`) files.

```
sample/src/lib/schemas/register.ts    ← schema + type defined once
sample/src/routes/register/+page.svelte       ← imports schema
sample/src/routes/register/+page.server.ts    ← imports schema
```

This prevents schema drift (client validates differently from server) and reduces duplication.

**Review check**: If a Zod schema appears in both a `.svelte` file and a `.server.ts` file, flag it for extraction to `$lib/schemas/`.

---

## 7. Headless Design — No UI Opinions

**Rule**: The library provides data only (`errors`, `touched`, `dirty`). It never renders UI elements.

Error display is 100% the consumer's responsibility. The same `createForm` API supports:

- **Inline text** — `{#if form.touched.email && form.errors.email}<p>{form.errors.email[0]}</p>{/if}`
- **Toast notifications** — call `addToast()` after `form.blur()` in a wrapper function
- **Error summary box** — iterate `form.errors` filtered by `form.touched`
- **Tooltip / popover** — bind error text to `title` attribute or a popover component

**Review check**: The library must never import Svelte components, emit DOM elements, or apply CSS classes. Any UI-related code belongs in sample or a separate `@svelte-ssv/ui` package.

---

## 8. Subpath Export Structure

**Rule**: Each concern lives in its own subdirectory with an independent entry point.

```
src/core/     → @svelte-ssv/core          (framework-agnostic validator)
src/enhance/  → @svelte-ssv/core/enhance  (SvelteKit use:enhance helper)
src/form/     → @svelte-ssv/core/form     (unified form state, Svelte 5 oriented)
```

Each subpath is independently tree-shakeable. A consumer using only `createFormValidator` won't pull in `createForm` or `createEnhanceHandler`.

**Review check**: New features should go into existing subpaths or a new subpath — never add Svelte-specific code to `src/core/`.

---

## 9. Immutable Error Updates

**Rule**: Error objects are replaced, not mutated in place.

`mergeFieldErrors` returns a new object via spread:

```typescript
const merged = { ...current };
// ... modify merged ...
return merged;
```

This is critical for Svelte 5 reactivity — `$state` tracks reference changes. Mutating properties of the existing error object may not trigger re-renders in all cases.

**Review check**: Any function that updates `errors` must return/assign a new object, not mutate the existing one.

---

## 10. Cross-Field Validation via Full Parse

**Rule**: `validateField` runs `safeParse` on the **entire form data**, not just the target field.

This ensures Zod's `.refine()` cross-field validations (e.g., password confirmation) are correctly evaluated. The result is then filtered to extract only the target field's errors.

```typescript
// Inside validateField:
const result = schema.safeParse(data);  // ← full form data, not just one field
// then filter result.error.issues by path[0] === field
```

**Review check**: Never "optimize" `validateField` to parse only the single field (e.g., via `schema.pick()`). This would break `.refine()` validations.

---

## 11. Standard Schema V1 — Implementation Pitfalls

**Rule**: Never trust the Standard Schema V1 spec alone. Always verify against real library output.

The spec defines a clean interface (`{ value }` on success, `{ issues }` on failure), but real libraries deviate:

### Response format differences

| Library | Success | Failure | Spec-compliant |
|---------|---------|---------|:-:|
| Zod v4 | `{ value }` | `{ issues }` | ✅ |
| Valibot v1 | `{ value }` | `{ value, issues }` (both) | ❌ |
| ArkType | `{ value }` | `[issue, issue, ...]` (raw array) | ❌ |

### Detection order matters

```typescript
// ❌ Wrong: "value" check first → Valibot failures treated as success
if ("value" in result) { return success; }

// ✅ Correct: check issues first, then value, then array fallback
if ("issues" in result && result.issues?.length > 0) { return failure; }
if ("value" in result) { return success; }
if (Array.isArray(result)) { return failure; }  // ArkType
```

### Pathless issues map to `_form`

Standard Schema issues may have `path: undefined` or `path: []` for form-level / cross-field errors. These must be collected into `_form`, not silently dropped.

### Async validation guard

Standard Schema `validate` may return a `Promise`. ssv is sync-only, so an `instanceof Promise` runtime check is required to fail fast with a clear error message instead of silently treating the Promise object as valid data.

### Path segments can be objects

Standard Schema path segments can be `PropertyKey` or `{ key: PropertyKey }`. The `resolvePathSegment` helper handles both formats. `symbol`-typed segments are ignored (form fields are always strings).

**Review check**: Any change to `createValidateFn` or `parseErrors` must be tested against Zod, Valibot, AND ArkType — not just mock Standard Schema implementations.

---

## 12. TypeScript — Type Predicate (`is` keyword)

**Rule**: Use type predicates to preserve narrowing when extracting type checks into functions.

TypeScript automatically narrows types inside `if ("prop" in obj)` blocks, but this narrowing is lost when the check is extracted to a function. The `is` keyword restores it:

```typescript
// ✅ Type predicate: narrowing preserved after function extraction
function isStandardSchema<T>(schema: SchemaInput<T>): schema is StandardSchema<T> {
  return "~standard" in schema;
}

if (isStandardSchema(schema)) {
  schema["~standard"].validate(data);  // TypeScript knows schema is StandardSchema<T>
} else {
  schema.safeParse(data);              // TypeScript knows schema is ZodSchema<T>
}
```

Use type predicates whenever a union type (`A | B`) needs runtime discrimination in a reusable function.

**Review check**: If a new helper function performs type discrimination on `SchemaInput`, `FormErrors`, or similar union types, ensure it uses `is` return type — not plain `boolean`.

---

## 13. Svelte 5 — `$state` Deep Reactivity and Proxies

**Rule**: Understand that `$state` creates a deep reactive Proxy, and library code interacts with the Proxy, not the raw object.

Key implications:

- `$state(createForm(...))` wraps the entire return value in a Proxy
- Property reads/writes inside methods go through the Proxy (because `this` is the Proxy)
- `structuredClone()` works on Proxies (Svelte handles this internally)
- `"prop" in obj` works on Proxies (the `has` trap delegates to the target)
- `instanceof` does NOT work reliably on Proxied objects — `form instanceof Form` will be `false` even if the underlying object is a Form. Use structural checks (`"~standard" in schema`) instead

Implications for Standard Schema detection:

```typescript
// ✅ Works through Proxy
"~standard" in schema   // Proxy's has trap → true

// ❌ Would not work if schema were a class instance behind a Proxy
schema instanceof StandardSchemaClass
```

This is why ssv uses `in` operator checks rather than `instanceof` for schema type detection.

**Review check**: Never use `instanceof` to detect schema types or form object types. Always use property-based structural checks.
