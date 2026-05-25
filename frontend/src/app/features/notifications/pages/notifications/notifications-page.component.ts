import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { Notification, NotificationKind } from '../../../../shared/types/notification.interface';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { formatDateTime } from '@zgadajsie/shared';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './notifications-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent {
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(true);
  readonly currentPage = signal(1);
  readonly hasMore = signal(false);
  readonly totalCount = signal(0);

  constructor() {
    this.loadNotifications();
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

  handleClick(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
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
