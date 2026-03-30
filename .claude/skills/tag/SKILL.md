---
name: tag
description: >
  Resolve and display the next version locally. Use this for version checks and dry-run previews.
  Actual releases (tag, GitHub Release, npm publish) are handled by /release via GitHub Actions.
  Triggered by /tag or requests like "check next version", "what version is next", "bump version".
  Accepts bump category (micro/minor/major) and optional --dry-run flag.
user_invocable: true
---

# /tag — Version Resolution (local only)

Resolve the next version from npm registry and display it. This skill does NOT publish or create releases — use `/release` for that.

## Usage

```
/tag              → resolve micro bump (0.3.3 → 0.3.4)
/tag micro        → resolve micro bump
/tag minor        → resolve minor bump (0.3.3 → 0.4.0)
/tag major        → resolve major bump (0.3.3 → 1.0.0)
/tag --dry-run    → same as above (all runs are read-only)
```

## Instructions

### Phase 1: Parse Arguments

- First positional arg: bump category (`micro` | `minor` | `major`). Default: `micro`
- `--dry-run` flag: accepted but has no effect (all runs are read-only)

### Phase 2: Resolve Version

```bash
# Get current version from npm registry
CURRENT=$(npm view @svelte-ssv/core version 2>/dev/null || echo "0.0.0")

# Parse semver
IFS='.' read -r MAJOR MINOR MICRO <<< "$CURRENT"

# Calculate next version
# major: MAJOR+1.0.0
# minor: MAJOR.MINOR+1.0
# micro: MAJOR.MINOR.MICRO+1
```

### Phase 3: Display

Display the resolved version to the user:

```
Current: 0.3.3 (from npm)
Bump:    micro
Next:    0.3.4
```

Then remind the user:

```
To create a release, use /release <bump> which runs the full pipeline
via GitHub Actions (build, test, tag, GitHub Release, npm publish).
```

## Notes

- This skill is read-only — it never modifies files, git, or npm
- Use `/release` to perform the actual release via GitHub Actions
- The GitHub Actions workflow requires approval from designated reviewers in the `production` environment
