import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class AppTitleService {
  private readonly title = inject(Title);
  private static readonly APP_NAME = 'ZgadajSie.pl';
  private static readonly RESOLVED_TITLE_SEPARATOR = ' | ';

  setResolvedTitle(...parts: Array<string | null | undefined>): void {
    this.title.setTitle(AppTitleService.formatDocumentTitle(...parts));
  }

  setRouteResolvedTitle(title: string | null | undefined): void {
    const trimmedTitle = title?.trim();

    if (!trimmedTitle || trimmedTitle === AppTitleService.APP_NAME) {
      this.title.setTitle(AppTitleService.APP_NAME);
      return;
    }

    this.setResolvedTitle(trimmedTitle);
  }

  static buildRawResolvedTitle(...parts: Array<string | null | undefined>): string {
    const title = parts
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(AppTitleService.RESOLVED_TITLE_SEPARATOR);

    if (!title || title === AppTitleService.APP_NAME) {
      return '';
    }

    return title;
  }

  private static formatDocumentTitle(...parts: Array<string | null | undefined>): string {
    const resolvedTitle = AppTitleService.buildRawResolvedTitle(...parts);

    if (!resolvedTitle) {
      return AppTitleService.APP_NAME;
    }

    return `${resolvedTitle}${AppTitleService.RESOLVED_TITLE_SEPARATOR}${AppTitleService.APP_NAME}`;
  }
}
