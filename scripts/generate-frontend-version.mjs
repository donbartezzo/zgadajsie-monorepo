import { execSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
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

function getEnvironmentName() {
  const targetConfiguration = process.env.NX_TASK_TARGET_CONFIGURATION?.trim();

  if (
    targetConfiguration === 'local' ||
    targetConfiguration === 'dev' ||
    targetConfiguration === 'prod'
  ) {
    return targetConfiguration;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'prod';
  }

  return 'local';
}

function getVersion() {
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

  const environmentName = getEnvironmentName();

  try {
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return sha ? `${environmentName}-${sha}` : environmentName;
  } catch {
    return environmentName;
  }
}

mkdirSync(targetDir, { recursive: true });

if (shouldWriteVersionFile()) {
  writeFileSync(targetFile, `export const APP_VERSION = '${getVersion()}';\n`);
} else {
  // Usun plik wersji gdy nie powinien byc generowany, aby uniknac wyswietlania starej wersji
  try {
    unlinkSync(targetFile);
  } catch {
    // Plik nie istnieje - ignoruj
  }
}
