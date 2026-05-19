import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DictionaryService } from './dictionary.service';

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
  private readonly citiesSignal = signal<{ slug: string; name: string }[]>([]);

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
          this.persistFromUrl(slug);
        }
      });

    this.dictionary.getCities().subscribe((cities) => {
      this.citiesSignal.set(cities);
      this.hydrateCityNameIfMissing();
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

  private persistFromUrl(slug: string): void {
    const current = this.currentCitySignal();
    if (current?.slug === slug) {
      return;
    }
    const name = this.citiesSignal().find((c) => c.slug === slug)?.name ?? '';
    this.selectCity({ slug, name });
  }

  private hydrateCityNameIfMissing(): void {
    const current = this.currentCitySignal();
    if (!current || current.name) {
      return;
    }
    const name = this.citiesSignal().find((c) => c.slug === current.slug)?.name;
    if (name) {
      this.selectCity({ slug: current.slug, name });
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
