import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { EnrollmentGridSectionComponent } from './enrollment-grid-section.component';
import { SLOT_STATUS_CONFIG } from '../../slot-status-config';
import { SlotGroup } from './enrollment-grid-item/enrollment-grid-item.component';

function makeGroup(occupiedCount: number, totalSlots: number): SlotGroup {
  return { role: null, items: [], occupiedCount, totalSlots };
}

describe('EnrollmentGridSectionComponent - computed signals', () => {
  function create(count = 0) {
    TestBed.configureTestingModule({
      imports: [EnrollmentGridSectionComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(EnrollmentGridSectionComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(EnrollmentGridSectionComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('config', SLOT_STATUS_CONFIG.assigned);
    fixture.componentRef.setInput('count', count);
    fixture.detectChanges();
    return { fixture, c };
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('count()', () => {
    it('zwraca 0 gdy count ustawiony na 0', () => {
      const { c } = create(0);
      expect(c.count()).toBe(0);
    });

    it('zwraca wartość przekazaną przez input', () => {
      const { fixture, c } = create(5);
      fixture.componentRef.setInput('count', 5);
      expect(c.count()).toBe(5);
    });
  });

  describe('groups()', () => {
    it('zwraca pustą tablicę domyślnie', () => {
      const { c } = create();
      expect(c.groups()).toEqual([]);
    });

    it('zwraca ustawione grupy', () => {
      const { fixture, c } = create();
      const groups = [makeGroup(3, 5), makeGroup(2, 5)];
      fixture.componentRef.setInput('groups', groups);
      expect(c.groups()).toEqual(groups);
    });
  });

  describe('colors()', () => {
    it('zwraca poprawne klasy kolorów dla konfiguracji assigned', () => {
      const { c } = create();
      expect(c.colors()).toBeDefined();
      expect(c.colors().textClass).toBeTruthy();
    });

    it('zwraca inne klasy dla konfiguracji pending', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('config', SLOT_STATUS_CONFIG.pending);
      const assignedColors = SLOT_STATUS_CONFIG.assigned;
      expect(c.colors()).not.toEqual(assignedColors);
      expect(c.colors()).toBeDefined();
    });
  });
});
