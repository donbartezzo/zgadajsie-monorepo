import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { of, Subject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { CityContextService } from './city-context.service';
import { DictionaryService } from './dictionary.service';

const STORAGE_KEY = 'zs.city.selected';

const makeSnapshot = (citySlug: string | null): ActivatedRouteSnapshot => {
  const child = citySlug
    ? ({
        paramMap: { get: (key: string) => (key === 'citySlug' ? citySlug : null) },
        firstChild: null,
      } as unknown as ActivatedRouteSnapshot)
    : null;
  return {
    paramMap: { get: () => null },
    firstChild: child,
  } as unknown as ActivatedRouteSnapshot;
};

describe('CityContextService', () => {
  let events$: Subject<NavigationEnd>;
  let routerState: { snapshot: RouterStateSnapshot };
  let routerMock: Pick<Router, 'events' | 'routerState'>;

  const emitNavigation = (citySlug: string | null) => {
    routerState.snapshot = { root: makeSnapshot(citySlug) } as RouterStateSnapshot;
    events$.next(new NavigationEnd(1, '/', '/'));
  };

  const setup = (options?: { initialUrlCitySlug?: string | null }) => {
    events$ = new Subject<NavigationEnd>();
    routerState = {
      snapshot: { root: makeSnapshot(options?.initialUrlCitySlug ?? null) } as RouterStateSnapshot,
    };
    routerMock = {
      events: events$.asObservable(),
      routerState: routerState as Router['routerState'],
    };

    TestBed.configureTestingModule({
      providers: [
        CityContextService,
        { provide: Router, useValue: routerMock },
        {
          provide: DictionaryService,
          useValue: {
            getCities: () =>
              of([
                { slug: 'zielona-gora', name: 'Zielona Góra', isActive: true },
                { slug: 'wroclaw', name: 'Wrocław', isActive: true },
              ]),
          },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    return TestBed.inject(CityContextService);
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('inicjalizacja', () => {
    it('zwraca null gdy brak URL i brak localStorage', () => {
      const service = setup();
      expect(service.citySlug()).toBeNull();
      expect(service.cityName()).toBeNull();
    });

    it('hydrate ze startupowego URL gdy aplikacja startuje na /w/:citySlug', () => {
      const service = setup({ initialUrlCitySlug: 'wroclaw' });
      expect(service.citySlug()).toBe('wroclaw');
      expect(service.cityName()).toBe('Wrocław');
    });

    it('hydrate z localStorage gdy nie ma URL', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slug: 'zielona-gora', name: 'Zielona Góra', savedAt: '2026-01-01' }),
      );
      const service = setup();
      expect(service.citySlug()).toBe('zielona-gora');
      expect(service.cityName()).toBe('Zielona Góra');
    });
  });

  describe('URL implicit persist', () => {
    it('ustawia bieżące miasto przy wejściu na /w/:citySlug', () => {
      const service = setup();
      emitNavigation('wroclaw');
      expect(service.citySlug()).toBe('wroclaw');
      expect(service.cityName()).toBe('Wrocław');
    });

    it('persistuje URL slug do localStorage', () => {
      const service = setup();
      emitNavigation('wroclaw');
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      expect(stored.slug).toBe('wroclaw');
      expect(service.citySlug()).toBe('wroclaw');
    });

    it('nadpisuje wcześniejszą ręczną selekcję przy wejściu na inne miasto z URL', () => {
      const service = setup();
      service.selectCity({ slug: 'zielona-gora', name: 'Zielona Góra' });
      emitNavigation('wroclaw');
      expect(service.citySlug()).toBe('wroclaw');
    });

    it('zachowuje miasto po opuszczeniu /w/:citySlug (URL bez slug nie czyści)', () => {
      const service = setup();
      emitNavigation('wroclaw');
      emitNavigation(null);
      expect(service.citySlug()).toBe('wroclaw');
    });

    it('nie re-zapisuje gdy URL slug = bieżące', () => {
      setup();
      emitNavigation('wroclaw');
      const firstSavedAt = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null').savedAt;
      emitNavigation('wroclaw');
      const secondSavedAt = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null').savedAt;
      expect(secondSavedAt).toBe(firstSavedAt);
    });
  });

  describe('selectCity', () => {
    it('ustawia bieżące i zapisuje do localStorage', () => {
      const service = setup();
      service.selectCity({ slug: 'wroclaw', name: 'Wrocław' });
      expect(service.citySlug()).toBe('wroclaw');
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      expect(stored.slug).toBe('wroclaw');
    });
  });

  describe('clearCity', () => {
    it('czyści bieżące i localStorage', () => {
      const service = setup();
      service.selectCity({ slug: 'wroclaw', name: 'Wrocław' });
      service.clearCity();
      expect(service.citySlug()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('cityName', () => {
    it('zwraca nazwę z bieżącego miasta', () => {
      const service = setup();
      service.selectCity({ slug: 'wroclaw', name: 'Wrocław' });
      expect(service.cityName()).toBe('Wrocław');
    });

    it('uzupełnia brakującą nazwę ze słownika', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slug: 'zielona-gora', name: '', savedAt: '2026-01-01' }),
      );
      const service = setup();
      expect(service.cityName()).toBe('Zielona Góra');
    });

    it('zwraca null gdy brak kontekstu', () => {
      const service = setup();
      expect(service.cityName()).toBeNull();
    });
  });
});
