import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-share-overlay',
  imports: [CommonModule, BottomOverlayComponent, LinkListComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Udostępnij" (closed)="closed.emit()">
      <div class="space-y-3 max-w-lg mx-auto">
        <p class="text-sm text-neutral-500">
          Przekaż informację o wydarzeniu znajomym jednym kliknięciem.
        </p>

        <app-link-list [items]="shareLinks" (itemClicked)="handleShareClick($event)" />
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareOverlayComponent {
  private readonly document = inject(DOCUMENT);
  private readonly snackbar = inject(SnackbarService);

  readonly closed = output<void>();

  readonly shareLinks: LinkListItem[] = [
    { label: 'Facebook', icon: 'facebook', value: 'facebook', iconColor: 'info' },
    { label: 'X (Twitter)', icon: 'x-twitter', value: 'twitter', iconColor: 'neutral' },
    { label: 'WhatsApp', icon: 'whatsapp', value: 'whatsapp', iconColor: 'success' },
    { label: 'Email', icon: 'mail', value: 'email', iconColor: 'danger' },
    { label: 'Kopiuj link', icon: 'copy', value: 'copy', iconColor: 'neutral' },
  ];

  handleShareClick(item: LinkListItem): void {
    switch (item.value) {
      case 'facebook':
        this.shareToFacebook();
        break;
      case 'twitter':
        this.shareToTwitter();
        break;
      case 'whatsapp':
        this.shareToWhatsApp();
        break;
      case 'email':
        this.shareToEmail();
        break;
      case 'copy':
        this.copyLink();
        break;
    }
  }

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
