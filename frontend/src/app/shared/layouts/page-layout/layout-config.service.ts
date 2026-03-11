import { Injectable, signal, TemplateRef } from '@angular/core';

export interface LayoutConfig {
  coverImageUrl: string;
  overlayTpl: TemplateRef<unknown> | null;
  badgeTpl: TemplateRef<unknown> | null;
  miniBarTpl: TemplateRef<unknown> | null;
  heroExtraTpl: TemplateRef<unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LayoutConfigService {
  readonly coverImageUrl = signal('');
  readonly overlayTpl = signal<TemplateRef<unknown> | null>(null);
  readonly badgeTpl = signal<TemplateRef<unknown> | null>(null);
  readonly miniBarTpl = signal<TemplateRef<unknown> | null>(null);
  readonly heroExtraTpl = signal<TemplateRef<unknown> | null>(null);

  reset(): void {
    this.coverImageUrl.set('');
    this.overlayTpl.set(null);
    this.badgeTpl.set(null);
    this.miniBarTpl.set(null);
    this.heroExtraTpl.set(null);
  }
}
