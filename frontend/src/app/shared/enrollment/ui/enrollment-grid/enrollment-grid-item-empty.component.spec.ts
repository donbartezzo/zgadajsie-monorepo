import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { EnrollmentGridItemEmptyComponent } from './enrollment-grid-item-empty.component';

describe('EnrollmentGridItemEmptyComponent — computed signals', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [EnrollmentGridItemEmptyComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });
    const fixture = TestBed.createComponent(EnrollmentGridItemEmptyComponent);
    const c = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, c };
  }

  describe('resolvedIcon()', () => {
    it('domyślnie zwraca "plus" (variant free)', () => {
      const { c } = create();
      expect(c.resolvedIcon()).toBe('plus');
    });

    it('zwraca "user-plus" dla variant add', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'add');
      expect(c.resolvedIcon()).toBe('user-plus');
    });

    it('zwraca "lock" dla variant locked', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'locked');
      expect(c.resolvedIcon()).toBe('lock');
    });

    it('własna ikona nadpisuje domyślną', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('icon', 'star');
      expect(c.resolvedIcon()).toBe('star');
    });
  });

  describe('resolvedLabel()', () => {
    it('domyślnie zwraca "Wolne miejsce" (variant free)', () => {
      const { c } = create();
      expect(c.resolvedLabel()).toBe('Wolne miejsce');
    });

    it('zwraca "Dodaj nowego" dla variant add', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'add');
      expect(c.resolvedLabel()).toBe('Dodaj nowego');
    });

    it('zwraca "Zablokowane miejce" dla variant locked', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'locked');
      expect(c.resolvedLabel()).toBe('Zablokowane miejce');
    });

    it('własna etykieta nadpisuje domyślną', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('label', 'Zarezerwowane');
      expect(c.resolvedLabel()).toBe('Zarezerwowane');
    });
  });

  describe('iconClass()', () => {
    it('free → text-primary-400', () => {
      const { c } = create();
      expect(c.iconClass()).toContain('text-primary-400');
    });

    it('locked → text-warning-400', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'locked');
      expect(c.iconClass()).toContain('text-warning-400');
    });
  });

  describe('nameClass()', () => {
    it('free → text-primary-600', () => {
      const { c } = create();
      expect(c.nameClass()).toContain('text-primary-600');
    });

    it('locked → text-warning-600', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'locked');
      expect(c.nameClass()).toContain('text-warning-600');
    });
  });

  describe('avatarContainerClass()', () => {
    it('free → border-primary-200', () => {
      const { c } = create();
      expect(c.avatarContainerClass()).toContain('border-primary-200');
    });

    it('locked → border-warning-300', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'locked');
      expect(c.avatarContainerClass()).toContain('border-warning-300');
    });

    it('add → border-primary-300', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('variant', 'add');
      expect(c.avatarContainerClass()).toContain('border-primary-300');
    });
  });
});
