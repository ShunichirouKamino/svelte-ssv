---
name: release
description: Trigger a release of @svelte-ssv/core via GitHub Actions
user_invocable: true
---

# /release — Publish a new version of @svelte-ssv/core

Triggers the GitHub Actions release workflow which:
1. Resolves the next version from git tags
2. Builds and tests the package (tsup + vitest)
3. Bumps version in package.json
4. Creates a git tag and GitHub Release with notes
5. Publishes to npm as `@svelte-ssv/core`

## Usage

```
/release              → micro bump (0.2.0 → 0.2.1)
/release micro        → micro bump (0.2.0 → 0.2.1)
/release minor        → minor bump (0.2.0 → 0.3.0)
/release major        → major bump (0.2.0 → 1.0.0)
/release --dry-run    → resolve version only, no publish
/release minor --dry-run
```

## Instructions

1. Parse the user's arguments:
   - First positional arg: bump category (`micro` | `minor` | `major`). Default: `micro`
   - `--dry-run` flag: if present, set dry_run to true

2. Confirm with the user before triggering:
   - Show the bump category and whether it's a dry run
   - Remind them that this will push a tag, create a GitHub Release, and publish to npm

3. Trigger the workflow:
   ```bash
   gh workflow run release.yml \
     -f bump=<BUMP> \
     -f dry_run=<true|false>
   ```

4. Monitor the workflow:
   ```bash
   # Get the latest run ID
   gh run list --workflow=release.yml --limit=1 --json databaseId --jq '.[0].databaseId'

   # Watch it
   gh run watch <RUN_ID>
   ```

5. Report the result:
   - On success: show the version, link to the GitHub Release, and link to the npm package
   - On failure: show the failed step and logs
