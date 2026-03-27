---
name: create-pr
description: Skill to create a GitHub Pull Request. Triggered by /create-pr, "create PR", "open pull request", "make a PR", etc. Automatically extracts the Issue number from the branch name and includes an Issue link in the title and PR body. The target base branch can be specified as an argument.
---

# Create PR

Create a GitHub Pull Request. Automatically extracts the Issue number from the branch name and includes it in the title and PR body.

**All PR titles and bodies MUST be written in English.**

## Loading Configuration

Before execution, read the skill-specific config `skill_config.json` and the global config `.claude/skills/skills_config.json`, and use the following values. If a file does not exist, use the default values documented here.

> **Config file usage**: Skill-specific settings are stored in `.claude/skills/create-pr/skill_config.json`, and project-wide settings are stored in `.claude/skills/skills_config.json`.

| Config Key | Config File | Purpose | Default Value |
|------------|-------------|---------|---------------|
| `branches.base` | `skills_config.json` | Base branch for the PR (when argument is omitted) | `main` |
| `branches.issuePattern` | `skills_config.json` | Regex to extract Issue number from branch name | `issue(\d+)` |
| `titleFormat` | `skill_config.json` | PR title format | `[Issue#{issueNumber}] {summary}` |
| `assignSelf` | `skill_config.json` | Whether to assign yourself | `true` |

## Usage

```
/create-pr [base-branch]
```

- `base-branch`: Target base branch for the PR (default: value of `branches.base`)

## Workflow

### 1. Gather Information

Run the following:

```bash
# Get the current branch name
git branch --show-current

# Check status
git status

# Check sync state with remote
git fetch origin && git rev-list --left-right --count origin/<base-branch>...HEAD

# Commit history (since diverging from base-branch)
git log --oneline <base-branch>..HEAD

# Diff summary
git diff --stat <base-branch>...HEAD

# Detailed diff
git diff <base-branch>...HEAD
```

### 2. Extract Issue Number

Extract the Issue number from the branch name using the `branches.issuePattern` regex.

**Pattern**: Branch names containing `feature/issue<number>/xxx` or `issue<number>`

```
feature/issue201/add-login → Issue number: 201
issue30-feature-update → Issue number: 30
```

Extraction method: Use `branches.issuePattern` (default: `issue(\d+)`) against the branch name.

### 3. Create PR Title and Body

#### Title Format

Follow `titleFormat`. Default:

```
[Issue#<number>] <summary of changes>
```

Example: `[Issue#201] Add login form validation`

#### PR Body Format

````markdown
## Summary

<1-3 line summary based on commit history and diff>

## Related Issue

#<Issue number>

## Changes

<Bulleted list based on the diff summary>

## Diff Details

```diff
<Excerpt of key changes from git diff>
```

---
Generated with [Claude Code](https://claude.com/claude-code)
````

### 4. Create the PR

To prevent command injection, pass the PR body via a temporary file.

```bash
# 1. Write the PR body to a temporary file (using the Write tool)
#    File path: /tmp/pr-body.md

# 2. Create the PR with the gh command
gh pr create --base <base-branch> --assignee @me --title "<title>" --body-file /tmp/pr-body.md

# 3. Remove the temporary file
rm /tmp/pr-body.md
```

**Note**: If the title contains special characters (`$`, `` ` ``, `"`, `\`, etc.), escape them appropriately.

### 5. Report Results

Report the URL of the created PR to the user.

## Notes

- If the Issue number cannot be extracted, do not include an Issue number in the title
- If there are unpushed commits, run `git push -u origin <branch>` first
- For the diff in the PR body, excerpt only the key changes (the full diff may be too long)
