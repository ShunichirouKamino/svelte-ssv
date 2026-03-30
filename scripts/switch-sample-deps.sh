#!/bin/bash
# Switch sample apps between local (file:..) and published npm versions.
#
# Usage:
#   ./scripts/switch-sample-deps.sh local          # Use file:.. (development)
#   ./scripts/switch-sample-deps.sh 0.3.1          # Use published npm version
#   ./scripts/switch-sample-deps.sh latest          # Use latest from npm

set -euo pipefail

MODE="${1:-local}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SAMPLE_DIRS=(
  "$ROOT_DIR/sample-svelte"
  "$ROOT_DIR/sample-sveltekit"
)

if [ "$MODE" = "local" ]; then
  VERSION="file:.."
  echo "Switching to local dependency (file:..)"
else
  VERSION="$MODE"
  echo "Switching to npm version: $VERSION"
fi

for dir in "${SAMPLE_DIRS[@]}"; do
  if [ -f "$dir/package.json" ]; then
    echo "  Updating $dir/package.json"

    # Use node to update package.json (cross-platform, preserves formatting)
    # Pass values via env vars to avoid shell injection
    PKG_DIR="$dir" PKG_VERSION="$VERSION" node -e "
      const fs = require('fs');
      const pkgPath = process.env.PKG_DIR + '/package.json';
      const version = process.env.PKG_VERSION;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.dependencies && pkg.dependencies['@svelte-ssv/core'] !== undefined) {
        pkg.dependencies['@svelte-ssv/core'] = version;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
        console.log('    @svelte-ssv/core -> ' + version);
      } else {
        console.log('    Skipped (no @svelte-ssv/core dependency)');
      }
    "

    # Reinstall if node_modules exists
    if [ -d "$dir/node_modules" ]; then
      echo "  Running npm install in $dir"
      (cd "$dir" && npm install)
    fi
  fi
done

echo "Done."
