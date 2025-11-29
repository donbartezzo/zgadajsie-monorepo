import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'detect';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.applyDefaultTheme();
  }

  private get body(): HTMLBodyElement {
    return this.document.body as HTMLBodyElement;
  }

  applyDefaultTheme(): void {
    this.setTheme('light');
    this.setBackground('default');
    this.setHighlight('blue');
  }

  setTheme(mode: ThemeMode): void {
    const body = this.body;
    body.classList.remove('theme-light', 'theme-dark', 'detect-theme');

    const themeClass = mode === 'detect' ? 'detect-theme' : `theme-${mode}`;
    body.classList.add(themeClass);
  }

  setBackground(name: string): void {
    this.body.setAttribute('data-background', name);
  }

  setHighlight(name: string): void {
    this.body.setAttribute('data-highlight', name);

    const link = this.document.querySelector<HTMLLinkElement>('link.page-highlight');
    if (link) {
      link.href = `styles/highlights/highlight_${name}.css`;
    }
  }
}
