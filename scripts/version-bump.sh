#!/bin/bash

# Version Bump Script
# This script determines the semantic version bump based on commit messages
# from now until the last vx.x.x tagged commit.
# 
# Returns:
#   - major: if there is at least one commit with "BREAKING CHANGE:"
#   - minor: if there is at least one commit starting with "feat:", "perf:", or "release:"
#   - patch: if there is at least one commit starting with "fix:" or "refactor:"
#   - no-bump: otherwise

# Get the last version tag
LAST_TAG=$(git describe --tags --match "v*.*.*" --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
    # No previous tag found, get all commits
    COMMITS=$(git log --pretty=format:"%B" HEAD)
else
    # Get commits since the last tag
    COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%B")
fi

# Check for BREAKING CHANGE
if echo "$COMMITS" | grep -q "^BREAKING CHANGE:"; then
    echo "major"
    exit 0
fi

# Check for feat:, perf:, or release: commits
if echo "$COMMITS" | grep -q "^feat:\|^feat(\|^perf:\|^perf(\|^release:|^release("; then
    echo "minor"
    exit 0
fi

# Check for fix: or refactor: commits
if echo "$COMMITS" | grep -q "^fix:\|^fix(\|^refactor:\|^refactor("; then
    echo "patch"
    exit 0
fi

# No recognized commits
echo "no-bump"
exit 0
