// Mapping semantycznych nazw kolorów na palety foundation.
// Single source of truth dla relacji semantic → foundation, używany przez:
//   - scripts/generate-color-tokens.mjs (generuje _tokens.scss)
//   - libs/email/src/theme.ts (EMAIL_THEME)
//   - frontend design-system.component.ts (SEMANTIC_META)
import mappingJson from './semantic-color-mapping.json';

export const SEMANTIC_COLOR_MAPPING = mappingJson;

export type SemanticColorName = keyof typeof SEMANTIC_COLOR_MAPPING;
