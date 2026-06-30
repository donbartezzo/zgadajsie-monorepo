import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../../shared/ui/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { AdminService } from '../../../../core/services/admin.service';
import { ContactMessage } from '../../../../shared/types';
import { ContactSource, formatDateTime } from '@zgadajsie/shared';
import { SemanticColor } from '../../../../shared/types/colors';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-admin-contact-messages',
  imports: [
    CommonModule,
    CardComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
    ButtonComponent,
    BadgeComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      <app-page-heading heading="Wiadomości kontaktowe" />
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <div class="space-y-2">
          @for (msg of messages(); track msg.id) {
            <app-card>
              <div class="space-y-3">
                <!-- Nagłówek kafelka -->
                <div class="flex items-center justify-between">
                  <span class="text-xs text-neutral-400">{{ formatDate(msg.createdAt) }}</span>
                  @if (msg.source) {
                    <app-badge [color]="getSourceColor(msg.source)" size="xs">
                      {{ getSourceLabel(msg.source) }}
                    </app-badge>
                  }
                </div>

                <!-- Dane użytkownika -->
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-medium text-neutral-900">{{ msg.name }}</span>
                  <span class="text-xs text-neutral-500">{{ msg.email }}</span>
                </div>

                <!-- Wiadomość -->
                <p class="text-sm text-neutral-700 bg-neutral-50 p-2 rounded-lg">
                  {{ msg.message }}
                </p>

                <!-- Przyciski akcji -->
                <div class="flex gap-2 justify-end">
                  <app-button (click)="resendEmail(msg.id)" variant="secondary" size="xs">
                    Wyślij email
                  </app-button>
                  <app-button (click)="deleteMessage(msg.id)" variant="danger" size="xs">
                    Usuń
                  </app-button>
                </div>

                <!-- Numer referencyjny -->
                @if (msg.referenceNumber) {
                  <div class="pt-2 border-t border-neutral-200">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-neutral-400">Numer referencyjny:</span>
                      <span class="text-xs font-mono font-bold text-primary-600">
                        {{ msg.referenceNumber }}
                      </span>
                    </div>
                  </div>
                }

                <!-- Status emaila -->
                <div class="pt-2 border-t border-neutral-200">
                  @if (msg.emailSentAt) {
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-success-600 font-medium">
                        Email wysłany ({{ msg.emailSentCount }}x)
                      </span>
                      <span class="text-neutral-400">
                        Ostatnio: {{ formatDate(msg.emailSentAt) }}
                      </span>
                    </div>
                  } @else {
                    <span class="text-xs text-warning-600 font-medium">Email nie wysłany</span>
                  }
                </div>

                <!-- Szczegóły -->
                <div class="pt-2 border-t border-neutral-200">
                  <div class="space-y-1 text-xs text-neutral-400">
                    @if (msg.user) {
                      <div>
                        Użytkownik: <strong>{{ msg.user.displayName }}</strong> •
                        {{ msg.user.email }} (ID: {{ msg.user.id }})
                      </div>
                    } @else {
                      <div>Użytkownik: Niezalogowany</div>
                    }
                    @if (msg.citySlug) {
                      <div>Miasto: {{ msg.citySlug }}</div>
                    }
                  </div>
                </div>
              </div>
            </app-card>
          }
        </div>
        @if (totalPages() > 1) {
          <div class="mt-4">
            <app-pagination
              [currentPage]="page()"
              [totalPages]="totalPages()"
              (pageChange)="onPageChange($event)"
            ></app-pagination>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminContactMessagesComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly snackbar = inject(SnackbarService);
  readonly messages = signal<ContactMessage[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly totalPages = signal(1);

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading.set(true);
    this.adminService.getContactMessages(this.page(), 20).subscribe({
      next: (r) => {
        this.messages.set(r.data);
        this.totalPages.set(Math.ceil(r.total / r.limit) || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.loadMessages();
  }

  resendEmail(id: string): void {
    this.adminService.resendContactEmail(id).subscribe({
      next: (r) => {
        if (r.success) {
          this.snackbar.success(r.message);
          this.loadMessages();
        }
      },
      error: () => this.snackbar.error('Nie udało się wysłać emaila'),
    });
  }

  async deleteMessage(id: string): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Usuń wiadomość',
      message: 'Czy na pewno chcesz usunąć tę wiadomość? Tej operacji nie można cofnąć.',
      confirmLabel: 'Usuń',
      cancelLabel: 'Anuluj',
      color: 'danger',
      showIcon: true,
    });

    if (confirmed) {
      this.adminService.deleteContactMessage(id).subscribe({
        next: () => {
          this.messages.update((msgs) => msgs.filter((m) => m.id !== id));
          this.snackbar.success('Wiadomość została usunięta');
        },
        error: () => this.snackbar.error('Nie udało się usunąć wiadomości'),
      });
    }
  }

  formatDate(date: string): string {
    return formatDateTime(date);
  }

  getSourceLabel(source: ContactSource): string {
    switch (source) {
      case ContactSource.CONTACT_PAGE:
        return 'Strona kontaktowa';
      case ContactSource.CITY_EVENTS:
        return 'Wydarzenia miasta';
      default:
        return source;
    }
  }

  getSourceColor(source: ContactSource): SemanticColor {
    switch (source) {
      case ContactSource.CONTACT_PAGE:
        return 'info';
      case ContactSource.CITY_EVENTS:
        return 'primary';
      default:
        return 'neutral';
    }
  }
}
