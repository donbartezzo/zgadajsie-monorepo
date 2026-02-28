import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly isDark = signal(false);

  constructor() {
    const saved = this.getStorage();
    if (saved === 'dark') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  setTheme(mode: ThemeMode): void {
    const html = this.document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark');
      this.isDark.set(true);
    } else {
      html.classList.remove('dark');
      this.isDark.set(false);
    }
    try {
      localStorage.setItem('theme', mode);
    } catch {
      /* SSR / storage unavailable */
    }
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private getStorage(): string | null {
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  }
}
