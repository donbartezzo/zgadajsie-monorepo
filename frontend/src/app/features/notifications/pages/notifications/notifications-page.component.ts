import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../../../core/services/navigation.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Notification, NotificationKind } from '../../../../shared/types/notification.interface';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { formatDateTime } from '@zgadajsie/shared';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent, BadgeComponent],
  templateUrl: './notifications-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent {
  private readonly navigation = inject(NavigationService);
  private readonly notificationService = inject(NotificationService);

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly hasMore = signal(false);
  readonly totalCount = signal(0);

  constructor() {
    this.loadNotifications();

    // Merge live notification from socket with paginated list
    effect(() => {
      const live = this.notificationService.liveNotification();
      if (!live) return;

      // Deduplikacja - jeśli już jest na liście, zaktualizuj
      const existingIndex = this.notifications().findIndex((n) => n.id === live.id);
      if (existingIndex >= 0) {
        this.notifications.update((current) => {
          const updated = [...current];
          updated[existingIndex] = live;
          // Move to top for aggregation
          if (live.groupKey) {
            updated.splice(existingIndex, 1);
            updated.unshift(live);
          }
          return updated;
        });
      } else {
        // Nowa notyfikacja - dodaj na górę
        this.notifications.update((current) => [live, ...current]);
      }

      // Reset signal po przetworzeniu
      this.notificationService.liveNotification.set(null);
    });
  }

  loadNotifications(page = 1): void {
    this.loading.set(true);
    this.notificationService.getNotifications(page, 20).subscribe({
      next: (response) => {
        if (page === 1) {
          this.notifications.set(response.data);
        } else {
          this.notifications.update((current) => [...current, ...response.data]);
        }
        this.hasMore.set(response.data.length === 20);
        this.totalCount.set(response.total);
        this.currentPage.set(page);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    if (this.loading() || !this.hasMore()) return;
    this.loadNotifications(this.currentPage() + 1);
  }

  markAsRead(notification: Notification): void {
    if (notification.readAt) return;

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((current) =>
          current.map((n) =>
            n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
        this.notificationService.unreadCount.update((count) => Math.max(0, count - 1));
      },
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((current) =>
          current.map((n) => ({ ...n, readAt: new Date().toISOString() })),
        );
        this.notificationService.unreadCount.set(0);
      },
    });
  }

  delete(notification: Notification): void {
    this.notificationService.delete(notification.id).subscribe({
      next: () => {
        this.notifications.update((current) => current.filter((n) => n.id !== notification.id));
        if (!notification.readAt) {
          this.notificationService.unreadCount.update((count) => Math.max(0, count - 1));
        }
      },
    });
  }

  deleteAll(): void {
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications.set([]);
        this.notificationService.unreadCount.set(0);
      },
    });
  }

  handleClick(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.link) {
      this.navigation.navigateToUrl(notification.link);
    }
  }

  getCtaLabel(kind: NotificationKind): string {
    const ctaMap: Record<NotificationKind, string> = {
      NEW_APPLICATION: 'Przejdź do zarządzania',
      NEW_CHAT_MESSAGE: 'Przejdź do czatu',
      NEW_PRIVATE_MESSAGE: 'Przejdź do konwersacji',
      PARTICIPATION_STATUS: 'Przejdź do wydarzenia',
      EVENT_REMINDER: 'Przejdź do wydarzenia',
      EVENT_CANCELLED: 'Przejdź do wydarzenia',
      REPRIMAND: 'Przejdź do wydarzenia',
      ANNOUNCEMENT: 'Przejdź do wydarzenia',
      NEW_EVENT_IN_CITY: 'Przejdź do wydarzenia',
      PAYMENT_CANCELLED: 'Przejdź do płatności',
    };
    return ctaMap[kind] ?? 'Przejdź';
  }

  getNotificationIcon(kind: NotificationKind): IconName {
    const iconMap: Record<NotificationKind, IconName> = {
      NEW_APPLICATION: 'user-plus',
      PARTICIPATION_STATUS: 'user-check',
      EVENT_CANCELLED: 'x-circle',
      NEW_CHAT_MESSAGE: 'message-circle',
      EVENT_REMINDER: 'clock',
      NEW_EVENT_IN_CITY: 'calendar-plus',
      REPRIMAND: 'alert-triangle',
      ANNOUNCEMENT: 'megaphone',
      PAYMENT_CANCELLED: 'credit-card',
      NEW_PRIVATE_MESSAGE: 'message-square',
    };
    return iconMap[kind] || 'bell';
  }

  getNotificationColor(kind: NotificationKind): string {
    const colorMap: Record<NotificationKind, string> = {
      NEW_APPLICATION: 'text-info-500',
      PARTICIPATION_STATUS: 'text-success-500',
      EVENT_CANCELLED: 'text-danger-500',
      NEW_CHAT_MESSAGE: 'text-primary-500',
      EVENT_REMINDER: 'text-warning-500',
      NEW_EVENT_IN_CITY: 'text-info-500',
      REPRIMAND: 'text-danger-500',
      ANNOUNCEMENT: 'text-primary-500',
      PAYMENT_CANCELLED: 'text-danger-500',
      NEW_PRIVATE_MESSAGE: 'text-primary-500',
    };
    return colorMap[kind] || 'text-neutral-500';
  }

  formatTime(dateString: string): string {
    return formatDateTime(dateString);
  }
}
