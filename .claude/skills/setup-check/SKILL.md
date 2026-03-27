---
name: setup-check
description: Diagnose skill configuration status, identify missing settings and files, and assist with setup. Triggered by /setup-check or requests like "setup check", "diagnose skills", "check configuration", "verify setup". Run this during initial onboarding or when skills fail due to missing configuration.
---

# Setup Check

Inspect configuration files, dependencies, and content consistency for all skills. Report any gaps and auto-generate settings based on user input and repository analysis.

## Usage

```
/setup-check [skill-name]
```

- `skill-name`: Diagnose a specific skill only (omit to diagnose all skills at once)

## Workflow

### Phase 1: Configuration File Existence Check

#### 1.1 Global Configuration

```bash
# Check for skills_config.json
cat .claude/skills/skills_config.json
```

If not found:

```
❌ .claude/skills/skills_config.json not found.
   → Please run initial setup to create this file.
```

#### 1.2 Per-Skill skill_config.json Check

Use Glob to discover `.claude/skills/*/SKILL.md`, then for each skill:

1. Read SKILL.md and extract required configuration keys from its settings table
2. Check whether `skill_config.json` exists
3. If it exists, read it and verify that all required keys are present

### Phase 2: Dependency and Resource Inspection

Verify that external files referenced in each skill's SKILL.md actually exist.

#### 2.1 Inspection Targets

| Skill | Target | Config Key |
|-------|--------|------------|
| review | Best practices files | `docs.bestPractices` |
| review | Perspective reference files | `references/perspective-*.md` |
| resolve-issue | Architecture guide | `docs.architecture` |
| resolve-issue | Test practices guide | `docs.testPractices` |
| resolve-issue | Domain knowledge guide | `docs.domainPractices` |

#### 2.2 Workflow File Inspection

Check whether workflow files referenced by any skill exist under `.github/workflows/`.

```bash
ls .github/workflows/
```

#### 2.3 Build Command Inspection

Verify that commands defined in the `build` section of `skills_config.json` are executable.

- `npm` / `npx` → check that `package.json` exists
- `yarn` → check that `yarn.lock` exists
- `pnpm` → check that `pnpm-lock.yaml` exists
- `make` → check that `Makefile` exists

### Phase 3: Content Consistency Check

Scan all skill files for stale or project-mismatched content. This catches issues that config-only checks miss.

#### 3.1 Default Value Consistency

Read each SKILL.md's configuration table and compare default values against the actual `skills_config.json`.

Flag mismatches:
- Default `branches.base` in SKILL.md doesn't match actual `skills_config.json` value
- Default `project.worktreePrefix` in SKILL.md doesn't match actual value
- Default `build.fastCommand` in SKILL.md references tools not used in this project

Report format:

```
⚠️ resolve-issue/SKILL.md: Default for branches.base is "develop" but skills_config.json has "main"
⚠️ review-respond/SKILL.md: Default for build.fastCommand references "gradlew" but project uses npm
```

#### 3.2 Stale Project Reference Scan

Use Grep to scan all files under `.claude/skills/` for patterns that indicate stale references from a different project.

```bash
# Scan for patterns that don't belong in this project
# Adjust patterns based on the detected project type (Phase 5.2)
```

Common patterns to check:

| Pattern | Indicates |
|---------|-----------|
| `gradlew`, `gradle`, `Gradle` | Java/Gradle project remnant |
| `pom.xml`, `Maven` | Java/Maven remnant |
| `src/main/java`, `src/test/java` | Java directory structure remnant |
| `JUnit`, `@Test`, `@Version` | Java test/annotation remnant |
| `m5-worktree`, `m5-` prefix | M5 project remnant |
| `dentsusoken` | Organization-specific remnant |

For each match, report the file path, line number, and matched content.

#### 3.3 Language Consistency Check

For projects that require English-only output (e.g., OSS projects), scan SKILL.md files and reference files for non-ASCII characters that may indicate untranslated content.

```bash
# Check for Japanese characters in SKILL.md files (katakana, hiragana, CJK)
```

Detection heuristic: If the repository's `README.md` or `CLAUDE.md` is in English, flag Japanese text in skill files.

Report format:

