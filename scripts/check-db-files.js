#!/usr/bin/env node
/**
 * Pre-commit hook to prevent database files from being committed
 * This script checks for SQLite database files that should not be in git
 */

import { execSync } from 'child_process';

// Get list of staged files
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(f => f);

// Check for database file patterns
const forbiddenPatterns = /\.(db|db-shm|db-wal)$/i;
let hasForbidden = false;

for (const file of stagedFiles) {
  if (forbiddenPatterns.test(file)) {
    console.error(`ERROR: Database file detected in commit: ${file}`);
    console.error('Database files should not be committed. Please add them to .gitignore.');
    hasForbidden = true;
  }
}

if (hasForbidden) {
  process.exit(1);
}

process.exit(0);
