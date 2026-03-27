---
name: review
description: A skill that performs multi-perspective code review on PRs. Triggered by /review or natural language requests like "review", "code review", "security review", "architecture review", "performance review". Reviews from architecture, security, performance, reliability, and maintainability perspectives, then posts comments to the PR via gh CLI. Supports Codex integration for cross-validation. PR number can be specified as an argument.
---

# Review (Multi-Perspective Review + Codex Integration)

**All review comments MUST be written in English.**

Review PR diffs or the entire project from multiple perspectives (architecture / security / performance / reliability /
maintainability), and output results as PR comments or files.
Optionally launch Codex in parallel for cross-validation.

## Loading Configuration

Before execution, load the skill-specific config `skill_config.json` and the global config `.claude/skills/skills_config.json`, and use the following values.

> **Configuration file usage**: Skill-specific settings are stored in `.claude/skills/review/skill_config.json`, while project-wide settings are stored in `.claude/skills/skills_config.json`.

| Config Key                   | Config File            | Purpose                                                              | Required |
|------------------------------|------------------------|----------------------------------------------------------------------|----------|
| `docs.bestPractices`         | `skills_config.json`   | Array of best practices file paths to use as review references        | No       |
| `excludePatterns`            | `skill_config.json`    | Array of glob patterns for files to exclude from review               | No       |
| `additionalChecks`           | `skill_config.json`    | Array of additional check items by file pattern                       | No       |
| `perspectives`               | `skill_config.json`    | List of enabled perspectives (default: all 5 perspectives)            | No       |
| `codex.enabled`              | `skill_config.json`    | Codex integration (`"auto"` / `true` / `false`)                       | No       |
| `codex.promptTemplate`       | `skill_config.json`    | Path to Codex prompt template                                         | No       |
| `projectScope.outputDir`     | `skill_config.json`    | Output directory for project scope reviews                            | No       |
| `projectDescription`         | `skill_config.json`    | Project description passed to Codex template (default: `"Software project"`) | No |

### excludePatterns Example

```json
[
  "**/build/**",
  "**/generated/**",
  "**/dist/**",
  "*.min.js"
]
```

### additionalChecks Structure

```json
[
  {
    "pattern": "*.sql",
    "check": "Verify SQL syntax correctness and check for SQL injection risks"
  },
  {
    "pattern": "V*__.sql",
    "check": "Verify migration file naming conventions and ensure existing files are not modified"
  }
]
```

## Usage

```
/review [pr-number] [--perspective <list>] [--scope pr|project] [--codex] [--refactor]
```

- `pr-number`: Target PR number (defaults to the PR for the current branch if omitted)
- `--perspective <list>`: Filter review perspectives (comma-separated). Defaults to all `perspectives` in `skill_config.json`
    - Valid values: `architecture`, `security`, `performance`, `reliability`, `maintainability`, `documentation`
- `--scope pr|project`: Review scope (default: `pr`)
    - `pr`: Review PR diff only -> Post results as a PR Review
    - `project`: Scan entire project -> Save results to `projectScope.outputDir`
- `--codex`: Force Codex cross-validation execution
- `--refactor`: Run additional backward compatibility checks for refactoring PRs

### Backward Compatibility

Running `/review <pr-number>` without additional arguments behaves the same as before (all perspectives, PR scope, Codex auto-detection).
Invocations from `/resolve-issue` Phase 4 continue to work as expected.

### Natural Language Triggers

"Do a security review" -> Interpreted as `--perspective security`.
"Do a code review" -> Interpreted as all perspectives.
"Do a refactoring review" -> Interpreted as `--refactor`.
"Do a documentation review" -> Interpreted as `--perspective documentation`.

### Review Modes

| Mode       | Usage                                        | Context Scope                              |
|------------|----------------------------------------------|--------------------------------------------|
| **Quick**  | `/review 244` (run from another branch)      | PR diff only (fetched via `gh pr diff`)     |
| **Detailed** | Check out target branch, then run `/review` | PR diff + full local file access            |

When the diff alone lacks sufficient context (e.g., call sites of a function, full type definitions, consistency with existing patterns), check out the target branch before running the review.

## Execution Steps

### Phase 0: Argument Parsing and Default Resolution

1. Extract `pr-number`, `--perspective`, `--scope`, `--codex`, `--refactor` from arguments
2. If natural language is used, interpret the intent and map to corresponding options
    - "security review" -> `--perspective security`
    - "architecture review" -> `--perspective architecture`
    - "performance review" -> `--perspective performance`
    - "refactoring review" -> `--refactor`