```
⚠️ review/references/perspective-reliability.md:23 — Contains Japanese text: "NULL 許容 / 非許容が..."
⚠️ create-pr/SKILL.md:80 — Contains Japanese text: "ログイン機能の追加"
```

#### 3.4 categories.json Consistency Check

Read `.claude/skills/categories.json` and verify:

1. All skills listed in categories actually exist as directories under `.claude/skills/`
2. No stale skill references (skills that don't exist in this project)
3. Category descriptions match the project language (English for OSS)

```bash
# List actual skill directories
ls -d .claude/skills/*/SKILL.md
```

Report format:

```
❌ categories.json references "m5-knowledge" but .claude/skills/m5-knowledge/ does not exist
❌ categories.json references "ci-test" but .claude/skills/ci-test/ does not exist
⚠️ categories.json has Japanese description: "バックエンドスキル"
```

### Phase 4: Diagnostic Report

Report all inspection results in a unified format.

```
## Skill Configuration Diagnostic Results

### Global Configuration (.claude/skills/skills_config.json)

| Config Key | Status | Current Value |
|------------|--------|---------------|
| branches.base | ✅ Configured | main |
| build.fastCommand | ✅ Configured | npm run build && npm test |
| docs.bestPractices | ⚠️ Empty array | [] |

### Per-Skill Diagnostics

#### ✅ create-issue (No issues)
No configuration required.

#### ⚠️ review
| Item | Status | Details |
|------|--------|---------|
| skill_config.json | ✅ Present | |
| excludePatterns | ✅ Configured | 4 patterns |
| references/ | ✅ All present | 7 files |

### Content Consistency

| Issue | File | Details |
|-------|------|---------|
| ⚠️ Stale default | resolve-issue/SKILL.md:21 | Default worktreePrefix is "m5-worktree" but config has "ssv-worktree" |
| ❌ Stale reference | categories.json:27 | References "m5-knowledge" which doesn't exist |
| ⚠️ Japanese text | review/references/perspective-reliability.md:23 | Contains non-English text |

### Summary

| Status | Count |
|--------|-------|
| ✅ No issues | 5 |
| ⚠️ Minor gaps | 2 |
| ❌ Action required | 1 |
```

### Phase 5: User Interview

Based on the diagnostic results, ask the user for information needed to resolve missing settings.

**Interview rules:**
- Ask no more than 3-5 questions at a time to avoid overwhelming the user
- Present choices where applicable
- For values that can be inferred from the repository, ask for confirmation (e.g., "Does this look correct?")

#### Interview Example

```
Some configuration is missing. Please help me fill in the following:

1. **Build tool**: I see a `package.json`, so this is a Node.js project, correct?
   - Build command: Is `npm run build` correct?
   - Test command: Is `npm test` correct?
   - Formatter: Which do you use — prettier / eslint / biome?

2. **Test framework**: Jest / Vitest / Mocha — which one?

3. **CI workflows**: I found the following in `.github/workflows/`:
   - `test.yml` — should I register this as the test workflow?
   - `lint.yml` — should this be included in the check targets as well?
```

### Phase 6: Repository Analysis and Auto-Generation

Auto-generate configuration based on the user's answers and the repository structure.

#### 6.1 Repository Structure Analysis

```bash
# Understand project structure
ls -la
cat package.json 2>/dev/null

# Identify test directories
ls __tests__/ test/ tests/ src/**/*.test.* src/**/*.spec.* 2>/dev/null

# Identify CI workflows
ls .github/workflows/ 2>/dev/null
```

#### 6.2 Language and Framework Auto-Detection

| Detection Target | How to Determine |
|------------------|------------------|
| Node.js/npm | `package.json` + `package-lock.json` |
| Node.js/yarn | `package.json` + `yarn.lock` |
| Node.js/pnpm | `package.json` + `pnpm-lock.yaml` |
| Python | `pyproject.toml` or `setup.py` or `requirements.txt` |
| Go | Presence of `go.mod` |
| Rust | Presence of `Cargo.toml` |
| Java/Gradle | Presence of `build.gradle` or `build.gradle.kts` |
| Java/Maven | Presence of `pom.xml` |

Test framework detection:

| Detection Target | How to Determine |
|------------------|------------------|
| Vitest | `vitest` in `devDependencies` of `package.json` |
| Jest | `jest` in `devDependencies` of `package.json` |
| pytest | `[tool.pytest]` in `pyproject.toml` or `pytest` in requirements |
| Go test | Presence of `go.mod` (standard library) |
| JUnit 5 | `junit-jupiter` dependency in `build.gradle` |

Formatter detection:

| Detection Target | How to Determine |
|------------------|------------------|
| Prettier | `prettier` in `package.json` or presence of `.prettierrc` |
| ESLint | `eslint` in `package.json` or presence of `.eslintrc*` |
| Biome | Presence of `biome.json` |
| Spotless | `spotless` plugin in `build.gradle` |
| Black | `[tool.black]` in `pyproject.toml` |
| Ruff | `[tool.ruff]` in `pyproject.toml` |

#### 6.3 Configuration File Generation

Generate or update configuration files based on detection results and user answers.

**Generation targets:**

1. **skills_config.json** (add only missing items)
   - `branches.base`: Detect default branch via `git remote show origin`
   - `build.*`: Set commands appropriate for the detected language/tool
   - `docs.*`: Set detected document paths

2. **Per-skill skill_config.json** (only if missing or incomplete)

#### 6.4 Confirmation of Generated Settings

Present the generated configuration to the user for approval.

```
The following settings have been generated. Please review:

### skills_config.json (update)
- branches.base: "main" (detected)
- build.test: "npm test"
- build.fastCommand: "npm run build && npm test"

Would you like to apply these settings?
```

After user confirmation, create or update files using the Write / Edit tools.

### Phase 7: Fix Content Consistency Issues

If Phase 3 found stale defaults, stale references, or language inconsistencies, fix them automatically after user confirmation.

#### 7.1 Fix Stale Defaults in SKILL.md

For each SKILL.md where the config table's default values don't match the actual `skills_config.json`:

1. Read the SKILL.md
2. Replace the stale default value with the actual configured value
3. Show the diff to the user for confirmation

#### 7.2 Fix Stale References

- Remove non-existent skill entries from `categories.json`
- Remove non-existent category sections
- Update file path references to match actual project structure

#### 7.3 Fix Language Inconsistencies

For each file with non-English content in an English-only project:

1. Identify the specific lines with non-English text
2. Translate or replace with appropriate English content
3. Show the proposed changes to the user for confirmation

### Phase 8: Final Comprehensive Re-Check

After all fixes have been applied, run a comprehensive re-check to verify the entire skills directory is clean.

#### 8.1 Re-run Phase 1-3

Re-execute all diagnostic checks (configuration, dependencies, content consistency) to confirm issues are resolved.

#### 8.2 Full Pattern Scan

Run a final grep-based sweep across all files under `.claude/skills/` for any remaining issues:

```bash
# Check for any remaining stale patterns (customize based on project)
# Example for a Node.js/TypeScript project:
grep -rn "gradlew\|gradle\|Gradle\|src/main/java\|src/test/java\|dentsusoken\|m5-" .claude/skills/ --include="*.md" --include="*.json"

# Check for non-English content (Japanese characters as example)
grep -rPn "[\x{3000}-\x{9FFF}\x{FF00}-\x{FFEF}]" .claude/skills/ --include="*.md" --include="*.json"
```

#### 8.3 Final Report

```
## Final Re-Check Results

### Configuration & Dependencies
| Status | Count |
|--------|-------|
| ✅ No issues | 7 |
| ⚠️ Minor gaps | 0 |
| ❌ Action required | 0 |

### Content Consistency
| Check | Result |
|-------|--------|
| Stale project references | ✅ None found |
| Language consistency | ✅ All English |
| categories.json | ✅ All entries valid |
| Default value alignment | ✅ All match skills_config.json |

All skills are correctly configured for this project. ✅
```

If any issues remain, list them with actionable next steps.

## Notes

- Never overwrite existing configuration files. Only add missing items.
- Never modify configuration files without user confirmation.
- Always confirm with the user when using values inferred from the repository structure.
- Phase 3 (Content Consistency) is critical when skills are ported from another project. Always run it during initial setup.
- Phase 8 (Final Re-Check) ensures no issues were introduced or missed during the fix process. Always run it as the last step.
