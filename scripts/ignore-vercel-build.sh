#!/bin/bash

echo "=== Vercel Ignored Build Step Check ==="

# Check if we are inside a Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not in a Git repository or Git is not available. Proceeding with build."
  exit 1
fi

# Check if there is a parent commit to compare with
if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "No parent commit found (initial build or shallow clone). Proceeding with build."
  exit 1
fi

# Check for changes in frontend-specific files/directories
git diff --quiet HEAD^ HEAD -- \
  src \
  public \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.ts \
  tailwind.config.ts \
  postcss.config.mjs \
  vercel.json \
  .vercelignore

RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo "✓ No changes detected in frontend files. Skipping Vercel build."
  exit 0
else
  echo "✗ Changes detected in frontend files. Proceeding with Vercel build."
  exit 1
fi
