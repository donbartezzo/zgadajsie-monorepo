import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DictionaryService } from './dictionary.service';
import { City } from '@zgadajsie/shared';

const STORAGE_KEY = 'zs.city.selected';

interface StoredCity {
  slug: string;
  name: string;
  savedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CityContextService {
  private readonly router = inject(Router);
  private readonly dictionary = inject(DictionaryService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly currentCitySignal = signal<StoredCity | null>(this.loadFromStorage());
  private readonly citiesSignal = signal<City[]>([]);
  private pendingUrlSlug: string | null = null;

  readonly citySlug = computed<string | null>(() => this.currentCitySignal()?.slug ?? null);

  readonly cityName = computed<string | null>(() => {
    const current = this.currentCitySignal();
    if (!current) {
      return null;
    }
    if (current.name) {
      return current.name;
    }
    const cached = this.citiesSignal().find((c) => c.slug === current.slug);
    return cached?.name ?? null;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const slug = this.extractCitySlug(this.router.routerState.snapshot.root);
        if (slug) {
          this.handleUrlSlug(slug);
        }
      });

    this.dictionary.getCities().subscribe((cities) => {
      this.citiesSignal.set(cities);
      this.reconcileWithDictionary();
    });
  }

  selectCity(city: { slug: string; name: string }): void {
    const stored: StoredCity = { ...city, savedAt: new Date().toISOString() };
    this.currentCitySignal.set(stored);
    this.saveToStorage(stored);
  }

  clearCity(): void {
    this.currentCitySignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // localStorage unavailable
      }
    }
  }

  private extractCitySlug(root: ActivatedRouteSnapshot): string | null {
    let node: ActivatedRouteSnapshot | null = root;
    while (node) {
      const slug = node.paramMap.get('citySlug');
      if (slug) {
        return slug;
      }
      node = node.firstChild;
    }
    return null;
  }

  private findCityBySlug(slug: string): City | null {
    const cities = this.citiesSignal();
    if (cities.length === 0) {
      return null;
    }
    const match = cities.find((c) => c.slug === slug);
    if (!match) {
      return null;
    }
    return match;
  }

  private handleUrlSlug(slug: string): void {
    const match = this.findCityBySlug(slug);
    if (!match) {
      this.pendingUrlSlug = slug;
      return;
    }
    const current = this.currentCitySignal();
    if (current?.slug === match.slug && current.name === match.name) {
      return;
    }
    this.selectCity({ slug: match.slug, name: match.name });
  }

  private reconcileWithDictionary(): void {
    if (this.pendingUrlSlug) {
      const pending = this.pendingUrlSlug;
      this.pendingUrlSlug = null;
      this.handleUrlSlug(pending);
    }

    const current = this.currentCitySignal();
    if (!current) {
      return;
    }
    const match = this.findCityBySlug(current.slug);
    if (!match) {
      this.clearCity();
      return;
    }
    if (current.name !== match.name) {
      this.selectCity({ slug: match.slug, name: match.name });
    }
  }

  private loadFromStorage(): StoredCity | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as StoredCity;
      if (!parsed.slug) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveToStorage(city: StoredCity): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
    } catch {
      // localStorage unavailable
    }
  }
}