3. Apply default values for unspecified options:
    - `perspectives`: All `perspectives` from `skill_config.json`
    - `scope`: `pr`
    - `codex`: `codex.enabled` from `skill_config.json` (default `"auto"`)
    - `refactor`: `false`

### Phase 1: Codex Launch (Conditional)

Determine Codex availability and launch it in the background if conditions are met.

#### 1.1 Codex Availability Check

```bash
which codex 2>/dev/null
```

| `codex.enabled`    | Codex Installed | Behavior                          |
|--------------------|-----------------|-----------------------------------|
| `"auto"`           | Yes             | Launch                            |
| `"auto"`           | No              | Skip (Claude-only)                |
| `true` / `--codex` | Yes             | Launch                            |
| `true` / `--codex` | No              | Report error (Codex not installed) |
| `false`            | -               | Skip                              |

#### 1.2 Codex Background Launch

Load the prompt template from `references/codex-prompt-template.md`, substitute variables, and execute.

**Important**: The diff is NOT passed directly to Codex. Codex retrieves the diff itself using `git diff` commands and reads source files as needed. This avoids ARG_MAX limits and allows Codex to autonomously explore context.

> **Sandbox constraint**: Codex runs in a `read-only` sandbox by default, so `gh` CLI (network access) is blocked.
> Templates should only instruct local commands such as `git diff` / `cat` / `git show`. Codex findings are collected
> by Claude and posted as a PR Review.

> **Command selection**: Use the `codex review -` subcommand. `codex --full-auto` requires a TTY, so it fails with
> `stdin is not a terminal` when launched from Claude Code's Bash tool (no TTY).
> `codex review -` reads the prompt from stdin and does not require a TTY.

**For PR scope:**

```bash
# 1. Get PR info (Claude uses gh — not passed to Codex)
HEAD_BRANCH=$(gh pr view <pr-number> --json headRefName -q '.headRefName')
BASE_BRANCH=$(gh pr view <pr-number> --json baseRefName -q '.baseRefName')

# 2. Fetch remote branches (so Codex can run git diff)
git fetch origin "$HEAD_BRANCH" "$BASE_BRANCH"

# 3. Substitute template variables and create prompt file via bash heredoc
#    File path: /tmp/codex-prompt-<pr-number>.txt
#    Variables: {PR_NUMBER}, {HEAD_BRANCH}, {BASE_BRANCH}, {PROJECT_DESCRIPTION}, {PERSPECTIVES}

# 4. Launch Codex (pass prompt via stdin)
cat /tmp/codex-prompt-<pr-number>.txt | codex review -

# 5. Delete temporary file
rm /tmp/codex-prompt-<pr-number>.txt
```

**For project scope:**

```bash
REVIEW_DIR="<projectScope.outputDir>"
mkdir -p "$REVIEW_DIR"
cat /tmp/codex-prompt.txt | codex review -
```

Launch using the Bash tool with `run_in_background: true` to run in parallel with Claude's review.

**If Codex fails**: Log the error and continue with Claude-only mode.

### Phase 2: Context Collection

#### PR Scope (`--scope pr`)

```bash
# Get PR information
gh pr view <pr-number> --json number,url,title,state,baseRefName,headRefName

# Diff summary
gh pr diff <pr-number> --name-only

# Full diff
gh pr diff <pr-number>
```

If the PR does not exist or is closed, report an error and terminate.

For large diffs, fetch files individually.
Exclude files matching `excludePatterns` from the review scope.

**Additional context for detailed mode** (when the current branch matches the target PR branch):

- Call sites and definitions of modified functions
- Type definitions and utility implementations referenced by imports
- Existing similar patterns (other files in the same directory)

#### Project Scope (`--scope project`)

Enumerate files to review:

Use the Glob tool or find with patterns that support multi-module structures:

```bash
# Multi-module structure: search across src directories in each module
# Group -type f to apply to all extensions
find . -type f \( -path '*/src/**/*.ts' -o -path '*/src/**/*.svelte' \) | head -200
```

Or use the Glob tool with patterns like `**/src/**/*.ts`.

Exclude files matching `excludePatterns`.
If there are many files, prioritize based on `perspectives`.

### Phase 3: Perspective-Based Review

Load `references/perspective-<name>.md` for each `perspective` and review against the checklist.

#### 3.1 Loading Perspective Checklists

For each specified perspective, load the corresponding checklist file using the Read tool:

- `references/perspective-architecture.md` -- Layer violations, dependency inversion, module boundaries
- `references/perspective-security.md` -- Injection, authentication bypass, secrets exposure
- `references/perspective-performance.md` -- N+1 queries, resource leaks, pagination
- `references/perspective-reliability.md` -- Exception handling, transaction boundaries, data integrity
- `references/perspective-maintainability.md` -- Naming, code duplication, complexity
- `references/perspective-documentation.md` -- Duplicate management, redundancy, policy documentation (only when `.md` files are in the diff)

