import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EventCountdown } from '@zgadajsie/shared';
import { TimeUnitPipe } from '../../../pipes/time-unit.pipe';

export type EnrollmentInfoBannerVariant = 'pre-enrollment' | 'cancelled';

interface BannerConfig {
  title: string;
  description: string;
  faqAnchor?: string;
  faqLinkLabel: string;
}

const BANNER_CONFIG: Record<EnrollmentInfoBannerVariant, BannerConfig> = {
  'pre-enrollment': {
    title: 'TRWAJĄ PRE-ZAPISY',
    description:
      'Miejsca zostaną rozlosowane 48 godz. przed wydarzeniem spośród użytkowników z poniższej listy "Oczekujących". Po losowaniu otrzymasz powiadomienie o wyniku.',
    faqAnchor: 'pre-enrollment',
    faqLinkLabel: 'Dowiedz się więcej',
  },
  cancelled: {
    title: 'WYDARZENIE ODWOŁANE',
    description:
      'Organizator odwołał to wydarzenie. W momencie odwołania wszyscy ówcześni uczestnicy zostali automatycznie wypisani, a środki z opłat (jeśli były) zostały zwrócone w formie voucherów organizatora.',
    faqAnchor: 'cancelled-event',
    faqLinkLabel: 'Dowiedz się więcej',
  },
};

@Component({
  selector: 'app-enrollment-info-banner',
  imports: [TimeUnitPipe],
  templateUrl: './enrollment-info-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentInfoBannerComponent {
  readonly variant = input.required<EnrollmentInfoBannerVariant>();
  readonly countdown = input<EventCountdown | null>(null);

  readonly config = computed(() => BANNER_CONFIG[this.variant()]);
  readonly faqHref = computed(() => {
    const anchor = this.config().faqAnchor;
    return anchor ? `/faq#${anchor}` : null;
  });
  readonly showCountdown = computed(() => {
    const cd = this.countdown();
    return !!cd && !cd.isEnded;
  });
}
