# Codex Review Prompt Template

Codex に渡すプロンプトのテンプレート。
変数は実行時に置換する。

## PR スコープ用テンプレート

```
Review this pull request (#{PR_NUMBER}) against origin/{BASE_BRANCH}.
Project: {PROJECT_DESCRIPTION}

Focus on: {PERSPECTIVES}

Use git diff origin/{BASE_BRANCH}...HEAD as the review basis.
You may also read source files with cat to understand full context.
Do not modify files or run commands that require network.

Return findings in this format:

1) blocking issues (Must Fix)
2) non-blocking issues (Should Fix)
3) suggested improvements (Suggestion)
4) overall summary

For each finding include:
- Perspective: (architecture|security|performance|reliability|maintainability)
- Severity: (Must Fix|Should Fix|Suggestion)
- File: path/to/file
- Line: line number
- Title: short description
- Issue: what the problem is
- Fix: how to fix it

If the diff is too large, focus on the most critical source files first.
Skip package-lock.json and dist/ files.
```

## プロジェクトスコープ用テンプレート

```
You are performing a full project review of the following project:
{PROJECT_DESCRIPTION}

Scan the codebase and report findings organized by perspective.
Do not modify files or run commands that require network.
Use `cat` or `find` to read files.

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
