# Codex Review Prompt Template

Codex に渡すプロンプトのテンプレート。
変数は実行時に置換する。

## PR スコープ用テンプレート

```
You are reviewing Pull Request #{PR_NUMBER} in the following project:
{PROJECT_DESCRIPTION}

The PR branch is: {HEAD_BRANCH}

First, retrieve the PR diff by running this command (use git, NOT gh, since gh requires network access which is blocked in sandbox):
git diff origin/{BASE_BRANCH}...origin/{HEAD_BRANCH}

Then review the diff and report findings organized by perspective.
You may also read relevant source files with `cat` or `git show` commands to understand the full context.
Do NOT use `gh` commands — they require network access and will be blocked by sandbox policy.

Perspectives to check:
{PERSPECTIVES}

For each finding, report in the following format (do NOT try to post comments via gh api — Claude will handle that):
- Perspective: (architecture|security|performance|reliability|maintainability)
- Severity: (must|recommend|suggest)
- File: path/to/file
- Line: line number
- Title: short description
- Issue: what the problem is
- Fix: how to fix it

If the diff is too large, focus on the most critical files first.
```

## プロジェクトスコープ用テンプレート

```
You are performing a full project review of the following project:
{PROJECT_DESCRIPTION}

Scan the codebase and report findings organized by perspective.
Do NOT use `gh` commands — they require network access and will be blocked by sandbox policy.
Use `cat`, `git show`, or `find` to read files.

Perspectives to check:
{PERSPECTIVES}

IMPORTANT: Only report findings for the perspectives listed above. Skip any perspective not in the list.

Focus areas per perspective (include only those matching {PERSPECTIVES}):
- Architecture: layer violations, dependency inversions, module boundary violations
- Security: injection, auth bypass, hardcoded secrets, input validation
- Performance: N+1 queries, resource leaks, missing pagination
- Reliability: exception swallowing, transaction boundary issues, data integrity
- Maintainability: naming, code duplication, complexity

For each finding, report:
- Perspective: (architecture|security|performance|reliability|maintainability)
- Severity: (Must Fix|Should Fix|Suggestion)
- File: path/to/file
- Line: line number
- Title: short description
- Issue: what the problem is
- Fix: how to fix it
```

## 変数一覧

| 変数                      | 説明                                                   | スコープ |
|-------------------------|------------------------------------------------------|------|
| `{PR_NUMBER}`           | PR 番号                                                | PR   |
| `{HEAD_BRANCH}`         | PR のヘッドブランチ名                                         | PR   |
| `{BASE_BRANCH}`         | PR のベースブランチ名                                         | PR   |
| `{PROJECT_DESCRIPTION}` | プロジェクト説明（`skill_config.json` の `projectDescription`） | 共通   |
| `{PERSPECTIVES}`        | 有効な観点のカンマ区切りリスト                                      | 共通   |
