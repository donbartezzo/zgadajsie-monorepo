// Single source of truth for foundation palette hex values: ./color-palette.json.
// Imported by: tailwind.config.js (require), libs/email/src/theme.ts, design-system.component.ts.
// Auto-generates: frontend/src/styles/_tokens.scss (via scripts/generate-color-tokens.mjs).
// See docs/design-tokens.md for full architecture.
import paletteJson from './color-palette.json';

export const COLOR_PALETTE = paletteJson;

export type ColorPalette = typeof COLOR_PALETTE;
