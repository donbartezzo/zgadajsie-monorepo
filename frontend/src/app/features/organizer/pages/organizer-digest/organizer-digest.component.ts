import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { EventManageCardComponent } from '../../../../shared/event/ui/event-manage-card/event-manage-card.component';
import type {
  EventManageCardItem,
  ManageActionEvent,
} from '../../../../shared/event/ui/event-manage-card/event-manage-card.types';
import { AccountRailSlotComponent } from '../../../../shared/ui/account-nav-rail/account-rail-slot.component';
import { OrganizerService } from '../../../../core/services/organizer.service';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import {
  EventDigestItem,
  EventStatus,
  formatDateLong,
  OrganizerDigestData,
} from '@zgadajsie/shared';

@Component({
  selector: 'app-organizer-digest',
  imports: [
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    IconComponent,
    EventManageCardComponent,
    AccountRailSlotComponent,
  ],
  templateUrl: './organizer-digest.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerDigestComponent implements OnInit {
  private readonly organizerService = inject(OrganizerService);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly snackbar = inject(SnackbarService);
  private readonly navigation = inject(NavigationService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly digest = signal<OrganizerDigestData | null>(null);
  readonly sendingEmail = signal(false);
  readonly confirmingEventId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDigest();
  }

  private loadDigest(): void {
    this.loading.set(true);
    this.error.set(null);
    this.organizerService.getDigest().subscribe({
      next: (data) => {
        this.digest.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Nie udało się załadować zestawienia.');
        this.loading.set(false);
      },
    });
  }

  sendEmail(): void {
    this.sendingEmail.set(true);
    this.organizerService.sendDigestEmail().subscribe({
      next: () => {
        this.snackbar.success('E-mail z zestawieniem został wysłany.');
        this.sendingEmail.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się wysłać e-maila.');
        this.sendingEmail.set(false);
      },
    });
  }

  private confirmEvent(event: EventDigestItem): void {
    if (!event.seriesId) return;
    this.confirmingEventId.set(event.id);
    this.eventSeriesService.confirmEvent(event.seriesId, event.id).subscribe({
      next: () => {
        this.digest.update((d) => {
          if (!d) return d;
          const now = new Date().toISOString();
          const isUpcoming = event.startsAt > now;
          return {
            ...d,
            pendingConfirmations: d.pendingConfirmations.filter((e) => e.id !== event.id),
            upcoming: isUpcoming
              ? [...d.upcoming, { ...event, status: EventStatus.ACTIVE, confirmToken: null }].sort(
                  (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
                )
              : d.upcoming,
          };
        });
        this.snackbar.success('Wydarzenie potwierdzone i opublikowane.');
        this.confirmingEventId.set(null);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się potwierdzić wydarzenia.');
        this.confirmingEventId.set(null);
      },
    });
  }

  toManageCardItem(event: EventDigestItem): EventManageCardItem {
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      status: event.status,
      seriesId: event.seriesId,
      confirmToken: event.confirmToken,
      address: event.address,
      costPerPerson: event.costPerPerson,
      maxParticipants: event.maxParticipants,
      coverImage: event.coverImage,
      enrollmentCount: event.enrollmentCount,
    };
  }

  onPendingAction(action: ManageActionEvent, event: EventDigestItem): void {
    switch (action.type) {
      case 'confirm':
        this.confirmEvent(event);
        break;
      case 'manage':
        this.navigation.navigateToEventManage(action.eventId);
        break;
      case 'delete':
        // eslint-disable-next-line no-console
        console.warn('Delete not yet implemented for digest events');
        break;
      case 'duplicate':
        this.navigation.navigateToEventCreateWithDuplicate(action.eventId);
        break;
    }
  }

  onUpcomingAction(action: ManageActionEvent): void {
    switch (action.type) {
      case 'manage':
        this.navigation.navigateToEventManage(action.eventId);
        break;
      case 'edit':
        this.navigation.navigateToEventEdit(action.eventId);
        break;
      case 'cancel':
        // eslint-disable-next-line no-console
        console.warn('Cancel not yet implemented for digest events');
        break;
      case 'delete':
        // eslint-disable-next-line no-console
        console.warn('Delete not yet implemented for digest events');
        break;
      case 'duplicate':
        this.navigation.navigateToEventCreateWithDuplicate(action.eventId);
        break;
    }
  }

  formatDate(value: string): string {
    return formatDateLong(value);
  }

  navigateToSeries(seriesId: string): void {
    void this.navigation.navigateToSeries(seriesId);
  }

  isEmpty(data: OrganizerDigestData): boolean {
    return (
      data.pendingConfirmations.length === 0 &&
      data.activeSeries.length === 0 &&
      data.upcoming.length === 0 &&
      data.recentlyCreated.length === 0 &&
      data.recentlyEnded.length === 0 &&
      data.recentlyCancelled.length === 0 &&
      data.recentlyDeactivatedSeries.length === 0
    );
  }
}
