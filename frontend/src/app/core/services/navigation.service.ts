import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CityContextService } from './city-context.service';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cityContext = inject(CityContextService);

  navigateToEventParticipants(eventId: string, citySlug: string): void {
    this.auth.requireAuth('zobaczyć listę uczestników', () => {
      this.router.navigate(['/w', citySlug, eventId, 'participants']);
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

  navigateToEventDetail(eventId: string, citySlug: string): void {
    this.router.navigate(['/w', citySlug, eventId]);
  }

  navigateToEvents(citySlug: string): void {
    this.router.navigate(['/w', citySlug]);
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

  navigateToMyEvents(): void {
    this.auth.requireAuth('zobaczyć moje wydarzenia', () => {
      this.router.navigate(['/my-events']);
    });
  }

  navigateToProfile(): void {
    this.auth.requireAuth('zobaczyć profil', () => {
      this.router.navigate(['/profile']);
    });
  }

  navigateToVouchers(): void {
    this.auth.requireAuth('zobaczyć moje vouchery', () => {
      this.router.navigate(['/vouchers']);
    });
  }

  navigateToPayments(): void {
    this.auth.requireAuth('zobaczyć moje płatności', () => {
      this.router.navigate(['/payments']);
    });
  }

  navigateToEventMap(eventId: string, citySlug: string): void {
    this.router.navigate(['/w', citySlug, eventId, 'map']);
  }

  navigateToHome(): void {
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

  navigateToLogin(returnUrl?: string): void {
    const queryParams = returnUrl ? { returnUrl } : undefined;
    this.router.navigate(['/auth/login'], { queryParams });
  }

  navigateToSeries(seriesId: string): void {
    this.router.navigate(['/series', seriesId]);
  }

  navigateToProfileEvents(): void {
    this.auth.requireAuth('zobaczyć moje wydarzenia z profilu', () => {
      this.router.navigate(['/profile/events']);
    });
  }

  navigateToProfileCoverImages(): void {
    this.auth.requireAuth('zarządzać cover images', () => {
      this.router.navigate(['/profile/cover-images']);
    });
  }

  navigateToRoot(): void {
    this.router.navigate(['/']);
  }

  navigateToNotFound(skipLocationChange = true): void {
    this.router.navigate(['/not-found'], { skipLocationChange });
  }

  navigateToUnverified(skipLocationChange = true): void {
    this.router.navigate(['/unverified'], { skipLocationChange });
  }

  navigateToEventCreate(): void {
    this.auth.requireAuth('utworzyć wydarzenie', () => {
      this.router.navigate(['/o/w/new']);
    });
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

  navigateToAuthLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToPath(path: string[]): void {
    this.router.navigate(path);
  }

  /** Nawigacja do dowolnego string URL (np. `link` z powiadomienia z backendu). */
  navigateToUrl(url: string): void {
    this.router.navigateByUrl(url);
  }

  navigateToEventCreateWithDuplicate(duplicateId: string): void {
    this.auth.requireAuth('utworzyć wydarzenie', () => {
      this.router.navigate(['/o/w/new'], { queryParams: { duplicateId } });
    });
  }

  navigateToNotFoundWithReason(reason: string, skipLocationChange = true): void {
    this.router.navigateByUrl('/not-found', {
      state: { reason },
      skipLocationChange,
    });
  }

  navigateToParent(relativeTo: ActivatedRoute): void {
    this.router.navigate(['..'], { relativeTo });
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

  navigateToEventCreation(): void {
    this.auth.requireAuth('utworzyć wydarzenie', () => {
      this.router.navigate(['/o/w/new']);
    });
  }

  // Generic UrlTree method for guards
  createUrlTree(path: string[], queryParams?: Record<string, string | string[]>): UrlTree {
    return this.router.createUrlTree(path, { queryParams });
  }
}
