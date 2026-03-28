# ADR: @svelte-ssv/core v0.3.1 — Standard Schema V1 Support

- **Date**: 2026-03-28
- **Status**: Accepted
- **Decider**: ShunichirouKamino
- **Prerequisite**: [ADR: ssv v0.2 Enhancement](adr_20260325_ssv_v02_enhancement.md)
- **Issue**: [#3](https://github.com/ShunichirouKamino/svelte-ssv/issues/3)

## Context

ssv currently defines a custom `ZodSchema` type that depends on Zod's `safeParse` API shape. While the core logic (converting validation errors to field-indexed errors) is not inherently Zod-specific, the type interface limits ssv to Zod-only usage.

[Standard Schema V1](https://github.com/standard-schema/standard-schema) is a shared validation interface initiated by Colin McDonnell (Zod's creator), adopted by Zod v4, Valibot v1+, ArkType, and TypeBox. Supporting it allows ssv to become validation-library agnostic.

## Decision

### Dual-interface approach

Support **both** the existing `safeParse` interface (Zod v3/v4) and the Standard Schema V1 `~standard` interface. The validator detects which interface the schema implements at runtime.

```typescript
// Accepts any schema that implements either interface
export type SchemaInput<T> = StandardSchema<T> | ZodSchema<T>;
```

**Detection logic:**
1. If the schema has a `"~standard"` property → use Standard Schema V1 `validate()`
2. Otherwise, if it has `safeParse` → use Zod's `safeParse()` (backward compatible)

This ensures:
- **Zod v3** users (no Standard Schema support) continue to work without changes
- **Zod v4** users can use either interface (Zod v4 implements both)
- **Valibot, ArkType, TypeBox** users can use ssv via Standard Schema

### Standard Schema V1 interface

```typescript
interface StandardSchema<T> {
  "~standard": {
    version: 1;
    vendor: string;
    validate: (value: unknown) =>
      | { value: T }
      | { issues: { message: string; path?: ReadonlyArray<PropertyKey | StandardPathSegment> }[] };
  };
}
```

### Error mapping

Standard Schema issues have `path` as an optional array of `PropertyKey | { key: PropertyKey }`. The mapping to `FormErrors<T>` follows the same logic as Zod: extract the first path segment as the field key.

| Source | Path format | ssv mapping |
|--------|-------------|-------------|
| Zod `safeParse` | `issue.path[0]` (PropertyKey) | `field = path[0].toString()` |
| Standard Schema | `issue.path?.[0]` (PropertyKey or `{ key }`) | `field = (segment.key ?? segment).toString()` |

### What changes

| Component | Change |
|-----------|--------|
| `src/core/validator.ts` | Add `StandardSchema` type, update `createFormValidator` to accept both |
| `src/core/index.ts` | Export `StandardSchema` type |
| `src/form/form.ts` | Update `createForm` to accept `SchemaInput<T>` |
| Tests | Add tests with Standard Schema mock implementations |
| Sample apps | Add Valibot and ArkType examples |

### What does NOT change

- `FormErrors<T>`, `FormValidator<T>`, `ValidationResult<T>` — output types remain identical
- `createEnhanceHandler` — unaffected (it only depends on `FormValidator<T>`)
- Existing Zod users — no breaking changes

## Rejected alternatives

### Standard Schema only (drop safeParse)

Would break Zod v3 users. Since ssv's `peerDependencies` allows `zod ^3.25.0`, this is unacceptable.

### Separate adapter packages

e.g., `@svelte-ssv/valibot`, `@svelte-ssv/arktype`. This is exactly the problem Standard Schema was created to solve. Maintaining per-library adapters is unsustainable.

## Results

| Metric | Before (v0.3.0) | After (v0.3.1) |
|--------|-----------------|-----------------|
| Supported libraries | Zod only | Zod, Valibot, ArkType, TypeBox, any Standard Schema V1 |
| Breaking changes | N/A | None |
| API surface change | `ZodSchema<T>` | `SchemaInput<T>` (union of `StandardSchema<T> \| ZodSchema<T>`) |
