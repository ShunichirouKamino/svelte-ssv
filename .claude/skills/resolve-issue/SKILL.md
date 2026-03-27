---
name: resolve-issue
description: Reads a specified GitHub Issue and executes the full workflow from implementation to PR creation, self-review, review response, and Issue reporting. Triggered by /resolve-issue, "resolve issue", "work on issue", "implement issue", "fix issue", "address issue", etc. Requires an issue number as an argument.
---

# Resolve Issue

Reads the specified GitHub Issue and executes the full workflow: implementation, PR creation, self-review, review response, CI monitoring, and Issue reporting.
The current branch is left untouched; all work is done in a separate directory via git worktree.

**All commit messages, PR content, and Issue comments MUST be written in English.**

## Loading Configuration

Before execution, load the skill-specific config `skill_config.json` and the global config `.claude/skills/skills_config.json`, and use the following values. If a file does not exist, use the default values documented here.

> **Config file distinction**: Skill-specific settings are stored in `.claude/skills/resolve-issue/skill_config.json`, while project-wide settings are in `.claude/skills/skills_config.json`.

| Config Key                   | Config File            | Purpose                                  | Default Value                           |
|------------------------------|------------------------|------------------------------------------|-----------------------------------------|
| `project.worktreePrefix`     | `skills_config.json`   | Prefix for worktree directories          | `ssv-worktree`                          |
| `branches.base`              | `skills_config.json`   | Base branch                              | `main`                                  |
| `branches.branchFormat`      | `skills_config.json`   | Branch naming format                     | `feature/issue{number}/{kebab-summary}` |
| `docs.checklists[0]`         | `skills_config.json`   | Checklist file path                      | None                                    |
| `docs.architecture`          | `skills_config.json`   | Architecture guide paths                 | `["CLAUDE.md"]`                         |
| `docs.testPractices`         | `skills_config.json`   | Test practices guide path                | None                                    |
| `docs.domainPractices`       | `skills_config.json`   | Domain knowledge guide path              | None                                    |
| `build.fastCommand`          | `skills_config.json`   | All-in-one build command                 | None                                    |
| `ciDispatch`                 | `skill_config.json`    | Whether to manually dispatch CI workflow | `true`                                  |

## Usage

```
/resolve-issue <issue-number>
```

- `issue-number`: The Issue number to work on (required)

## Execution Steps

### Phase 1: Issue Verification and Preparation

#### 1.1 Retrieve Issue Details

```bash
# Get Issue details
gh issue view <issue-number> --json number,title,body,labels,assignees,state

# Also get Issue comments (in case there are additional requirements)
gh issue view <issue-number> --comments
```

If the Issue is already closed, report to the user and stop.

#### 1.2 Assign Yourself to the Issue

```bash
gh issue edit <issue-number> --add-assignee @me
```

#### 1.3 Create a Worktree

Generate a branch name from the Issue title, create a branch linked to the Issue's Development section using `gh issue develop`, then set up a working environment in a separate directory via git worktree.
**The current branch is not affected in any way.**

**Naming convention**: Follow `branches.branchFormat` (default: `feature/issue{number}/{kebab-summary}`)

```bash
git fetch origin

# 1. Create a branch via gh issue develop (automatically links to the Issue's Development section)
gh issue develop <issue-number> --name <branches.branchFormat> --base <branches.base>

# 2. Fetch the branch created on the remote
git fetch origin

# 3. Create the worktree (placed in the parent directory of the repository)
# WORKTREE_DIR: This path is used in all subsequent Phases
git worktree add ../<project.worktreePrefix>-issue<number> origin/<branches.branchFormat>
```

Example: Issue #201 "Fix login form validation"

- Branch: `feature/issue201/fix-login-validation`
- Worktree: `../<project.worktreePrefix>-issue201`

**Fallback if `gh issue develop` fails** (e.g., branch name already exists):

```bash
# Create a local branch and build the worktree (Development link is replaced by the PR's Closes keyword)
git worktree add ../<project.worktreePrefix>-issue<number> -b <branches.branchFormat> origin/<branches.base>
```

**Important**: In all subsequent Phases, perform file operations relative to `WORKTREE_DIR` (the absolute path of `../<project.worktreePrefix>-issue<number>`).

### Phase 2: Implementation

#### 2.1 Analyze Issue Content

