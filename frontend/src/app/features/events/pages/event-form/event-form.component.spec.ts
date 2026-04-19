import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EventFormComponent } from './event-form.component';
import { EventService } from '../../../../core/services/event.service';
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { GeocodeService } from '../../../../core/services/geocode.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';

@Pipe({ name: 'transloco', standalone: true })
class MockTranslocoPipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

function futureDate(daysAhead = 1): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

const mockEventService = {
  getEvent: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  getEventForDuplication: jest.fn(),
};
const mockCoverImageService = { getAll: jest.fn().mockReturnValue(of([])) };
const mockDictService = {
  getDisciplines: jest.fn().mockReturnValue(of([])),
  getFacilities: jest.fn().mockReturnValue(of([])),
  getLevels: jest.fn().mockReturnValue(of([])),
  getCities: jest.fn().mockReturnValue(of([])),
  getDisciplineSchema: jest.fn().mockReturnValue(of(null)),
};
const mockGeocode = { geocodeAddress: jest.fn() };
const mockSnackbar = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
const mockBreadcrumb = { setContext: jest.fn() };
const mockRoute = {
  snapshot: {
    paramMap: { get: jest.fn().mockReturnValue(null) },
    queryParams: {},
  },
};

describe('EventFormComponent', () => {
  let fixture: ComponentFixture<EventFormComponent>;
  let component: EventFormComponent;
  let router: Router;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDictService.getDisciplines.mockReturnValue(of([]));
    mockDictService.getFacilities.mockReturnValue(of([]));
    mockDictService.getLevels.mockReturnValue(of([]));
    mockDictService.getCities.mockReturnValue(of([]));
    mockRoute.snapshot.paramMap.get.mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [EventFormComponent],
      providers: [
        provideRouter([]),
        { provide: EventService, useValue: mockEventService },
        { provide: CoverImageService, useValue: mockCoverImageService },
        { provide: DictionaryService, useValue: mockDictService },
        { provide: GeocodeService, useValue: mockGeocode },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: BreadcrumbService, useValue: mockBreadcrumb },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    })
      .overrideComponent(EventFormComponent, {
        set: {
          imports: [CommonModule, ReactiveFormsModule, MockTranslocoPipe],
          schemas: [NO_ERRORS_SCHEMA],
          template: `
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <input formControlName="title" id="title" />
              <input formControlName="startsAt" id="startsAt" />
              <input formControlName="endsAt" id="endsAt" />
              <input formControlName="disciplineSlug" id="disciplineSlug" />
              <input formControlName="facilitySlug" id="facilitySlug" />
              <input formControlName="levelSlug" id="levelSlug" />
              <input formControlName="citySlug" id="citySlug" />
              <input formControlName="address" id="address" />
              <input formControlName="costPerPerson" id="costPerPerson" />
              <input formControlName="minParticipants" id="minParticipants" />
              <input formControlName="maxParticipants" id="maxParticipants" />
              <input formControlName="gender" id="gender" />
              <input formControlName="visibility" id="visibility" />
              <input formControlName="lat" id="lat" />
              <input formControlName="lng" id="lng" />
              <button type="submit">Zapisz</button>
            </form>
          `,
        },
      })
      .compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(EventFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('inicjalizacja', () => {
    it('tworzy komponent', () => {
      expect(component).toBeTruthy();
    });

    it('isEdit() zwraca false gdy brak id w route', () => {
      expect(component.isEdit()).toBe(false);
    });

    it('ładuje słowniki przy inicjalizacji (ngOnInit)', () => {
      expect(mockDictService.getDisciplines).toHaveBeenCalled();
      expect(mockDictService.getFacilities).toHaveBeenCalled();
      expect(mockDictService.getLevels).toHaveBeenCalled();
      expect(mockDictService.getCities).toHaveBeenCalled();
    });

    it('ustawia domyślne wartości formularza (startsAt, endsAt, gender, visibility)', () => {
      expect(component.form.get('gender')?.value).toBe('ANY');
      expect(component.form.get('visibility')?.value).toBe('PUBLIC');
      expect(component.form.get('startsAt')?.value).toBeTruthy();
      expect(component.form.get('endsAt')?.value).toBeTruthy();
    });
  });

  describe('onSubmit — walidacja', () => {
    it('przy pustym formularzu wywołuje snackbar.error i nie wywołuje createEvent', () => {
      component.form.patchValue({ title: '', disciplineSlug: '', citySlug: '' });
      component.onSubmit();

      expect(mockSnackbar.error).toHaveBeenCalled();
      expect(mockEventService.createEvent).not.toHaveBeenCalled();
    });

    it('gdy maxParticipants < minParticipants wywołuje snackbar.error', () => {
      component.form.patchValue({
        title: 'Test',
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'warsaw',
        address: 'ul. Testowa 1',
        startsAt: futureDate(1),
        endsAt: futureDate(1).replace('19:00', '21:00'),
        minParticipants: 10,
        maxParticipants: 5,
      });
      component.onSubmit();

      expect(mockSnackbar.error).toHaveBeenCalledWith(
        expect.stringContaining('Maksymalna liczba uczestników'),
      );
      expect(mockEventService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit — tryb tworzenia', () => {
    it('wywołuje createEvent z danymi formularza i nawiguje po sukcesie', fakeAsync(() => {
      const createdEvent = { id: 'ev1', city: { slug: 'warsaw' } } as any;
      mockEventService.createEvent.mockReturnValue(of(createdEvent));
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.form.patchValue({
        title: 'Mecz testowy',
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'warsaw',
        address: 'ul. Testowa 1',
        startsAt: futureDate(2),
        endsAt: futureDate(2).replace('19:00', '21:00'),
        minParticipants: 2,
        maxParticipants: 10,
        costPerPerson: 0,
        gender: 'ANY',
        visibility: 'PUBLIC',
        lat: 52.2,
        lng: 21.0,
      });

      component.onSubmit();
      tick();

      expect(mockEventService.createEvent).toHaveBeenCalled();
      expect(mockSnackbar.success).toHaveBeenCalledWith('Wydarzenie utworzone');
      expect(navSpy).toHaveBeenCalledWith(['/w', 'warsaw', 'ev1']);
    }));

    it('wywołuje snackbar.error gdy createEvent zwraca błąd', fakeAsync(() => {
      mockEventService.createEvent.mockReturnValue(
        throwError(() => ({ error: { message: 'Nieznany błąd' } })),
      );

      component.form.patchValue({
        title: 'Mecz',
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'warsaw',
        address: 'ul. Testowa 1',
        startsAt: futureDate(2),
        endsAt: futureDate(2).replace('19:00', '21:00'),
        minParticipants: 2,
        maxParticipants: 10,
        costPerPerson: 0,
        gender: 'ANY',
        visibility: 'PUBLIC',
        lat: 52.2,
        lng: 21.0,
      });

      component.onSubmit();
      tick();

      expect(mockSnackbar.error).toHaveBeenCalledWith('Nieznany błąd');
    }));
  });

  describe('parseRules / formatRules', () => {
    it('parseRules zwraca pustą tablicę dla pustego stringa', () => {
      expect(component.parseRules('')).toEqual([]);
      expect(component.parseRules(undefined)).toEqual([]);
    });

    it('parseRules parsuje linie na obiekty z text i indent', () => {
      const result = component.parseRules('Reguła 1\n  Podzasada');
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Reguła 1');
      expect(result[0].indent).toBe(0);
      expect(result[1].text).toBe('Podzasada');
      expect(result[1].indent).toBeGreaterThan(0);
    });

    it('formatRules filtruje puste linie i scala z wcięciami', () => {
      const rules = [
        { id: '1', text: 'Reguła 1', indent: 0 },
        { id: '2', text: '   ', indent: 0 },
        { id: '3', text: 'Reguła 3', indent: 1 },
      ];
      const result = component.formatRules(rules);
      expect(result).not.toContain('   ');
      expect(result.split('\n')).toHaveLength(2);
    });
  });

  describe('tryb edycji', () => {
    it('isEdit() zwraca true gdy route zawiera id', async () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('event123');
      const event = {
        id: 'event123',
        status: 'ACTIVE',
        startsAt: futureDate(5),
        endsAt: futureDate(5).replace('19:00', '21:00'),
        title: 'Event edytowany',
        description: '',
        disciplineSlug: 'football',
        facilitySlug: 'pitch',
        levelSlug: 'mixed-open',
        citySlug: 'warsaw',
        city: { slug: 'warsaw' },
        costPerPerson: 0,
        minParticipants: 2,
        maxParticipants: 10,
        gender: 'ANY',
        visibility: 'PUBLIC',
        address: 'ul. Testowa 1',
        lat: 52.2,
        lng: 21.0,
        coverImageId: null,
        rules: '',
      } as any;
      mockEventService.getEvent.mockReturnValue(of(event));

      fixture = TestBed.createComponent(EventFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.isEdit()).toBe(true);
    });
  });
});
