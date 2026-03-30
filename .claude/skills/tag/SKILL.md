---
name: tag
description: >
  Create a versioned release: resolve next version from npm registry, update package.json,
  create git tag, generate GitHub Release with notes, and publish to npm.
  Triggered by /tag or requests like "tag a release", "create release", "publish new version",
  "bump version". Accepts bump category (micro/minor/major) and optional --dry-run flag.
  Runs entirely locally (no GitHub Actions).
user_invocable: true
---

# /tag — Version, Tag, Release, and Publish

Create a complete release from the local machine:
1. Resolve next version from npm registry
2. Update package.json
3. Commit, tag, and push
4. Create GitHub Release with auto-generated notes
5. Publish to npm

## Usage

```
/tag              → micro bump (0.3.1 → 0.3.2)
/tag micro        → micro bump
/tag minor        → minor bump (0.3.1 → 0.4.0)
/tag major        → major bump (0.3.1 → 1.0.0)
/tag --dry-run    → show resolved version, skip all mutations
/tag minor --dry-run
```

## Instructions

### Phase 1: Parse Arguments

- First positional arg: bump category (`micro` | `minor` | `major`). Default: `micro`
- `--dry-run` flag: if present, only resolve and display the version

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

Display to user:
```
Current: 0.3.1 (from npm)
Bump:    minor
Next:    0.4.0
```

### Phase 3: Confirm

If not `--dry-run`, confirm with the user before proceeding:
```
This will:
  1. Update package.json to 0.4.0
  2. Commit and push to main
  3. Create tag v0.4.0 and GitHub Release
  4. Publish @svelte-ssv/core@0.4.0 to npm

Proceed? (The user must approve)
```

If `--dry-run`, display the resolved version and stop.

### Phase 4: Pre-release Checks

```bash
# Ensure clean working tree
git status --porcelain

# Ensure on main branch
git branch --show-current

# Ensure up to date with remote
git fetch origin main
git diff origin/main...HEAD --stat

# Run build and tests
npm run build && npm test
```

If any check fails, report and stop.

### Phase 5: Version Bump

```bash
# Update package.json version (no git tag — we create it manually)
npm version <NEXT_VERSION> --no-git-tag-version

# Commit the version bump
git add package.json package-lock.json
git commit -m "release: v<NEXT_VERSION>"

# Push commit
git push origin main
```

### Phase 6: Tag and GitHub Release

```bash
# Create annotated tag
git tag -a "v<NEXT_VERSION>" -m "Release v<NEXT_VERSION>"

# Push tag
git push origin "v<NEXT_VERSION>"
```

Generate release notes from commits since the last tag:

```bash
# Get previous tag
PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

# Collect commits
if [ -n "$PREV_TAG" ]; then
  COMMITS=$(git log "$PREV_TAG"..HEAD --oneline --no-merges | grep -v "^.*release: v")
else
  COMMITS=$(git log --oneline --no-merges)
fi
```

Categorize commits by prefix (feat/fix/docs/other) and create the release:

```bash
gh release create "v<NEXT_VERSION>" \
  --title "v<NEXT_VERSION>" \
  --notes "<generated release notes>"
```

Release notes format:
```markdown
## What's Changed

### Features
- <feat: commits>

### Bug Fixes
- <fix: commits>

### Other
- <remaining commits>

**Full Changelog**: https://github.com/ShunichirouKamino/svelte-ssv/compare/<PREV_TAG>...v<NEXT_VERSION>
```

### Phase 7: Confirm npm Publish

After the GitHub Release is created, display the release URL and ask the user for confirmation before publishing to npm:

```
GitHub Release created:
  https://github.com/ShunichirouKamino/svelte-ssv/releases/tag/v<NEXT_VERSION>

Publish @svelte-ssv/core@<NEXT_VERSION> to npm? (yes/no)
```

Wait for the user to confirm. If the user declines, report the tag and release URL and stop (the release exists but npm is not updated).

### Phase 8: Publish to npm

Only proceed if the user confirmed in Phase 7.

```bash
npm publish --access public
```

### Phase 9: Report

Display the results:

```
Release v<NEXT_VERSION> complete

  npm: https://www.npmjs.com/package/@svelte-ssv/core/v/<NEXT_VERSION>
  GitHub: https://github.com/ShunichirouKamino/svelte-ssv/releases/tag/v<NEXT_VERSION>
  Tag: v<NEXT_VERSION>
```

## Notes

- Always run on the `main` branch with a clean working tree
- `prepublishOnly` in package.json runs `npm run build && npm test` automatically before publish
- If any step fails after the commit, the tag and release may need manual cleanup
- The `--dry-run` flag is safe — it only reads from npm registry and git
