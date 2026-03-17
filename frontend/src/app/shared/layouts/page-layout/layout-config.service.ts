import { Injectable, signal, TemplateRef } from '@angular/core';

export interface LayoutConfig {
  coverImageUrl: string;
  contentClass: string;
  titleText: string;
  extraTpl: TemplateRef<unknown> | null;
  stickyTpl: TemplateRef<unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LayoutConfigService {
  static readonly DEFAULT_CONTENT = 'bg-neutral-100';

  readonly coverImageUrl = signal('');
  readonly contentClass = signal(LayoutConfigService.DEFAULT_CONTENT);
  readonly titleText = signal('');
  readonly extraTpl = signal<TemplateRef<unknown> | null>(null);
  readonly stickyTpl = signal<TemplateRef<unknown> | null>(null);

  reset(): void {
    this.coverImageUrl.set('');
    this.contentClass.set(LayoutConfigService.DEFAULT_CONTENT);
    this.titleText.set('');
    this.extraTpl.set(null);
    this.stickyTpl.set(null);
  }
}