Identify the following from the Issue body, labels, and comments:

- **Change type**: New feature (feature), bug fix (bug), improvement (enhancement), documentation, etc.
- **Scope**: Modules and files that need to be changed
- **Acceptance criteria**: Completion conditions described in the Issue

#### 2.2 Implement Changes

Implement the code based on the Issue content.

- **File operations**: Use absolute paths under `WORKTREE_DIR` for all Read / Write / Edit tool calls
- **Build & test**: Run commands after `cd <WORKTREE_DIR>`
- Follow the implementation patterns described in the guides listed in `docs.architecture`
- If `docs.testPractices` is configured, refer to it and choose the appropriate test strategy (unit test / integration test / both) for the changes
- If `docs.domainPractices` is configured, refer to it as domain knowledge for the implementation target
- Refer to additional architecture documents as needed
- Ask the user for clarification if anything is unclear

#### 2.3 Create and Run Unit Tests (Optional)

If the `/unit-test` skill is available, invoke it via the **Skill tool** to create and run tests for the changed files.

```
Skill: unit-test
```

- Analyzes the changes and automatically determines what to test
- Skipped if tests are deemed unnecessary

**Note**: If the `unit-test` skill is not available in this project, skip this phase.

#### 2.4 Create Integration Tests (Optional, When API Changes Exist)

If API endpoint changes are involved and the `/integration-test` skill is available, invoke it via the **Skill tool** to create integration tests.

```
Skill: integration-test
```

- Determines targets based on the `/integration-test` skill's `apiChangePatterns`
- If the service is not running, only the test class is created; execution is handled later

**Note**: If the `integration-test` skill is not available in this project, skip this phase.

#### 2.5 Pre-commit Checks

If `docs.checklists[0]` is configured, perform the checks described in that checklist.
If `build.fastCommand` is configured, run it to verify formatting, tests, and build in one step.

```bash
cd <WORKTREE_DIR>
<build.fastCommand>
```

If errors occur, fix them before proceeding.

#### 2.6 Commit

Once checks pass, commit the changes within the worktree directory.

**Commit message convention**: Prefix with `[Issue#<number>]` so it is immediately clear which Issue the change addresses.

```bash
cd <WORKTREE_DIR>
git add <changed-files>
git commit -m "[Issue#<issue-number>] <change-type>: <summary of changes>

refs #<issue-number>"
```

Example: `[Issue#201] fix: Fix login form validation`

#### 2.7 Push to Remote

```bash
cd <WORKTREE_DIR>
git push -u origin <created-branch-name>
```

### Phase 3: PR Creation

Invoke the `/create-pr` skill via the **Skill tool** to create a PR.

```
Skill: create-pr (args: <branches.base>)
```

> **Required**: You MUST call `create-pr` via the Skill tool. Substituting with the Agent tool or manual `gh pr create` is prohibited. This ensures the skill's formatting and procedures are applied correctly.

**Note**: The create-pr skill uses branch information from the worktree directory. Execute it from within the worktree.

#### 3.1 Verify Issue-Branch Linkage

If `gh issue develop` was used in Phase 1.3, the branch is already linked to the Issue's Development section.
Additionally, if the PR body contains `Closes #<issue-number>`, the PR is also automatically linked to the Issue.

If the fallback (`git worktree add -b`) was used in Phase 1.3, the only automatic link is via the `Closes #<issue-number>` keyword in the PR body.

### Phase 4: Self-Review

Invoke the `/review` skill via the **Skill tool** to perform a self code review on the created PR.

```
Skill: review
```

> **Required**: You MUST call `review` via the Skill tool. Implementing review logic independently via the Agent tool or posting reviews directly via `gh api` is prohibited. The review skill has specific formats and procedures including perspective-based checklists (`perspective-*.md`), severity classification, and Codex integration, which must be applied correctly.

Review results are posted as comments on the PR.

### Phase 5: Review Response

If there are findings from the self-review, invoke the `/review-respond` skill via the **Skill tool** to address them.

```
Skill: review-respond
```

> **Required**: You MUST call `review-respond` via the Skill tool. Substituting with the Agent tool is prohibited.

- If there are Must Fix / Should Fix findings, make the corrections
- Evaluate Suggestions and address them if appropriate
- Post-fix commits and pushes are handled within the review-respond skill

**If there are 0 findings, skip this Phase.**

