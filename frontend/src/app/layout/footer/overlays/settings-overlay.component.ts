import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../../../shared/ui/icon/icon.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-settings-overlay',
  imports: [CommonModule, RouterLink, IconComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Ustawienia" (closed)="closed.emit()">
      <div class="space-y-3 max-w-lg mx-auto">
        <p class="text-sm text-neutral-500">
          Zarządzaj kontem, motywem i najważniejszymi informacjami o platformie.
        </p>

        @if (auth.isLoggedIn()) {
        <section class="space-y-1.5">
          <p class="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Konto</p>
          <div
            class="overflow-hidden rounded-2xl border border-neutral-200 divide-y divide-neutral-200"
          >
            <a
              routerLink="/profile"
              (click)="closed.emit()"
              class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-700"
            >
              <app-icon name="user" size="md" class="text-info-400" />
              <span>Mój profil</span>
              <app-icon name="chevron-right" size="sm" class="ml-auto text-neutral-400" />
            </a>

            <button
              type="button"
              (click)="handleLogout()"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-700"
            >
              <app-icon name="log-out" size="md" class="text-danger-300" />
              <span>Wyloguj się</span>
              <app-icon name="chevron-right" size="sm" class="ml-auto text-neutral-400" />
            </button>
          </div>
        </section>
        }

        <section class="space-y-1.5">
          <p class="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Informacje
          </p>
          <div
            class="overflow-hidden rounded-2xl border border-neutral-200 divide-y divide-neutral-200"
          >
            @for (link of infoLinks; track link.label) {
            <a
              [routerLink]="link.route"
              (click)="closed.emit()"
              class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-700"
            >
              <app-icon [name]="link.icon" size="md" [ngClass]="link.iconColor" />
              <span>{{ link.label }}</span>
              <app-icon name="chevron-right" size="sm" class="ml-auto text-neutral-400" />
            </a>
            }
          </div>
        </section>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverlayComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly closed = output<void>();

  readonly infoLinks = [
    { label: 'FAQ', route: '/faq', icon: 'search' as IconName, iconColor: 'text-info-300' },
    {
      label: 'Kontakt',
      route: '/contact',
      icon: 'mail' as IconName,
      iconColor: 'text-warning-300',
    },
    {
      label: 'Polityka prywatności',
      route: '/privacy',
      icon: 'shield' as IconName,
      iconColor: 'text-success-400',
    },
    { label: 'Regulamin', route: '/terms', icon: 'edit' as IconName, iconColor: 'text-info-400' },
  ];

  handleLogout(): void {
    this.auth.logout();
    this.closed.emit();
    this.router.navigate(['/']);
  }
}
