import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  effect,
  signal,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { APP_BRAND, nowInZone, ContactSource } from '@zgadajsie/shared';
import { environment } from '../../../environments/environment';
import { BottomOverlaysService } from '../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { SectionSeparatorComponent } from '../../shared/ui/section-separator/section-separator.component';
import { LoadingSpinnerComponent } from '../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, SectionSeparatorComponent, LoadingSpinnerComponent],
  host: { class: 'mt-auto block' },
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly APP_BRAND = APP_BRAND;
  readonly currentYear = nowInZone().year;
  readonly appVersion = environment.version;

  private readonly overlays = inject(BottomOverlaysService);
  private readonly router = inject(Router);

  // @TMP:
  readonly adBannerUrl: string | null = null;
  readonly adBannerImage = `${environment.publicMediaUrl}/ad-images/cities/zielona-gora.webp`;

  readonly currentUrl = signal(this.router.url);
  readonly isPageLoaded = signal(false);

  constructor() {
    effect(() => {
      this.currentUrl.set(this.router.url);
    });

    // Delay ad banner display to avoid flickering before content loads
    setTimeout(() => {
      this.isPageLoaded.set(true);
    }, 500);
  }

  readonly shouldShowAdBanner = computed(() => {
    const url = this.currentUrl();
    return this.isPageLoaded() && url.includes('/w/zielona-gora');
  });

  openAdContact(): void {
    this.overlays.openContact(undefined, ContactSource.ADVERTISEMENT);
  }

  handleAdBannerClick(): void {
    if (this.adBannerUrl) {
      window.open(this.adBannerUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
