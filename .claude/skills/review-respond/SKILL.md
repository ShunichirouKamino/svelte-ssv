---
name: review-respond
description: Skill for responding to PR review comments. Triggered by /review-respond or requests like "respond to review", "address review comments", "handle review feedback", "fix review issues". Fetches review comments from the current branch's PR, applies fixes in a worktree, runs build checks, monitors CI, and replies to each comment on the PR. PR number can be specified as an argument.
---

# Review Respond

Fetch PR review comments, then execute the full workflow in a worktree: fix code -> pre-commit checks -> push -> monitor CI -> reply to comments.
The current branch is never modified; all work is done in a separate git worktree.

**All commit messages and PR comments MUST be written in English.**

## Loading Configuration

Before execution, read `.claude/skills/skills_config.json` and use the following values. If the file does not exist, use the default values documented here.

| Config Key | Purpose | Default Value |
|------------|---------|---------------|
| `project.worktreePrefix` | Prefix for the worktree directory | `ssv-worktree` |
| `build.fastCommand` | All-in-one build command | `npm run build && npm test` |

## Usage

```
/review-respond [pr-number]
```

- `pr-number`: Target PR number (if omitted, uses the PR associated with the current branch)

## Execution Steps

### Phase 1: Fetch PR Information and Review Comments

#### 1.1 Fetch PR Information

```bash
# If a PR number is specified
gh pr view <pr-number> --json number,url,title,state,headRefName

# If omitted: determine from the current branch
git branch --show-current
gh pr view --json number,url,title,state,headRefName
```

If no PR exists or the PR is closed, report an error and stop.

#### 1.2 Fetch Review Comments

```bash
# Get repository info
gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"'

# Get own username (used to exclude self-posted comments)
gh api user --jq '.login'

# Fetch PR review comments (line comments)
# **Important**: Always include --paginate to avoid missing comments on large PRs
gh api repos/<owner>/<repo>/pulls/<pr_number>/comments --paginate \
  --jq '.[] | {id, path, line, body, user: .user.login, created_at, in_reply_to_id}'

# Fetch issue-level comments on the PR
gh api repos/<owner>/<repo>/issues/<pr_number>/comments --paginate \
  --jq '.[] | {id, body, user: .user.login, created_at}'

# Fetch reviews (Approve/Request Changes) content
gh api repos/<owner>/<repo>/pulls/<pr_number>/reviews --paginate \
  --jq '.[] | {id, state, body, user: .user.login}'
```

#### 1.3 Analyze Review Comments

Analyze the fetched comments and identify unresolved items.

#### 1.3.1 Determining Unresolved Comments

A comment is considered an "unresolved review item" when **all** of the following conditions are met:

1. `in_reply_to_id` is `null` (it is an original comment, not a reply)
2. No reply comment exists for this comment's `id` (no comment with `in_reply_to_id == this comment's id`)
3. **Either** of the following is true:
   - **Posted by someone else** (`user.login` is not yourself)
   - **Posted by yourself but contains a severity emoji** (one of: 🔴 / 🟡 / 🟢) (= self-review item posted by the `/review` skill)

> **Important**: Self-review items posted by the `/review` skill come from the same account as the PR owner (yourself). However, these are legitimate review items that need to be addressed. Use the presence of severity emojis to distinguish them. Comments from yourself that contain 🔴, 🟡, or 🟢 should be treated as items to address.

#### 1.3.2 Identifying Required Changes

From unresolved comments, identify:
- **Files requiring changes**: Determined from the comment's `path` field
- **Issue details**: Parsed from the comment's `body`
- **Severity**: One of 🔴 Must Fix / 🟡 Should Fix / 🟢 Suggestion

If there are 0 unresolved items, report this to the user and stop.

### Phase 2: Create Worktree

Check out the PR branch into a separate directory using a worktree. **The current branch is not affected at all.**

```bash
git fetch origin