### Phase 6: CI Test Execution and Monitoring

#### 6.1 Monitor PR-triggered CI

```bash
# Get the status of CI checks linked to the PR
gh pr checks <pr-number> --watch --fail-fast
```

`--watch` polls until the CI completes.

#### 6.2 Manual Workflow Dispatch (Optional)

If `ciDispatch` is `true` and the `/ci-test` skill is available, manually dispatch the workflows defined in the `/ci-test` skill's `skill_config.json`.

```
Skill: ci-test (args: <branch-name>)
```

Skip this step if `ciDispatch` is `false` or if the `/ci-test` skill is not available in this project.

#### 6.3 Handling CI Failures

If CI fails:

1. Check the logs of the failed job

```bash
# Get logs of the failed run
gh run view <run-id> --log-failed
```

2. Analyze the failure cause
    - **If caused by your changes**: Fix, commit, push, and re-monitor CI
    - **If caused by a known flaky test or environment issue**: Report the situation to the user

3. If you cannot resolve the issue, present the following options to the user

```
CI has failed.
- Failed job: <job-name>
- Error summary: <summary of the error>

Please choose one of the following:
1. Ignore the CI failure and continue with the remaining tasks (Issue reporting / worktree cleanup)
2. Stop work here (PR has been created. After manual resolution, run the remaining tasks separately)
```

If the user chooses "continue", proceed to Phase 7. If the user chooses "stop", only perform the result report in Phase 9, noting that CI is currently failing.

#### 6.4 On CI Success

If all CI checks pass, proceed directly to Phase 7.

### Phase 7: Report to Issue

#### 7.1 Comment on the Issue

Post a comment on the Issue describing what was done. Use a temporary file to prevent command injection.

```bash
# 1. Write the comment body to a temporary file (use the Write tool)
#    File path: /tmp/issue-comment.md
#
#    Comment format:
#    ## Summary of Changes
#
#    <Bulleted list of what was implemented>
#
#    ## PR
#
#    #<pr-number>
#
#    ---
#    Generated with [Claude Code](https://claude.com/claude-code)

# 2. Post the comment to the Issue
gh issue comment <issue-number> --body-file /tmp/issue-comment.md

# 3. Delete the temporary file
rm /tmp/issue-comment.md
```

### Phase 8: Update Task List

If the Issue body contains a task list (`- [ ]` checkboxes), update all checkboxes to completed.

```bash
# 1. Get the Issue body
gh issue view <issue-number> --json body -q '.body' > /tmp/issue-body.md

# 2. Check if a task list exists
#    If "- [ ]" is not found, skip this Phase

# 3. Replace all incomplete checkboxes with completed ones
#    - [ ] -> - [x]
#    Use sed or PowerShell for the replacement

# 4. Update the Issue body
gh issue edit <issue-number> --body-file /tmp/issue-body.md

# 5. Delete the temporary file
rm /tmp/issue-body.md
```

**If there is no task list, skip this Phase.**

### Phase 9: Worktree Cleanup and Result Report

#### 9.1 Delete the Worktree

Once work is complete, delete the worktree.

```bash
# Delete the worktree (the branch remains on the remote)
git worktree remove ../<project.worktreePrefix>-issue<number>
```

#### 9.2 Result Report

Report the following information to the user:

- Issue URL
- Created branch name
- PR URL
- CI result (success / failure / skipped)
- Summary of review results (number of findings and resolution status)
- URL of the comment posted to the Issue
- Whether the task list was updated

## Notes

- Execute each Phase in order. Do not proceed to the next Phase until the current one is complete
- **Sub-skill invocations MUST use the Skill tool. Independently re-implementing skill logic via the Agent tool is prohibited.**
  Skills have specific formats, checklists, and integration features that are only applied correctly through the Skill tool
- **All file operations, builds, and tests MUST be performed within the worktree directory**
- Do not make any changes to the current branch or working directory
- If Issue requirements are unclear during implementation, ask the user for clarification
- If build errors or test failures occur, fix them before proceeding to the next Phase
- If the Issue has a `documentation` label, only documentation changes are needed; code review is not required
- If large-scale changes are needed, confirm the approach with the user before implementation
- If worktree deletion fails (e.g., uncommitted changes exist), report to the user
- **All commit messages, PR content, and Issue comments MUST be written in English**
