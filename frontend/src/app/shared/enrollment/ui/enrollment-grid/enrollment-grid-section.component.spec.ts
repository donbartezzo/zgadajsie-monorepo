import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { EnrollmentGridSectionComponent } from './enrollment-grid-section.component';
import { SLOT_STATUS_CONFIG } from '../../slot-status-config';
import { SlotGroup } from './enrollment-grid-item.component';

function makeGroup(occupiedCount: number, totalSlots: number): SlotGroup {
  return { role: null, items: [], occupiedCount, totalSlots };
}

describe('EnrollmentGridSectionComponent — computed signals', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [EnrollmentGridSectionComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(EnrollmentGridSectionComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(EnrollmentGridSectionComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('config', SLOT_STATUS_CONFIG.assigned);
    fixture.detectChanges();
    return { fixture, c };
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('totalOccupied()', () => {
    it('zwraca 0 gdy brak grup', () => {
      const { c } = create();
      expect(c.totalOccupied()).toBe(0);
    });

    it('sumuje occupiedCount z wielu grup', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('groups', [makeGroup(3, 5), makeGroup(2, 5)]);
      expect(c.totalOccupied()).toBe(5);
    });
  });

  describe('totalSlots()', () => {
    it('zwraca 0 gdy brak grup', () => {
      const { c } = create();
      expect(c.totalSlots()).toBe(0);
    });

    it('sumuje totalSlots z wielu grup', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('groups', [makeGroup(1, 5), makeGroup(2, 7)]);
      expect(c.totalSlots()).toBe(12);
    });
  });

  describe('colors()', () => {
    it('zwraca poprawne klasy kolorów dla konfiguracji assigned', () => {
      const { c } = create();
      expect(c.colors()).toBeDefined();
      expect(c.colors().headerBg).toBeTruthy();
    });

    it('zwraca inne klasy dla konfiguracji pending', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('config', SLOT_STATUS_CONFIG.pending);
      const assignedColors = SLOT_STATUS_CONFIG.assigned;
      const pendingColors = SLOT_STATUS_CONFIG.pending;
      expect(c.colors()).not.toEqual(assignedColors);
      expect(c.colors()).toBeDefined();
    });
  });
});
