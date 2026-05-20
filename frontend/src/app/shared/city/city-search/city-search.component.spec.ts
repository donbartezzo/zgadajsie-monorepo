import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { of } from 'rxjs';
import { CitySearchComponent } from './city-search.component';
import { DictionaryService } from '../../../core/services/dictionary.service';

const CITIES = [
  { slug: 'zielona-gora', name: 'Zielona Góra', isActive: true },
  { slug: 'wroclaw', name: 'Wrocław', isActive: true },
  { slug: 'krakow', name: 'Kraków', isActive: true },
  { slug: 'lodz', name: 'Łódź', isActive: false },
];

const makeDictionary = () => ({ getCities: () => of(CITIES) });

@Component({
  standalone: true,
  imports: [CitySearchComponent],
  template: `<app-city-search placeholder="Szukaj miasta" />`,
})
class TestWrapperComponent {}

describe('CitySearchComponent', () => {
  let fixture: ComponentFixture<TestWrapperComponent>;
  let component: CitySearchComponent;

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [TestWrapperComponent],
      providers: [{ provide: DictionaryService, useValue: makeDictionary() }],
    }).compileComponents();
    fixture = TestBed.createComponent(TestWrapperComponent);
    component = fixture.debugElement.query(By.directive(CitySearchComponent)).componentInstance;
    fixture.detectChanges();
  };

  describe('filtrowanie', () => {
    beforeEach(() => setup());

    it('zwraca tylko aktywne miasta bez query', () => {
      const filtered = (component as any).filteredCities();
      expect(filtered.every((c: any) => c.isActive)).toBe(true);
      expect(filtered.find((c: any) => c.slug === 'lodz')).toBeUndefined();
    });

    it('filtruje locale-aware — "gora" matchuje "Zielona Góra"', fakeAsync(() => {
      (component as any).query.set('gora');
      tick();
      const filtered = (component as any).filteredCities();
      expect(filtered.some((c: any) => c.slug === 'zielona-gora')).toBe(true);
    }));

    it('filtruje locale-aware — "wrocl" matchuje "Wrocław"', fakeAsync(() => {
      (component as any).query.set('wrocl');
      tick();
      expect((component as any).filteredCities().some((c: any) => c.slug === 'wroclaw')).toBe(true);
    }));
  });

  describe('wybór miasta', () => {
    beforeEach(() => setup());

    it('emituje citySelected z poprawnym slug i name', () => {
      const emitted: any[] = [];
      component.citySelected.subscribe((v) => emitted.push(v));
      (component as any).selectCity(CITIES[0]);
      expect(emitted).toEqual([{ slug: 'zielona-gora', name: 'Zielona Góra' }]);
    });

    it('zamyka dropdown po wyborze', () => {
      (component as any).isOpen.set(true);
      (component as any).selectCity(CITIES[0]);
      expect((component as any).isOpen()).toBe(false);
    });
  });

  describe('klawiatura', () => {
    beforeEach(() => setup());

    it('ArrowDown zwiększa activeIndex', () => {
      (component as any).filteredCities(); // initialize
      (component as any).onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect((component as any).activeIndex()).toBe(0);
    });

    it('Escape zamyka dropdown', () => {
      (component as any).isOpen.set(true);
      (component as any).onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect((component as any).isOpen()).toBe(false);
    });
  });
});
