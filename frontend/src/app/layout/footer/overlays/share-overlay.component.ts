import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { IconComponent, IconName } from '../../../core/icons/icon.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';

interface ShareOption {
  name: string;
  icon: IconName;
  iconColor: string;
  action: () => void;
}

@Component({
  selector: 'app-share-overlay',
  imports: [CommonModule, IconComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Udostępnij" (closed)="closed.emit()">
      <div class="space-y-3">
        <p class="text-sm text-neutral-500">
          Przekaż informację o wydarzeniu znajomym jednym kliknięciem.
        </p>

        <div
          class="overflow-hidden rounded-2xl border border-neutral-200 divide-y divide-neutral-200"
        >
          @for (option of shareOptions; track option.name) {
          <button
            type="button"
            (click)="option.action()"
            class="group flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-neutral-700"
          >
            <div class="flex items-center gap-3">
              <app-icon [name]="option.icon" size="md" [ngClass]="option.iconColor" />
              <span class="text-sm font-medium text-neutral-900">
                {{ option.name }}
              </span>
            </div>
            <app-icon
              name="chevron-right"
              size="sm"
              class="text-neutral-400 transition-transform group-hover:translate-x-1"
            />
          </button>
          }
        </div>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareOverlayComponent {
  private readonly document = inject(DOCUMENT);
  private readonly snackbar = inject(SnackbarService);

  readonly closed = output<void>();

  readonly shareOptions: ShareOption[] = [
    {
      name: 'Facebook',
      icon: 'facebook',
      iconColor: 'text-info-400',
      action: () => this.shareToFacebook(),
    },
    {
      name: 'X (Twitter)',
      icon: 'x-twitter',
      iconColor: 'text-neutral-900',
      action: () => this.shareToTwitter(),
    },
    {
      name: 'WhatsApp',
      icon: 'whatsapp',
      iconColor: 'text-success-400',
      action: () => this.shareToWhatsApp(),
    },
    {
      name: 'Email',
      icon: 'mail',
      iconColor: 'text-danger-300',
      action: () => this.shareToEmail(),
    },
    {
      name: 'Kopiuj link',
      icon: 'copy',
      iconColor: 'text-neutral-500',
      action: () => this.copyLink(),
    },
  ];

  private getCurrentUrl(): string {
    return this.document.location.href;
  }

  private shareToFacebook(): void {
    const url = encodeURIComponent(this.getCurrentUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    this.closed.emit();
  }

  private shareToTwitter(): void {
    const url = encodeURIComponent(this.getCurrentUrl());
    const text = encodeURIComponent('Sprawdź to na ZgadajSię!');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    this.closed.emit();
  }

  private shareToWhatsApp(): void {
    const text = encodeURIComponent(`Sprawdź to na ZgadajSię! ${this.getCurrentUrl()}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    this.closed.emit();
  }

  private shareToEmail(): void {
    const subject = encodeURIComponent('Sprawdź to na ZgadajSię!');
    const body = encodeURIComponent(
      `Pomyślałem, że może Cię to zainteresować:\n\n${this.getCurrentUrl()}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.closed.emit();
  }

  private async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getCurrentUrl());
      this.snackbar.show('Link skopiowany do schowka!', 'success');
    } catch {
      this.snackbar.show('Nie udało się skopiować linku', 'error');
    }
    this.closed.emit();
  }
}
