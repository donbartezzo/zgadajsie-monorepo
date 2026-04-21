import { Injectable, signal, TemplateRef } from '@angular/core';

export type HeroVariant = 'compact' | 'extended' | 'only-mini-bar';

export interface LayoutConfig {
  coverImageUrl: string;
  heroVariant: HeroVariant;
  contentClass: string;
  title: string;
  subtitle: string;
  subtitleTemplate: TemplateRef<unknown> | null;
  stickyTemplate: TemplateRef<unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LayoutConfigService {
  static readonly DEFAULT_CONTENT = 'bg-neutral-100';

  readonly coverImageUrl = signal('');
  readonly heroVariant = signal<HeroVariant>('compact');
  readonly contentClass = signal(LayoutConfigService.DEFAULT_CONTENT);
  readonly title = signal('');
  readonly subtitle = signal('');
  readonly subtitleTemplate = signal<TemplateRef<unknown> | null>(null);
  readonly stickyTemplate = signal<TemplateRef<unknown> | null>(null);
  readonly isReady = signal(false);

  reset(): void {
    this.isReady.set(false);
    this.coverImageUrl.set('');
    this.heroVariant.set('compact');
    this.contentClass.set(LayoutConfigService.DEFAULT_CONTENT);
    this.title.set('');
    this.subtitle.set('');
    this.subtitleTemplate.set(null);
    this.stickyTemplate.set(null);
  }

  markReady(): void {
    this.isReady.set(true);
  }
}
