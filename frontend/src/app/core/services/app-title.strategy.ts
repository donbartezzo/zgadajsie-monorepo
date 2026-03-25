import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { AppTitleService } from './app-title.service';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly appTitle = inject(AppTitleService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const resolvedTitle = this.resolveResolvedTitle(snapshot.root);
    this.appTitle.setRouteResolvedTitle(resolvedTitle);
  }

  private resolveResolvedTitle(snapshot: ActivatedRouteSnapshot): string | null {
    const chain = this.getSnapshotChain(snapshot);

    return this.findFirstString(chain, 'resolvedTitle') ?? this.findFirstString(chain, 'title');
  }

  private getSnapshotChain(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot[] {
    const chain: ActivatedRouteSnapshot[] = [];
    let current: ActivatedRouteSnapshot | null = snapshot;

    while (current.firstChild) {
      current = current.firstChild;
    }

    while (current) {
      chain.push(current);
      current = current.parent;
    }

    return chain;
  }

  private findFirstString(
    chain: ActivatedRouteSnapshot[],
    key: 'resolvedTitle' | 'title',
  ): string | null {
    for (const snapshot of chain) {
      const value = snapshot.data[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }
}
