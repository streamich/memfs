#!/bin/bash

# Quick Release Script
# This script automates the release process for memfs
# Usage: ./scripts/quick-release.sh [major|minor|patch|pre*|{version}]
# Default: minor

set -e  # Exit immediately if a command exits with a non-zero status

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version bump type (default to minor)
VERSION_BUMP=${1:-minor}

echo -e "${GREEN}Starting release process with version bump: ${VERSION_BUMP}${NC}\n"

# Step 1: Verify code quality and correctness
echo -e "${YELLOW}Step 1: Verifying code quality and correctness...${NC}"
echo "Running format check..."
yarn prettier:check

echo "Running typecheck..."
yarn typecheck

echo "Running tests..."
yarn test

echo "Generating typedoc..."
yarn typedoc

echo -e "${GREEN}✓ Code quality verification completed${NC}\n"

# Step 2: Prepare for release
echo -e "${YELLOW}Step 2: Preparing for release...${NC}"
echo "Cleaning..."
yarn clean

echo "Building..."
yarn build

echo -e "${GREEN}✓ Build completed${NC}\n"

# Step 3: Update version in root package.json
echo -e "${YELLOW}Step 3: Updating version in root package.json...${NC}"
npm version --allow-same-version --no-git-tag-version "${VERSION_BUMP}"

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Version updated to ${NEW_VERSION}${NC}\n"

# Step 4: Synchronize versions across all packages
echo -e "${YELLOW}Step 4: Synchronizing versions across all packages...${NC}"
./scripts/sync-versions.ts

echo -e "${GREEN}✓ Versions synchronized${NC}\n"

# Step 5: Perform a dry run
echo -e "${YELLOW}Step 5: Performing dry run...${NC}"
yarn workspaces foreach -A --no-private npm publish --dry-run

echo -e "${GREEN}✓ Dry run completed${NC}\n"

# Step 6: Login with NPM (interactive)
echo -e "${YELLOW}Step 6: NPM Login${NC}"
echo "Please login to NPM if not already logged in:"
yarn npm login

echo -e "${GREEN}✓ NPM login completed${NC}\n"

# Step 7: Publish to NPM (with confirmation)
echo -e "${YELLOW}Step 7: Ready to publish v${NEW_VERSION} to NPM${NC}"
read -p "Do you want to proceed with publishing? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Publishing cancelled by user${NC}"
    exit 1
fi

echo "Publishing to NPM..."
yarn workspaces foreach -A --no-private npm publish

echo -e "${GREEN}✓ Published to NPM${NC}\n"

# Step 8: Create Git tag and push to remote
echo -e "${YELLOW}Step 8: Ready to create Git tag and push to remote${NC}"
read -p "Do you want to proceed with creating tag v${NEW_VERSION} and pushing a new commit to remote? (yes/no): " CONFIRM_GIT

if [ "$CONFIRM_GIT" != "yes" ]; then
    echo -e "${RED}Git tag and push cancelled by user${NC}"
    exit 1
fi

echo "Creating Git tag and pushing to remote..."
git add .
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"
git push origin --tags

echo -e "${GREEN}✓ Git tag created and pushed${NC}\n"

echo -e "${GREEN}🎉 Release v${NEW_VERSION} completed successfully!${NC}"
