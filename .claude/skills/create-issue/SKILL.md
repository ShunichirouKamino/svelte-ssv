---
name: create-issue
description: >
  Skill for interactively creating GitHub Issues. Automatically detects templates from the repository's
  .github/ISSUE_TEMPLATE/ directory and gathers requirements through conversation with the user.
  Use with /create-issue or requests like "create issue", "file a bug", "bug report", "feature request",
  "open an issue", or "request a feature".
  You can specify a template name or repository as arguments (defaults to the current repository and
  presents a list of available templates).
---

# Create Issue

Interactively create a GitHub Issue.

**All Issue titles and bodies MUST be written in English.**

## Arguments

```
/create-issue [template-name] [--repo owner/repo]
```

- `template-name`: Partial match on the template filename (omitted: select from list)
- `--repo owner/repo`: Target repository (omitted: current repository). Specify in `owner/repo` format

## Workflow

### Phase 0: Determine Target Repository

1. If `--repo owner/repo` or an `owner/repo` format is provided as an argument, use that
2. If not specified, use the current repository (`gh repo view --json nameWithOwner -q '.nameWithOwner'`)
3. Store the determined repository as the `REPO` variable and use it in all subsequent Phases

**Notes when specifying a repository:**
- Templates are fetched via the GitHub API (since `.github/ISSUE_TEMPLATE/` does not exist locally)

```bash
# Fetch template list from remote repository
gh api repos/{REPO}/contents/.github/ISSUE_TEMPLATE --jq '.[] | select(.name != "config.yml") | .name'

# Fetch content of each template file
gh api repos/{REPO}/contents/.github/ISSUE_TEMPLATE/{filename} --jq '.content' | base64 -d
```

### Phase 1: Detect and Select Template

1. Detect template files (exclude `config.yml`)
   - **Current repository**: Use Glob to find `.yml` / `.yaml` files in the `.github/ISSUE_TEMPLATE/` directory
   - **Remote repository**: Use `gh api repos/{REPO}/contents/.github/ISSUE_TEMPLATE` to detect
2. Read each template file and extract the `name` and `description`
3. Present the template list to the user for selection
   - If a template name was provided as an argument, auto-select by partial filename match
   - If only one template exists, auto-select it
   - If no templates are found, proceed with free-form Issue creation

### Phase 2: Gather Requirements

Parse the `body` field of the selected template and understand what information is needed.

**Gathering rules:**
- Do not ask fields one by one; instead ask openly: "What are the requirements or the problem you are experiencing?"
- Automatically extract information from the user's response and map it to each template field
- Only ask follow-up questions for missing required information
- Fields with `type: markdown` are for display purposes and do not require input
- For `type: dropdown` or `type: checkboxes`, present the choices for the user to select (if inferable from the user's response, just confirm)

### Phase 3: Compose and Confirm Issue Content

1. Map the gathered information to each template field
2. Compose the Issue title and body
   - Title: Template `title` prefix (e.g., `[BUG]`) + user's summary
   - Body: Format each field's label and response in Markdown following the template's `body` structure
3. Labels: Use the template's `labels` as defaults, and suggest additional labels based on the user's response
4. Present the composed content to the user for confirmation

### Phase 4: Create Issue

After confirmation, create the Issue using `gh issue create`.

```bash
# For current repository
gh issue create --title "<title>" --body "<body>" --label "<label1>,<label2>"

# For remote repository
gh issue create --repo <REPO> --title "<title>" --body "<body>" --label "<label1>,<label2>"
```

- Pass the body using a HEREDOC
- Always include the `--repo` option when `REPO` is specified
- Only include assignee or milestone if the user specifies them
- Return the Issue URL after creation

### Phase 5: Confirm Whether to Start resolve-issue

After Issue creation, ask the user whether they want to proceed with resolving the created Issue.

1. Present the following message to the user:

```
Issue #<number> has been created: <Issue URL>

Would you like to start /resolve-issue to work on this now?
1. Yes - Start resolve-issue now
2. No - Finish with Issue creation only
```

2. If the user selects "Yes":
   - Execute `/resolve-issue <issue-number>` (include `--repo <REPO>` if `REPO` was specified)

3. If the user selects "No":
   - Report the Issue URL and finish

## Template Body Field Types and Handling

| Type       | Handling                                                         |
|------------|------------------------------------------------------------------|
| markdown   | No input required. May be displayed to user as reference         |
| textarea   | Map from user's response. Use `label` as section heading         |
| input      | Map from user's response. Short text                             |
| dropdown   | Present choices. If inferable, just confirm                      |
| checkboxes | Present choices. Multiple selections allowed                     |

## Issue Body Formatting Rules

```markdown
### {field.label}

{user's response}
```

- Separate each field with a `###` heading
- Do not include fields with `markdown` type in the body
- Omit fields with empty responses

## When No Template Exists

If `.github/ISSUE_TEMPLATE/` does not exist or contains no template files:
1. Gather title and body in free-form
2. Create with `gh issue create --title "<title>" --body "<body>"`
