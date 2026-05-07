// Generuje frontend/src/styles/_tokens.scss z dwóch JSON-ów:
//   - libs/src/lib/constants/color-palette.json (foundation hex)
//   - libs/src/lib/constants/semantic-color-mapping.json (semantic → foundation)
//
// Użycie: pnpm tokens:generate
// Auto-uruchamiany przed `nx build frontend` i `nx serve frontend` (dependsOn).
//
// Format wyjścia: RGB space-separated, dla wsparcia Tailwind opacity (bg-primary-500/30).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PALETTE_PATH = resolve(ROOT, 'libs/src/lib/constants/color-palette.json');
const MAPPING_PATH = resolve(ROOT, 'libs/src/lib/constants/semantic-color-mapping.json');
const OUTPUT_PATH = resolve(ROOT, 'frontend/src/styles/_tokens.scss');

const SEMANTIC_LABELS = {
  primary: 'PRIMARY (mint) - Brand, CTA, przyciski, linki, akcenty',
  neutral: 'NEUTRAL (dark/gray) - Tła, tekst, bordery, ikony muted',
  success: 'SUCCESS (green) - Pozytywne statusy, potwierdzenia',
  warning: 'WARNING (orange) - Ostrzeżenia, countdown urgent',
  danger: 'DANGER (red) - Błędy, usuwanie, destrukcyjne akcje',
  info: 'INFO (blue) - Informacje, focus ring, linki informacyjne',
};

function hexToRgbTriplet(hex) {
  const value = hex.replace(/^#/, '');
  if (value.length !== 6) {
    throw new Error(`Niepoprawny hex (oczekiwano 6 znaków): ${hex}`);
  }
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function buildTokens() {
  const palette = readJson(PALETTE_PATH);
  const mapping = readJson(MAPPING_PATH);

  const lines = [];
  lines.push('// ────────────────────────────────────────────────────────────');
  lines.push('// AUTO-GENERATED — DO NOT EDIT MANUALLY');
  lines.push('//');
  lines.push('// Źródła:');
  lines.push('//   libs/src/lib/constants/color-palette.json');
  lines.push('//   libs/src/lib/constants/semantic-color-mapping.json');
  lines.push('//');
  lines.push('// Regeneracja: pnpm tokens:generate');
  lines.push('// Auto-run przed nx build/serve frontend (dependsOn).');
  lines.push('//');
  lines.push('// Format: RGB space-separated dla Tailwind opacity modifiers (bg-primary-500/30).');
  lines.push('// Dokumentacja: docs/design-tokens.md');
  lines.push('// ────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(':root {');

  const semanticEntries = Object.entries(mapping);
  semanticEntries.forEach(([semantic, foundation], index) => {
    const foundationPalette = palette[foundation];
    if (!foundationPalette) {
      throw new Error(`Brak palety foundation "${foundation}" dla semantic "${semantic}"`);
    }

    const label = SEMANTIC_LABELS[semantic] ?? `${semantic.toUpperCase()} (${foundation})`;
    lines.push('  // ══════════════════════════════════════════════════════════');
    lines.push(`  // ${label}`);
    lines.push('  // ══════════════════════════════════════════════════════════');

    for (const [shade, hex] of Object.entries(foundationPalette)) {
      lines.push(`  --color-${semantic}-${shade}: ${hexToRgbTriplet(hex)};`);
    }

    if (index < semanticEntries.length - 1) {
      lines.push('');
    }
  });

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

const output = buildTokens();
writeFileSync(OUTPUT_PATH, output, 'utf-8');
console.log(`[tokens] wygenerowano ${OUTPUT_PATH}`);
