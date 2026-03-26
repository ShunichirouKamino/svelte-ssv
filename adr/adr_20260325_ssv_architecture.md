# ADR: @svelte-ssv/core — Design Decisions for Svelte Simple Form Validation

- **Date**: 2026-03-25
- **Status**: Accepted
- **Decider**: ShunichirouKamino

## Context

As the form validation foundation for the manage app (SvelteKit admin console), we introduced Zod + Superforms on the server side (PR #608). The next step required a decision on whether to use Superforms' client-side features or take an alternative approach for client-side validation (modal error display).

## What We Tried with Superforms and the Issues Encountered

### Attempt 1: Superforms `enhance` directive

```svelte
<!-- Using Superforms' enhance as a use: directive -->
<form use:formEnhance>
```

**Result**: `FormElement.addEventListener is not a function` error. Superforms v2.30's `enhance` internally calls `addEventListener` on a DOM element, but Svelte 5's Proxy object is passed instead, causing failure. Mismatch between Svelte 5's internal representation and the DOM API Superforms expects.

### Attempt 2: Passing Superforms' enhance as a callback to SvelteKit's `use:enhance`

```svelte
<!-- Passing Superforms' function to SvelteKit's enhance -->
<form use:enhance={formEnhance as any}>
```

**Result**: Same `FormElement.addEventListener` error. Superforms' `enhance` is designed as a Svelte action (`use:` directive), not as a SvelteKit `SubmitFunction`, so even when passed as a callback, it attempts DOM operations internally and fails.

### Attempt 3: Superforms' `validators: zodClient()` + SvelteKit `use:enhance`

```svelte
<!-- Using only Superforms' state management, with SvelteKit's enhance -->
const { form, errors, constraints, enhance } = superForm(data.upsertForm, {
  validators: zodClient(tenantUpsertSchema),
});
```

**Result**: `zodClient` causes type compatibility errors between Zod v3 types and Superforms' `ZodObjectType`. Can be worked around with `as any`, but the enhance runtime error remains.

### Features We Actually Wanted from Superforms

Superforms is a feature-rich library providing the following:

| # | Feature | Needed? | Actual Usage |
|---|---------|:---:|---|
| 1 | Server-side validation (`superValidate`) | Yes | Replaceable with `zod.safeParse` |
| 2 | Client-side validation (`validators`) | **Critical** | Broken on Svelte 5 |
| 3 | `enhance` directive (Progressive Enhancement) | **Critical** | Broken on Svelte 5 |
| 4 | `$form` store (form state management) | Minor | Replaceable with Svelte 5's `$state` |
| 5 | `$errors` store (error state management) | Minor | Replaceable with Svelte 5's `$state` |
| 6 | `$constraints` store (HTML5 attribute generation) | Minor | Unused (using `novalidate`) |
| 7 | `message` helper (server messages) | Yes | Replaceable with SvelteKit's ActionData |
| 8 | Multi-form support | Minor | Handled by SvelteKit's named actions |
| 9 | Timeout / delayed validation | No | Not needed for the admin console |
| 10 | Nested objects / array fields | No | Not needed for the admin console |

**We only needed features #2 and #3**, and those were the ones broken on Svelte 5. The remaining features are adequately replaceable with Svelte 5's native `$state` + SvelteKit's `use:enhance` + `zod.safeParse`.

## Why React Needs react-hook-form but Svelte Doesn't

### React's Form Management Challenges

The root cause of why React needs form libraries lies in its **re-rendering model**:

1. **State update = full component re-render** — Managing form values with `useState` causes the entire component tree to re-render on every keystroke
2. **ref-based optimization required** — react-hook-form manages the DOM directly via `useRef`, minimizing re-renders (`register` returns a ref)
3. **FormProvider / useFormContext** — Context API is needed to share form state across deep component trees
4. **Validation timing control** — Controlling `onBlur` / `onChange` / `onSubmit` timing is complex, making it more stable to delegate to a library

```tsx
// React: Without react-hook-form, every keystroke re-renders the entire component
function Form() {
  const [name, setName] = useState('');  // ← Every update re-renders the entire Form
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  // ... validation, error display, submission handling all manual
}
```

### Why Svelte Doesn't Need a Form Library

Svelte has a fundamentally different architecture from React:

1. **Compiler-based reactivity** — `$state` updates only the specific DOM nodes that reference that variable. No full component re-renders occur
2. **`bind:value` provides two-way binding** — No need for React's `value + onChange` pattern. `bind:value={formData.name}` automatically syncs
3. **`use:enhance` provides Progressive Enhancement** — Built into SvelteKit, forms work even without JS. React has no equivalent
4. **No Context API needed** — Svelte component scoping naturally manages form state, eliminating the need for Provider patterns

```svelte
<!-- Svelte: Simple even without a library. bind:value for two-way binding -->
<script>
  let formData = $state({ name: '', email: '' });
  let errors = $state({});
</script>
<input bind:value={formData.name} />
<!-- ↑ Updating name only affects this input and the error display. Other fields are not re-rendered -->
```

### Comparison Summary

| Challenge | React | Svelte |
|-----------|-------|--------|
| Re-render control | `useState` → full re-render → react-hook-form's ref management needed | `$state` → fine-grained updates → no library needed |
| Two-way binding | None (`value` + `onChange` manual or `register`) | `bind:value` built-in |
| Progressive Enhancement | None (`onSubmit` + `preventDefault` assumed) | `use:enhance` built-in |
| Form state sharing | `FormProvider` + `useFormContext` needed | Component scoping handles naturally |
| Validation | `resolver` + `zodResolver` integration | Just call `schema.safeParse()` directly |

**Conclusion: In Svelte, most problems that "form management libraries" solve are already solved at the language level. The only missing piece is a utility to convert Zod errors into field-indexed errors.**

## Decision

### Adopted: `@svelte-ssv/core` (custom lightweight package)

```
ssv/
├── package.json          ← peerDependency: zod ^3.25.0
└── src/
    ├── index.ts
    ├── validator.ts       ← createFormValidator (~50 lines)
    └── validator.test.ts  ← 6 tests
```

**Single API:**

```typescript
import { createFormValidator } from '@svelte-ssv/core';

const validator = createFormValidator(tenantUpsertSchema);
const result = validator.validate(formData);
// result.valid === false → result.errors = { tenantId: ["Invalid format"] }
```

### Rejected: Superforms client-side features

**Reasons:**
1. `FormElement.addEventListener is not a function` occurs with Svelte 5's `enhance`, breaking core functionality
2. Type compatibility issues with Zod v3 cause frequent `ZodObjectType` casts, compromising type safety
3. The features we needed (client validation + enhance) don't work, while the remaining features are replaceable with Svelte 5 native APIs
4. Server-side `superValidate` is also fully replaceable with `zod.safeParse` + `request.formData()`

### Server-side Superforms

Server-side `superValidate` in `+page.server.ts` has already been replaced with `zod.safeParse` + `request.formData()` for the tenant screens. Other screens (users, tenant-config) will be migrated incrementally. The goal is to completely remove the `sveltekit-superforms` dependency.

## Design Philosophy

### Thin Wrapper, Thick Platform

ssv has a single responsibility: "convert Zod's `safeParse` result into field-indexed errors."

- **Form state management** → Svelte 5's `$state`
- **Form submission** → SvelteKit's `use:enhance`
- **Server validation** → `zod.safeParse` + SvelteKit Form Actions
- **Error display** → `{#if errors.field}` in templates
- **Zod error → field error conversion** → **ssv's sole responsibility**

### Zod Version Independence

ssv does not import `z.ZodIssue` types; instead, it self-defines `ZodIssueMinimal` (only `{ path, message }`). This means:

- Works with both Zod v3 and v4
- `peerDependency` can be set loosely (`^3.25.0`)
- Future Zod major version upgrades maintain compatibility as long as the `safeParse` return structure doesn't change

## Svelte Form Validation OSS Ecosystem (as of March 2026)

### Major Library Status

| Library | Weekly DL | Svelte 5 Runes | Zod | Maintenance | Notes |
|---------|-----------|:-:|---|---|---|
| sveltekit-superforms | ~52k | Partial (stores compat) | Via adapter | Active | Largest. Runes API is Issue #577 open |
| Felte | ~13.5k | Not supported | Plugin | Stagnant | Issue #304 open, no Runes support planned |
| @tanstack/svelte-form | ~7k | **Supported** | Standard Schema | Active | Only Runes-compatible. TanStack ecosystem |
| svelte-zod-form | Very few | WIP | Core | Low activity | 12 stars, not production-ready |
| Formsnap | - | Depends on Superforms | Indirect | Stagnant | UI layer for shadcn-svelte |
| **Manual Zod + SvelteKit** | - | **Full** | Direct | - | **Community recommended** |

Only **@tanstack/svelte-form** and **manual Zod** fully support Svelte 5 (Runes). ssv is positioned as a thin wrapper over the latter approach.

### Why No "Just Right" Library Exists

React has react-hook-form (500K+ weekly DL) as an undisputed standard, but Svelte has no equivalent. The reason is a structural difference in demand.

React needs form libraries to solve many problems (re-render control, ref management, Context propagation, validation timing control). In Svelte 5, most of these problems are solved at the language level, so library demand is structurally small. Small demand means the ecosystem doesn't grow, and utilities like "Zod error field conversion" are too niche to sustain as npm packages.

## React Hooks Constraints vs. Svelte's Flexibility — Why Svelte Can Write Forms with Raw Syntax

### React Hooks Constraints Necessitate Form Libraries

React Hooks have the following constraints:

1. **Can only be called at the top level** — `useState` / `useEffect` cannot be called inside conditionals or loops
2. **Call order must be fixed** — Hook call order must not change between renders
3. **Hooks can only be called from custom Hooks** — Cannot call `useState` from regular functions

This creates a structure where "form state management must be consolidated into a single Hook":

```tsx
// React: All form state must be consolidated into a single Hook like useForm
function MyForm() {
  // ❌ useState per field causes full component re-renders
  // const [name, setName] = useState('');    ← 1 keystroke → full re-render
  // const [email, setEmail] = useState('');  ← same

  // ✅ Delegate state management to react-hook-form (uses ref internally to suppress re-renders)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  // register() returns a ref, bypassing React's state management to read/write DOM directly
  return <input {...register("name")} />;
}
```

The `ref` returned by react-hook-form's `register` **bypasses React's state management (useState → re-render)** to read/write DOM values directly. It compensates for weaknesses in React's reactivity model using Hook + ref.

Furthermore, when forms are split across multiple components:

```tsx
// React: FormProvider is needed to share form state with child components
function ParentForm() {
  const methods = useForm({ resolver: zodResolver(schema) });
  return (
    <FormProvider {...methods}>    {/* ← Wrap with Context Provider */}
      <NameField />                {/* ← Get state via useFormContext() */}
      <EmailField />
      <SubmitButton />
    </FormProvider>
  );
}

function NameField() {
  const { register, formState: { errors } } = useFormContext();  // ← Provider required
  return <input {...register("name")} />;
}
```

**Why React form libraries grow large:**

| Challenge | react-hook-form's Solution |
|-----------|---------------------------|
| `useState` → full re-render | Direct DOM management via `useRef`, `register` returns ref |
| State propagation to children | `FormProvider` + `useFormContext` (Context API) |
| Validation timing control | `mode: 'onBlur' / 'onChange' / 'onSubmit'` options |
| Zod integration | `zodResolver` adapter |
| Type-safe error state | `FieldErrors<T>` type, `formState.errors` |
| Focus control | `setFocus(fieldName)` |
| Array fields | `useFieldArray` Hook |
| Nested objects | `Controller` component |

All of these are **challenges arising from React's architectural constraints**, and react-hook-form solves them elegantly. As a result, its API necessarily grows large.

### Why Svelte 5 Makes Form Libraries Unnecessary

Svelte 5 (Runes) doesn't have React Hooks-like constraints:

1. **`$state` can be declared anywhere** — Not just top-level; inside functions, conditionals, etc.
2. **No call order constraints** — The compiler resolves reactivity, eliminating runtime Hook order management
3. **No concept of re-rendering** — `$state` updates only the DOM nodes that reference it with fine-grained precision

```svelte
<!-- Svelte 5: Forms are natural without a library -->
<script>
  // 1. State declaration — no useState needed, just $state
  let formData = $state({ name: '', email: '' });
  let errors = $state({});

  // 2. Validation — plain functions work (no need to be a Hook)
  function validate() {
    const result = schema.safeParse(formData);
    if (!result.success) errors = parseErrors(result.error);
    return result.success;
  }
</script>

<!-- 3. Two-way binding — no register() needed, just bind:value -->
<input bind:value={formData.name} />

<!-- 4. Error display — no formState.errors needed, just variable reference -->
{#if errors.name}
  <p>{errors.name[0]}</p>
{/if}

<!-- 5. Submission — no handleSubmit needed, just use:enhance -->
<form use:enhance={({ cancel }) => {
  if (!validate()) { cancel(); return; }
  return async ({ update, result }) => {
    await update();
    if (result.type === 'success') closeDialog();
  };
}}>
```

How Svelte 5 natively solves the challenges that react-hook-form addressed in React:

| React Challenge | react-hook-form Solution | Svelte 5 Native Solution |
|-----------------|--------------------------|--------------------------|
| Re-render control | Direct DOM management via `ref` | **Not needed** — `$state` provides fine-grained updates |
| Two-way binding | `register()` + `ref` | `bind:value` |
| State propagation to children | `FormProvider` + `useFormContext` | **Not needed** — component scoping handles naturally |
| Validation functions | `resolver` + `zodResolver` | Just call `schema.safeParse()` directly |
| Error types | `FieldErrors<T>` | `Record<string, string[]>` (simple types suffice) |
| Submit handling | `handleSubmit(onValid, onInvalid)` | `use:enhance` + `cancel()` |
| Progressive Enhancement | None | `use:enhance` built-in |

**In Svelte 5, 7/7 problems that React form libraries solve are handled at the language/framework level.** The only remaining need is a utility to "convert Zod's error object into field-indexed errors." This is ssv's raison d'etre, and why it can be accomplished in ~50 lines.

### Why Writing Forms with "Raw Syntax" in Svelte is Better

1. **Readability** — `bind:value={formData.name}` is more intuitive than `{...register("name")}`. Anyone who knows HTML can understand it
2. **Debuggability** — State is stored directly in `$state` variables, so `console.log(formData)` works immediately. No need to distinguish between react-hook-form's `getValues()` / `watch()`
3. **Type safety** — `formData.name` is type-checked through TypeScript's structural typing. String-key-based APIs like `register("name")` make typos harder to detect
4. **Learning cost** — Only Svelte + Zod knowledge required. No need to learn form library-specific APIs (`register`, `Controller`, `useFieldArray`, `FormProvider`)
5. **Bundle size** — No form library JS needed. Especially important for simple CRUD screens like admin consoles
6. **Framework upgrade resilience** — No risk of form libraries breaking on Svelte major version upgrades (Svelte 4 → 5 Runes migration, etc.). The Superforms Svelte 5 incompatibility is exactly this case

## Results

| Metric | Superforms | ssv |
|--------|-----------|-----|
| Package size | ~500KB (node_modules) | ~3KB (source only) |
| Svelte 5 compatibility | `enhance` broken | Fully compatible (no Svelte dependency) |
| Zod v3 type compatibility | `ZodObjectType` casts needed | No type casts needed |
| API count | `superForm` returns 15+ properties | `createFormValidator` returns 3 methods |
| Learning cost | Must learn Superforms store syntax (`$form`, `$errors`) | Knowing Zod's `safeParse` is sufficient |

## Future Roadmap

Roadmap for extracting ssv into a separate repository and publishing to npm:

1. **v0.1**: Current features (`createFormValidator` + `validate` + `parseErrors` + `serverError`)
2. **v0.2**: `onBlur` / `onChange` validation helpers (`createFieldValidator`)
3. **v0.3**: Svelte 5 `$state` wrapper (`createFormState` — unified management of `formData` and `errors`)
4. **v1.0**: SvelteKit `use:enhance` integration helper (`createEnhanceValidator` — auto-controlled cancel/update)