#### 3.2 Conducting the Review

Apply the loaded checklists to each file in the diff (or target files).

**Common checks** (always applied in addition to checklists):

- Load files listed in `docs.bestPractices` and use them as review references
- Load applicable best practices files based on target file paths and structure
- Apply additional check items for files matching `additionalChecks`

**Automatic application of the documentation perspective:**

If the PR diff contains `.md` files, the `documentation` perspective is automatically added regardless of the `perspectives` setting. This ensures that PRs with documentation changes always undergo duplicate management and redundancy checks.

#### 3.2.1 Refactoring Backward Compatibility Check (`--refactor` only)

When `--refactor` is specified, perform the following backward compatibility checks in addition to standard perspective-based reviews.
The goal of a refactoring PR is to "improve internal structure without changing externally visible behavior," so the focus is on detecting unintended behavioral changes.

**Check Items:**

##### a. Public API / Interface Compatibility

- [ ] Have public method signatures changed (argument types, count, order, return types)?
- [ ] Have public classes or interfaces been added, removed, or renamed?
- [ ] Have REST API endpoint URLs, HTTP methods, or request/response structures changed?
- [ ] Have exception types or triggering conditions changed (affecting callers' catch blocks)?

##### b. Behavioral Equivalence

- [ ] Is branching logic equivalent (same output for same input before and after refactoring)?
- [ ] Has loop execution count or order changed (if order-dependent processing exists)?
- [ ] Has behavior for null / empty lists / boundary values changed?
- [ ] Have default values or initial values changed?
- [ ] Has the timing or count of side effects (DB updates, file writes, external API calls) changed?

##### c. Configuration and Dependency Compatibility

- [ ] Have configuration file key names or structures changed (changing config source changes behavior)?
- [ ] Have DI bindings changed (possibility of different implementations being injected)?
- [ ] Have SQL query results changed (columns, sort order, filter conditions)?

##### d. Impact on Callers

- [ ] Have all call sites of renamed classes/methods been updated (verify with grep / Glob)?
- [ ] Have all imports/requires been updated for moved files?
- [ ] Is deleted code truly unused (no references from other modules)?

**Reflecting in the Review Summary:**

When `--refactor` is used, add a `Backward Compat` row to the Review Result table:

```markdown
| Perspective     | Must Fix | Should Fix | Suggestion |
| --------------- | -------- | ---------- | ---------- |
| Backward Compat | <count>  | <count>    | <count>    |
| Architecture    | ...      | ...        | ...        |
```

Use the `[Backward Compat]` tag for individual comments' Perspective tag.

#### 3.3 Finding Classification

Assign the following metadata to each finding:

| Field         | Description                                                                   |
|---------------|-------------------------------------------------------------------------------|
| `perspective` | Perspective name (architecture / security / performance / reliability / maintainability) |
| `severity`    | Severity level (Must Fix / Should Fix / Suggestion)                            |
| `file`        | Target file path                                                               |
| `line`        | Target line number                                                             |
| `title`       | Finding title                                                                  |
| `issue`       | Description of the problem                                                     |
| `fix`         | Suggested fix                                                                  |

### Phase 4: Codex Result Collection and Merge

If Codex was launched in the background, collect and merge the results.

#### 4.1 Result Collection

Check whether the Codex background task has completed.
If complete, read the result file. If still running, wait for completion.

#### 4.2 Result Merge (Cross-Validation)

Match findings from Claude and Codex by file name + line number + keywords:

- **Both agents**: Findings detected by both -> High confidence
- **Claude only**: Findings detected only by Claude
- **Codex only**: Findings detected only by Codex

Reflect merge results in the summary's Cross-validation section.

### Phase 5: Output

#### PR Scope -> PR Review Posting

##### A. Summary (Review Body)

Posted as the body of the PR Review. A summary for quick overview of the overall picture.

```markdown
## PR Review: #<pr-number> <title>

### Summary

<1-2 line summary of the PR changes>

### Review Result

| Perspective     | Must Fix | Should Fix | Suggestion |
| --------------- | -------- | ---------- | ---------- |
| Architecture    | <count>  | <count>    | <count>    |
| Security        | <count>  | <count>    | <count>    |
| Performance     | <count>  | <count>    | <count>    |
| Reliability     | <count>  | <count>    | <count>    |
| Maintainability | <count>  | <count>    | <count>    |

### Codex Cross-validation (only when Codex is used)

| #   | Severity     | Perspective     | Finding        | Detected by |
| --- | ------------ | --------------- | -------------- | ----------- |
| 1   | 🔴 Must Fix   | Security        | <finding title> | 🤝 Both      |
| 2   | 🟡 Should Fix | Reliability     | <finding title> | 🧠 Claude    |
| 3   | 🟢 Suggestion | Maintainability | <finding title> | 🤖 Codex     |

Summary: Both=N, Claude only=N, Codex only=N

### Good Points

<Note any good implementations or clever solutions>

---
Reviewed with [Claude Code](https://claude.com/claude-code)
```

Omit entire rows from the Review Result table for perspectives with 0 findings.
Omit the Cross-validation section when Codex is not used.
When perspectives are filtered, only show rows for the specified perspectives.

##### B. Individual Findings (Review Comments)

Structure each finding as a Review Comment attached to the relevant line in the target file.

Format for each comment:

```markdown
<severity-emoji> **[<Perspective>] <finding title>** <detected-by-tag>

**Issue**: <description of the problem>

**Fix**: <suggested fix>
```

severity-emoji is one of `🔴 Must Fix` / `🟡 Should Fix` / `🟢 Suggestion`.
The `[Perspective]` tag makes it clear which perspective the finding comes from.

detected-by-tag is only included when Codex is used:

- `🤝 Both` -- Detected by both Claude and Codex (high confidence)
- `🧠 Claude` -- Detected only by Claude
- `🤖 Codex` -- Detected only by Codex

Omit detected-by-tag when Codex is not used.

##### C. Diff Line Number Mapping

Posting a Review Comment requires specifying the relative position (`line`) within the diff.

1. Parse the output of `gh pr diff <pr-number>`
2. For each finding, identify the **line number in the diff** (line number in the changed file)
3. If the finding targets a line not in the diff, use the nearest changed line or make it a file-level comment

##### D. Posting the Review to the PR

Create a Pull Request Review using `gh api`. Post the summary and all findings in a single request.

```bash
# 1. Write review data to a JSON file (using the Write tool)
#    File path: tmp-review-payload.json
#
#    JSON structure:
#    {
#      "event": "COMMENT",
#      "body": "<summary (Markdown)>",
#      "comments": [
#        {
#          "path": "<file-path>",
#          "line": <line number in the changed file>,
#          "side": "RIGHT",
#          "body": "<individual finding (Markdown)>"
#        },
#        ...
#      ]
#    }
#
#    Notes:
#    - event is "COMMENT" (informational). Do NOT use "REQUEST_CHANGES"
#    - path is relative to the repository root
#    - line is the line number in the changed file (within the diff hunk)
#    - side is "RIGHT" (post-change side)

# 2. Create Review via gh api
gh api repos/{owner}/{repo}/pulls/<pr-number>/reviews \
  --input tmp-review-payload.json

# 3. Delete temporary file
rm tmp-review-payload.json
```

If there are 0 findings, use an empty `comments` array and post only the summary.

#### Project Scope -> File Output

Save results to `projectScope.outputDir`.

```bash
# Determine review number
NEXT=$(printf "%04d" $(( $(ls -d <projectScope.outputDir>/[0-9]* 2>/dev/null | wc -l) + 1 )))
DATE=$(date +%Y-%m-%d)
REVIEW_DIR="<projectScope.outputDir>/${NEXT}-${DATE}"
mkdir -p "$REVIEW_DIR"
```

Output files:

- `${REVIEW_DIR}/claude-review.md` -- Claude's review results
- `${REVIEW_DIR}/codex-review.md` -- Codex's review results (only when Codex is used)
- `${REVIEW_DIR}/summary.md` -- Summary (including Cross-validation)

No PR comments are posted.

### Phase 6: Result Reporting

Report the following to the user:

**For PR scope:**

- URL of the posted Review
- Finding count summary by perspective
- Codex Cross-validation results (when used)

**For project scope:**

- Path to the output directory
- Finding count summary by perspective
- Codex Cross-validation results (when used)

## Notes

- Review scope is limited to the diff only (in PR scope). Do not flag issues in existing code outside the diff
- Even if there are 0 findings, post a "no issues found" comment
- Files matching `excludePatterns` are excluded from review
- Additional check items are applied to files matching `additionalChecks`
- Best practices files are loaded only when the target files exist
- In environments where Codex is unavailable, the skill works fully with Claude-only (graceful degradation)
- When `--perspective` is used to filter perspectives, unspecified perspectives are skipped
- Severity emoji format (🔴🟡🟢) is maintained for compatibility with `/review-respond`
