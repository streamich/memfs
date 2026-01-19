# Release Scripts

## Scripts Overview

### `auto-release.sh`

Automated release script that determines version bump from commit messages using semantic versioning rules.

- Analyzes commit messages to determine version bump (major/minor/patch)
- Runs quality checks, builds, publishes, and creates git tags automatically
- No user interaction required

### `quick-release.sh`

Interactive release script with manual version specification.

- Allows specifying version bump type or exact version
- Includes confirmation prompts before publishing and tagging
- Safer for manual releases

### `version-bump.sh`

Utility script that analyzes git commits to determine semantic version bump.

- Returns: major (BREAKING CHANGE), minor (feat/perf), patch (fix/refactor), or no-bump

### `sync-versions.ts`

Synchronizes version from root package.json to all workspace packages.

- Preserves package.json formatting
- Updates all packages in the monorepo to match root version

## Manual Release Guide

```bash
# Use default (minor) version bump
./scripts/quick-release.sh

# Specify version bump type
./scripts/quick-release.sh patch
./scripts/quick-release.sh major
./scripts/quick-release.sh 1.2.3
```

## Manual Release Steps

Verify code quality and correctness:

```bash
yarn prettier:check
yarn typecheck
yarn test
yarn typedoc
```

Prepare for release:

```bash
yarn clean
yarn build
```

Update version in root `package.json`:

```bash
npm version --no-git-tag-version <major|minor|patch|pre*|{version}>
```

Synchronize versions across all packages:

```bash
./scripts/sync-versions.ts
```

Perform a dry run:

```bash
yarn workspaces foreach -A --no-private npm publish --dry-run
```

Login with NPM:

```bash
yarn npm login
```

Publish to NPM:

```bash
yarn workspaces foreach -A --no-private npm publish
```

Create a Git tag and push to remote:

```bash
git add .
git commit -m "chore: release v$(node -p "require('./package.json').version")"
git tag v$(node -p "require('./package.json').version")
git push origin --tags
git push origin master
```