# Create worktree (placed in the parent directory of the repository)
# WORKTREE_DIR: This path is used in all subsequent Phases
git worktree add ../<project.worktreePrefix>-review-pr<PR_NUMBER> origin/<PR_BRANCH_NAME>
```

Example: PR #1443 with branch `feature/issue1442/add-npm-docker-workflows`
- worktree: `../<project.worktreePrefix>-review-pr1443`

**Important**: In all subsequent Phases, perform file operations using absolute paths based on `WORKTREE_DIR`.

### Phase 3: Code Fixes

Apply code fixes based on the review comments.

1. Read the flagged files using the Read tool with absolute paths under `WORKTREE_DIR`
2. Apply fixes using the Edit tool according to the review feedback
3. Ask the user for clarification on ambiguous comments
4. For comments that do not require changes, reply accordingly in Phase 6

### Phase 4: Pre-commit Checks and Push

#### 4.1 Pre-commit Checks

Run `build.fastCommand` to verify formatting, tests, and build in one step.

```bash
cd <WORKTREE_DIR>
<build.fastCommand>
```

If errors occur, fix them before proceeding.

#### 4.2 Commit

```bash
cd <WORKTREE_DIR>
git add <changed_files>
git commit -m "fix: address review feedback - <summary of changes>"
```

#### 4.3 Push to Remote

```bash
cd <WORKTREE_DIR>
git push
```

### Phase 5: CI Test Execution and Monitoring

#### 5.1 Monitor PR-triggered CI

```bash
gh pr checks <pr-number> --watch --fail-fast
```

`--watch` polls until CI completes.

#### 5.2 Handling CI Failures

If CI fails:

1. Check the failed job logs

```bash
gh run view <run-id> --log-failed
```

2. Analyze the failure cause
   - **If caused by your changes**: Fix -> commit -> push, then re-monitor CI
   - **If caused by known flaky tests or environment issues**: Report the situation to the user

3. If unable to resolve on your own, present the following options to the user

```
CI has failed.
- Failed job: <job_name>
- Error summary: <brief description of the error>

Please choose one of the following:
1. Ignore the CI failure and proceed to comment replies
2. Stop work here (fixes have been pushed; handle manually and reply to comments separately)
```

#### 5.3 On CI Success

If all CI checks pass, proceed directly to Phase 6.

### Phase 6: Reply to Review Comments with Results

After CI passes, **reply to each unresolved review comment individually** (regardless of whether code was changed).

**CRITICAL**: You MUST reply to each review comment using its `in_reply_to` ID so the reply appears as a thread under the original comment. Do NOT post a single summary comment on the PR. Each unresolved comment identified in Phase 1.3 must receive its own individual reply.

To prevent command injection, pass comment bodies via temporary files.

**For each unresolved comment**, repeat the following steps:

```bash
# 1. Write the comment body to a temporary file (using the Write tool)
#    File path: /tmp/review-comment-<N>.md

# 2. Reply to the specific review comment using in_reply_to
#    IMPORTANT: Use the original comment's ID as in_reply_to to create a thread
gh api repos/<owner>/<repo>/pulls/<pr_number>/comments \
  -X POST \
  -F body=@/tmp/review-comment-<N>.md \
  -F commit_id=<latest_commit_sha> \
  -F path=<file_path> \
  -F line=<line_number> \
  -F in_reply_to=<original_comment_id>

# 3. Delete the temporary file
rm /tmp/review-comment-<N>.md
```

**For review-level comments (no `path`/`line`)**, use issue comment reply:

```bash
gh pr comment <pr_number> --body-file /tmp/review-comment-<N>.md
```

#### Comment Reply Format

For comments where code was changed:

```markdown
Addressed.

**Changes made:**
- <list of changes in bullet points>

**Fix commit:** <short commit SHA>
```

For comments that do not require changes:

```markdown
Reviewed, but keeping current implementation.

**Reason:**
- <reason for not making changes>
```

#### Verification

After posting all replies, verify the total number of replies matches the number of unresolved comments from Phase 1.3. If any replies failed, retry or report to the user.

### Phase 7: Remove Worktree and Report Results

#### 7.1 Remove Worktree

```bash
git worktree remove ../<project.worktreePrefix>-review-pr<PR_NUMBER>
```

#### 7.2 Report Results

Report the following information to the user:

- PR URL
- List of addressed comments (summary of each issue and the fix applied)
- CI result (success / failure / skipped)
- Number of comment replies posted

## Notes

- Execute each Phase in order. Do not proceed until the current Phase is complete
- **All file operations, builds, and tests must be performed within the worktree directory**
- Do not make any changes to the current branch or working directory
- When there are multiple review comments, address them all together in a single commit
- **Reply to all unresolved comments regardless of whether code was changed** (explicitly state: fixed / keeping current implementation / not applicable)
- If a comment is unclear, ask the user for clarification
- If worktree removal fails (e.g., due to uncommitted changes), report this to the user
