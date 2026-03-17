/**
 * Semantyczne kolory zgodne z tokenami z _tokens.scss i tailwind.config.js.
 * Używane jako źródło prawdy dla wariantów kolorystycznych w komponentach.
 */
export type SemanticColor = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

/**
 * Mapowanie semantycznych kolorów na klasy Tailwind dla różnych zastosowań.
 */
export const SEMANTIC_COLOR_CLASSES = {
  // Tła gradientowe (hero sections)
  gradient: {
    primary: 'from-primary-400 to-primary-600',
    success: 'from-success-400 to-success-600',
    danger: 'from-danger-400 to-danger-600',
    warning: 'from-warning-400 to-warning-600',
    info: 'from-info-400 to-info-600',
    neutral: 'from-neutral-400 to-neutral-600',
  },
  // Tekst/ikony (akcenty)
  text: {
    primary: 'text-primary-500',
    success: 'text-success-400',
    danger: 'text-danger-400',
    warning: 'text-warning-400',
    info: 'text-info-400',
    neutral: 'text-neutral-500',
  },
  // Przyciski (solidne tło)
  button: {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    success: 'bg-success-400 hover:bg-success-500 text-white',
    danger: 'bg-danger-400 hover:bg-danger-500 text-white',
    warning: 'bg-warning-400 hover:bg-warning-500 text-white',
    info: 'bg-info-400 hover:bg-info-500 text-white',
    neutral: 'bg-neutral-400 hover:bg-neutral-500 text-white',
  },
} as const;
