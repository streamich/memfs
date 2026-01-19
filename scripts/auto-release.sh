#!/bin/bash

# Auto Release Script
# This script automates the release process for memfs without human prompts
# It uses version-bump.sh to determine the appropriate version bump
# Usage: ./scripts/auto-release.sh

set -e  # Exit immediately if a command exits with a non-zero status

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting automatic release process...${NC}\n"

# Step 1: Verify code quality and correctness
echo -e "${YELLOW}Step 1: Verifying code quality and correctness...${NC}"
echo "Running format check..."
yarn prettier:check

echo "Running typecheck..."
yarn typecheck

echo "Running tests..."
yarn test

echo -e "${GREEN}✓ Code quality verification completed${NC}\n"

# Step 2: Prepare for release
echo -e "${YELLOW}Step 2: Preparing for release...${NC}"
echo "Cleaning..."
yarn clean

echo "Building..."
yarn build

echo -e "${GREEN}✓ Build completed${NC}\n"

# Determine version bump from commit messages
echo -e "${YELLOW}Determining version bump from commit messages...${NC}"
VERSION_BUMP=$(./scripts/version-bump.sh)

echo "Detected version bump: ${VERSION_BUMP}"

# If no-bump, abort the release but exit with success
if [ "$VERSION_BUMP" = "no-bump" ]; then
    echo -e "${YELLOW}No significant changes detected. Skipping release.${NC}"
    exit 0
fi

echo -e "${GREEN}✓ Version bump determined: ${VERSION_BUMP}${NC}\n"

# Step 3: Update version in root package.json
echo -e "${YELLOW}Step 3: Updating version in root package.json...${NC}"
npm version --allow-same-version --no-git-tag-version "${VERSION_BUMP}"

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Version updated to ${NEW_VERSION}${NC}\n"

# Step 4: Synchronize versions across all packages
echo -e "${YELLOW}Step 4: Synchronizing versions across all packages...${NC}"
./scripts/sync-versions.ts

echo -e "${GREEN}✓ Versions synchronized${NC}\n"

# Step 5: Publish to NPM
echo -e "${YELLOW}Step 5: Publishing to NPM...${NC}"
yarn workspaces foreach -A --no-private npm publish

echo -e "${GREEN}✓ Published to NPM${NC}\n"

# Step 6: Create Git tag and push to remote
echo -e "${YELLOW}Step 6: Creating Git tag and pushing to remote...${NC}"
git add .
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"
git push origin --tags
git push -u origin master

echo -e "${GREEN}✓ Git tag created and pushed${NC}\n"

echo -e "${GREEN}🎉 Release v${NEW_VERSION} completed successfully!${NC}"
