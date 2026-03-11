import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../../../core/icons/icon.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-settings-overlay',
  imports: [CommonModule, RouterLink, IconComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Ustawienia" (closed)="closed.emit()">
      <div class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Zarządzaj kontem, motywem i najważniejszymi informacjami o platformie.
        </p>

        @if (auth.isLoggedIn()) {
        <section class="space-y-1.5">
          <p
            class="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            Konto
          </p>
          <div
            class="overflow-hidden rounded-2xl border border-slate-100 divide-y divide-slate-100 dark:border-slate-700/70 dark:divide-slate-700/70"
          >
            <a
              routerLink="/profile"
              (click)="closed.emit()"
              class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-slate-50 dark:text-gray-100 dark:hover:bg-slate-800"
            >
              <app-icon name="user" size="md" class="text-blue-500" />
              <span>Mój profil</span>
              <app-icon name="chevron-right" size="sm" class="ml-auto text-gray-400" />
            </a>

            <button
              type="button"
              (click)="handleLogout()"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-slate-50 dark:text-gray-100 dark:hover:bg-slate-800"
            >
              <app-icon name="log-out" size="md" class="text-red-500" />
              <span>Wyloguj się</span>
              <app-icon name="chevron-right" size="sm" class="ml-auto text-gray-400" />
            </button>
          </div>
        </section>
        }

        <section class="space-y-1.5">
          <p
            class="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            Informacje
          </p>
          <div
            class="overflow-hidden rounded-2xl border border-slate-100 divide-y divide-slate-100 dark:border-slate-700/70 dark:divide-slate-700/70"
          >
            @for (link of infoLinks; track link.label) {
            <a
              [routerLink]="link.route"
              (click)="closed.emit()"
              class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-slate-50 dark:text-gray-100 dark:hover:bg-slate-800"
            >
              <app-icon [name]="link.icon" size="md" [ngClass]="link.iconColor" />
              <span>{{ link.label }}</span>
              <app-icon name="chevron-right" size="sm" class="ml-auto text-gray-400" />
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
    { label: 'FAQ', route: '/faq', icon: 'search' as IconName, iconColor: 'text-purple-500' },
    { label: 'Kontakt', route: '/contact', icon: 'mail' as IconName, iconColor: 'text-orange-500' },
    {
      label: 'Polityka prywatności',
      route: '/privacy',
      icon: 'shield' as IconName,
      iconColor: 'text-green-500',
    },
    { label: 'Regulamin', route: '/terms', icon: 'edit' as IconName, iconColor: 'text-blue-500' },
  ];

  handleLogout(): void {
    this.auth.logout();
    this.closed.emit();
    this.router.navigate(['/']);
  }
}
