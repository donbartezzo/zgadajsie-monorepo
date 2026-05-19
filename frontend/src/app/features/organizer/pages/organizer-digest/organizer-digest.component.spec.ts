import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { OrganizerDigestComponent } from './organizer-digest.component';
import { OrganizerService, OrganizerDigestData } from '../../../../core/services/organizer.service';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

function makePendingEvent(id: string) {
  return {
    id,
    title: `Event ${id}`,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    status: 'PENDING',
    enrollmentCount: 0,
    seriesId: 'series-1',
    seriesName: 'Test Series',
    confirmToken: `token-${id}`,
  };
}

function makeDigest(pendingCount = 0): OrganizerDigestData {
  return {
    period: { from: new Date().toISOString(), to: new Date().toISOString() },
    pendingConfirmations: Array.from({ length: pendingCount }, (_, i) =>
      makePendingEvent(`event-${i}`),
    ),
    recentlyCreated: [],
    recentlyEnded: [],
    upcoming: [],
    recentlyCancelled: [],
    activeSeries: [],
    recentlyDeactivatedSeries: [],
  };
}

describe('OrganizerDigestComponent', () => {
  let fixture: ComponentFixture<OrganizerDigestComponent>;
  let component: OrganizerDigestComponent;
  let organizerService: { getDigest: jest.Mock; sendDigestEmail: jest.Mock };
  let eventSeriesService: { confirmEvent: jest.Mock };
  let snackbar: { success: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    organizerService = {
      getDigest: jest.fn().mockReturnValue(of(makeDigest())),
      sendDigestEmail: jest.fn().mockReturnValue(of({ sent: true })),
    };
    eventSeriesService = {
      confirmEvent: jest.fn().mockReturnValue(of({ confirmed: true })),
    };
    snackbar = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [OrganizerDigestComponent],
      providers: [
        { provide: OrganizerService, useValue: organizerService },
        { provide: EventSeriesService, useValue: eventSeriesService },
        { provide: SnackbarService, useValue: snackbar },
        {
          provide: Router,
          useValue: {
            navigate: jest.fn(),
            events: of(),
            routerState: {
              snapshot: { root: { paramMap: { get: () => null }, firstChild: null } },
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizerDigestComponent);
    component = fixture.componentInstance;
  });

  it('pobiera dane digestu przy inicjalizacji', () => {
    fixture.detectChanges();
    expect(organizerService.getDigest).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBe(false);
    expect(component.digest()).not.toBeNull();
  });

  it('ustawia error gdy ładowanie się nie powiedzie', () => {
    organizerService.getDigest.mockReturnValue(
      throwError(() => ({ error: { message: 'Serwer niedostępny' } })),
    );
    fixture.detectChanges();
    expect(component.error()).toBe('Serwer niedostępny');
    expect(component.loading()).toBe(false);
  });

  it('digest zawiera pendingConfirmations po załadowaniu danych', () => {
    organizerService.getDigest.mockReturnValue(of(makeDigest(3)));
    fixture.detectChanges();
    expect(component.digest()?.pendingConfirmations).toHaveLength(3);
  });

  it('confirmEvent wywołuje eventSeriesService.confirmEvent z poprawnym seriesId i eventId', () => {
    organizerService.getDigest.mockReturnValue(of(makeDigest(1)));
    fixture.detectChanges();

    const event = component.digest()!.pendingConfirmations[0];
    component.confirmEvent(event);

    expect(eventSeriesService.confirmEvent).toHaveBeenCalledWith('series-1', event.id);
  });

  it('confirmEvent usuwa event z pendingConfirmations po potwierdzeniu', () => {
    organizerService.getDigest.mockReturnValue(of(makeDigest(2)));
    fixture.detectChanges();

    const event = component.digest()!.pendingConfirmations[0];
    component.confirmEvent(event);

    expect(component.digest()?.pendingConfirmations).toHaveLength(1);
    expect(snackbar.success).toHaveBeenCalled();
  });

  it('confirmEvent wyświetla błąd gdy potwierdzenie się nie powiedzie', () => {
    organizerService.getDigest.mockReturnValue(of(makeDigest(1)));
    eventSeriesService.confirmEvent.mockReturnValue(
      throwError(() => ({ error: { message: 'Nie znaleziono' } })),
    );
    fixture.detectChanges();

    const event = component.digest()!.pendingConfirmations[0];
    component.confirmEvent(event);

    expect(snackbar.error).toHaveBeenCalledWith('Nie znaleziono');
    expect(component.confirmingEventId()).toBeNull();
  });

  it('isEmpty zwraca true gdy wszystkie sekcje są puste', () => {
    fixture.detectChanges();
    expect(component.isEmpty(makeDigest())).toBe(true);
  });

  it('isEmpty zwraca false gdy są pendingConfirmations', () => {
    fixture.detectChanges();
    expect(component.isEmpty(makeDigest(1))).toBe(false);
  });

  it('sendEmail wywołuje organizerService.sendDigestEmail', () => {
    fixture.detectChanges();
    component.sendEmail();
    expect(organizerService.sendDigestEmail).toHaveBeenCalledTimes(1);
    expect(snackbar.success).toHaveBeenCalled();
  });
});
