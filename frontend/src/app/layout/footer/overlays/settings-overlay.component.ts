import { ChangeDetectionStrategy, Component, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-settings-overlay',
  imports: [CommonModule, BottomOverlayComponent, LinkListComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Ustawienia" (closed)="closed.emit()">
      <div class="space-y-3 max-w-lg mx-auto">
        <p class="text-sm text-neutral-500">
          Zarządzaj kontem, motywem i najważniejszymi informacjami o platformie.
        </p>

        @if (auth.isLoggedIn()) {
          <section class="space-y-1.5">
            <p class="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Konto</p>
            <app-link-list [items]="accountLinks()" (itemClicked)="handleAccountClick($event)" />
          </section>
        }

        <section class="space-y-1.5">
          <p class="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Informacje
          </p>
          <app-link-list [items]="infoLinks" (itemClicked)="handleInfoClick($event)" />
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

  readonly accountLinks = computed<LinkListItem[]>(() => [
    { label: 'Mój profil', icon: 'user', value: 'profile' },
    { label: 'Wyloguj się', icon: 'log-out', value: 'logout', iconColor: 'danger' },
  ]);

  readonly infoLinks: LinkListItem[] = [
    { label: 'Dołącz do nas', icon: 'users', value: '/join-us', iconColor: 'primary' },
    { label: 'FAQ', icon: 'search', value: '/faq', iconColor: 'info' },
    { label: 'Kontakt', icon: 'mail', value: '/contact', iconColor: 'warning' },
    { label: 'Polityka prywatności', icon: 'shield', value: '/privacy', iconColor: 'success' },
    { label: 'Regulamin', icon: 'edit', value: '/terms', iconColor: 'info' },
  ];

  handleAccountClick(item: LinkListItem): void {
    if (item.value === 'logout') {
      this.auth.logout();
      this.closed.emit();
      this.router.navigate(['/']);
    } else if (item.value === 'profile') {
      this.router.navigate(['/profile']);
      this.closed.emit();
    }
  }

  handleInfoClick(item: LinkListItem): void {
    if (item.value) {
      this.router.navigate([item.value]);
      this.closed.emit();
    }
  }
}
