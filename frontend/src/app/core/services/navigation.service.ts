import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CityContextService } from './city-context.service';

/**
 * Centralny serwis nawigacji aplikacji. WSZYSTKIE nawigacje muszą przechodzić przez niego
 * (a nie przez `Router` bezpośrednio) — patrz `docs/styleguide-frontend.md`.
 *
 * Metody pogrupowano sekcjami wg modułu domenowego:
 *  - Wydarzenie (publiczne / uczestnik)
 *  - Wydarzenie (organizator)
 *  - Serie
 *  - Panel konta (`/profile/**`)
 *  - Auth
 *  - System / util
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cityContext = inject(CityContextService);

  // ── Wydarzenie (publiczne / uczestnik) ──

  navigateToEvents(citySlug: string): void {
    this.router.navigate(['/w', citySlug]);
  }

  navigateToEventDetail(eventId: string, citySlug: string): void {
    this.router.navigate(['/w', citySlug, eventId]);
  }

  navigateToEventMap(eventId: string, citySlug: string): void {
    this.router.navigate(['/w', citySlug, eventId, 'map']);
  }

  navigateToEventParticipants(eventId: string, citySlug: string): void {
    this.auth.requireAuth('zobaczyć listę uczestników', () => {
      this.router.navigate(['/w', citySlug, eventId, 'participants']);
    });
  }

  navigateToEventParticipantsWithQuery(
    eventId: string,
    citySlug: string,
    queryParams: Record<string, string>,
  ): void {
    this.auth.requireAuth('zobaczyć listę uczestników', () => {
      this.router.navigate(['/w', citySlug, eventId, 'participants'], { queryParams });
    });
  }

  navigateToEventChat(eventId: string, citySlug: string): void {
    this.auth.requireAuth('korzystać z czatu', () => {
      this.router.navigate(['/w', citySlug, eventId, 'chat']);
    });
  }

  navigateToEventOrganizerChat(eventId: string, citySlug: string, userId?: string): void {
    this.auth.requireAuth('napisać do organizatora', () => {
      const route = userId
        ? ['/w', citySlug, eventId, 'host-chat', userId]
        : ['/w', citySlug, eventId, 'host-chat'];
      this.router.navigate(route);
    });
  }

  // ── Wydarzenie (organizator) ──

  navigateToEventCreate(): void {
    this.auth.requireAuth('utworzyć wydarzenie', () => {
      this.router.navigate(['/o/w/new']);
    });
  }

  // Alias historyczny dla `navigateToEventCreate()` — używany w `event-form`.
  navigateToEventCreation(): void {
    this.navigateToEventCreate();
  }

  navigateToEventCreateWithDuplicate(duplicateId: string): void {
    this.auth.requireAuth('utworzyć wydarzenie', () => {
      this.router.navigate(['/o/w/new'], { queryParams: { duplicateId } });
    });
  }

  navigateToEventEdit(eventId: string): void {
    this.auth.requireAuth('edytować wydarzenie', () => {
      this.router.navigate(['/o/w', eventId, 'edit']);
    });
  }

  navigateToEventManage(eventId: string): void {
    this.auth.requireAuth('zarządzać wydarzeniem', () => {
      this.router.navigate(['/o/w', eventId, 'manage']);
    });
  }

  // ── Serie ──

  navigateToSeries(seriesId: string): void {
    this.router.navigate(['/series', seriesId]);
  }

  navigateToSeriesTemplateEdit(seriesId: string): void {
    void this.router.navigate(['/o/s', seriesId, 'edit-template']);
  }

  // ── Panel konta (`/profile/**`) ──

  navigateToProfile(): void {
    this.auth.requireAuth('zobaczyć profil', () => {
      this.router.navigate(['/profile']);
    });
  }

  navigateToNotifications(): void {
    this.auth.requireAuth('zobaczyć powiadomienia', () => {
      this.router.navigate(['/profile/general/notifications']);
    });
  }

  navigateToParticipations(): void {
    this.auth.requireAuth('zobaczyć moje uczestnictwa', () => {
      this.router.navigate(['/profile/enrollment/participations']);
    });
  }

  navigateToMedia(): void {
    this.auth.requireAuth('zobaczyć galerię', () => {
      this.router.navigate(['/profile/enrollment/media']);
    });
  }

  navigateToPayments(): void {
    this.auth.requireAuth('zobaczyć moje płatności', () => {
      this.router.navigate(['/profile/enrollment/payments']);
    });
  }

  navigateToVouchers(): void {
    this.auth.requireAuth('zobaczyć moje vouchery', () => {
      this.router.navigate(['/profile/enrollment/vouchers']);
    });
  }

  navigateToProfileEvents(): void {
    this.auth.requireAuth('zobaczyć moje wydarzenia z profilu', () => {
      this.router.navigate(['/profile/organizer/events']);
    });
  }

  navigateToOrganizerSeries(): void {
    this.auth.requireAuth('zobaczyć serie organizatora', () => {
      this.router.navigate(['/profile/organizer/series']);
    });
  }

  navigateToOrganizerSettings(): void {
    this.auth.requireAuth('zmienić ustawienia organizatora', () => {
      this.router.navigate(['/profile/organizer/settings']);
    });
  }

  navigateToProfileCoverImages(): void {
    this.auth.requireAuth('zarządzać cover images', () => {
      this.router.navigate(['/profile/organizer/cover-images']);
    });
  }

  // ── Auth ──

  navigateToLogin(returnUrl?: string): void {
    const queryParams = returnUrl ? { returnUrl } : undefined;
    this.router.navigate(['/auth/login'], { queryParams });
  }

  navigateToAuthLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // ── System / util ──

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToRoot(): void {
    this.router.navigate(['/']);
  }

  navigateToCurrentCity(): void {
    const citySlug = this.cityContext.citySlug();
    if (citySlug) {
      this.router.navigate(['/w', citySlug]);
    } else {
      this.router.navigate(['/']);
    }
  }

  navigateToSettings(value?: string): void {
    this.auth.requireAuth('zmienić ustawienia', () => {
      if (value) {
        this.router.navigate([value]);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  navigateToNotFound(skipLocationChange = true): void {
    this.router.navigate(['/not-found'], { skipLocationChange });
  }

  navigateToNotFoundWithReason(reason: string, skipLocationChange = true): void {
    this.router.navigateByUrl('/not-found', {
      state: { reason },
      skipLocationChange,
    });
  }

  navigateToUnverified(skipLocationChange = true): void {
    this.router.navigate(['/unverified'], { skipLocationChange });
  }

  navigateToParent(relativeTo: ActivatedRoute): void {
    this.router.navigate(['..'], { relativeTo });
  }

  navigateToPath(path: string[]): void {
    this.router.navigate(path);
  }

  /** Nawigacja do dowolnego string URL (np. `link` z powiadomienia z backendu). */
  navigateToUrl(url: string): void {
    this.router.navigateByUrl(url);
  }

  /** Generyczny `UrlTree` dla guardów (zamiast `Router.createUrlTree`). */
  createUrlTree(path: string[], queryParams?: Record<string, string | string[]>): UrlTree {
    return this.router.createUrlTree(path, { queryParams });
  }
}
