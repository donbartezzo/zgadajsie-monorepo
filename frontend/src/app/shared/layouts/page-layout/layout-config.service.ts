import { Injectable, signal, TemplateRef } from '@angular/core';

export interface LayoutConfig {
  coverImageUrl: string;
  contentBgClass: string;
  titleText: string;
  extraTpl: TemplateRef<unknown> | null;
  stickyTpl: TemplateRef<unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LayoutConfigService {
  static readonly DEFAULT_CONTENT_BG = 'bg-background';

  readonly coverImageUrl = signal('');
  readonly contentBgClass = signal(LayoutConfigService.DEFAULT_CONTENT_BG);
  readonly titleText = signal('');
  readonly extraTpl = signal<TemplateRef<unknown> | null>(null);
  readonly stickyTpl = signal<TemplateRef<unknown> | null>(null);

  reset(): void {
    this.coverImageUrl.set('');
    this.contentBgClass.set(LayoutConfigService.DEFAULT_CONTENT_BG);
    this.titleText.set('');
    this.extraTpl.set(null);
    this.stickyTpl.set(null);
  }
}
