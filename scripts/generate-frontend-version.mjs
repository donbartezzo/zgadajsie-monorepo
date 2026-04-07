import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const targetFile = resolve('frontend/src/environments/version.ts');
const targetDir = dirname(targetFile);

function shouldWriteVersionFile() {
  if (process.env.GENERATE_FRONTEND_VERSION === 'true') {
    return true;
  }

  if (process.env.CI === 'true') {
    return true;
  }

  return false;
}

function getConfiguredVersion() {
  const configuredVersion = process.env.FRONTEND_VERSION?.trim();

  return configuredVersion || null;
}

function getGitVersion() {
  try {
    const tag = execSync('git describe --tags --match "v[0-9]*.[0-9]*.[0-9]*" --abbrev=0', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (tag) {
      return tag;
    }
  } catch {
    // Ignore and use fallback below.
  }

  try {
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return sha || null;
  } catch {
    return null;
  }
}

function getVersion() {
  const configuredVersion = getConfiguredVersion();

  if (configuredVersion) {
    return configuredVersion;
  }

  const gitVersion = getGitVersion();

  if (gitVersion) {
    return gitVersion;
  }

  return 'unknown';
}

mkdirSync(targetDir, { recursive: true });

if (shouldWriteVersionFile()) {
  writeFileSync(targetFile, `export const APP_VERSION = '${getVersion()}';\n`);
} else if (!existsSync(targetFile)) {
  // Stworz plik tylko jesli nie istnieje, aby uniknac bledow importu
  writeFileSync(targetFile, `export const APP_VERSION = '';\n`);
}
