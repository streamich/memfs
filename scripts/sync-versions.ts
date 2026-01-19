#!/usr/bin/env node --experimental-strip-types --no-warnings=ExperimentalWarning

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Syncs the version from the root package.json to all workspace packages.
 * Preserves the original formatting of package.json files.
 */
function syncVersions() {
  // Read root package.json to get the version
  const rootPackagePath = path.join(__dirname, '..', 'package.json');
  const rootPackageContent = fs.readFileSync(rootPackagePath, 'utf8');
  const rootPackage = JSON.parse(rootPackageContent);
  const targetVersion = rootPackage.version;

  console.log(`📦 Root version: ${targetVersion}`);
  console.log('');

  // Find all workspace package.json files
  const packagesDir = path.join(__dirname, '..', 'packages');
  const workspaceDirs = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const workspacePackages = workspaceDirs
    .map(dir => path.join(packagesDir, dir, 'package.json'))
    .filter(packagePath => fs.existsSync(packagePath));

  let updatedCount = 0;
  let skippedCount = 0;

  for (const packagePath of workspacePackages) {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageData = JSON.parse(packageContent);
    const currentVersion = packageData.version;

    if (currentVersion === targetVersion) {
      console.log(`⏭️  ${packageData.name}: already at ${targetVersion}`);
      skippedCount++;
      continue;
    }

    // Use regex to replace the version while preserving formatting
    const updatedContent = packageContent.replace(/"version":\s*"[^"]*"/, `"version": "${targetVersion}"`);

    fs.writeFileSync(packagePath, updatedContent, 'utf8');
    console.log(`✅ ${packageData.name}: ${currentVersion} → ${targetVersion}`);
    updatedCount++;
  }

  console.log('');
  console.log(`📊 Summary: ${updatedCount} updated, ${skippedCount} skipped`);
}

try {
  syncVersions();
} catch (error) {
  console.error('❌ Error syncing versions:', error);
  process.exit(1);
}
