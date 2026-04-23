import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { SemanticColor } from '../../../../shared/types/colors';
import { EnrollmentPhase } from '../../../../shared/types/event.interface';
import { EventTimeStatus } from '@zgadajsie/shared';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { EVENT_STATUS_MESSAGES } from '../../constants/event-status-messages';

interface BannerConfig {
  icon: IconName;
  color: SemanticColor;
  title: string;
  subtitle: string;
  description?: string;
}

const VARIANT_STYLES: Record<
  SemanticColor,
  { container: string; iconBg: string; icon: string; title: string }
> = {
  primary: {
    container: 'border-primary-200 bg-primary-50',
    iconBg: 'bg-primary-100',
    icon: 'text-primary-600',
    title: 'text-primary-700',
  },
  info: {
    container: 'border-info-200 bg-info-50',
    iconBg: 'bg-info-100',
    icon: 'text-info-600',
    title: 'text-info-700',
  },
  warning: {
    container: 'border-warning-200 bg-warning-50',
    iconBg: 'bg-warning-100',
    icon: 'text-warning-600',
    title: 'text-warning-700',
  },
  success: {
    container: 'border-success-200 bg-success-50',
    iconBg: 'bg-success-100',
    icon: 'text-success-600',
    title: 'text-success-700',
  },
  danger: {
    container: 'border-danger-200 bg-danger-50',
    iconBg: 'bg-danger-100',
    icon: 'text-danger-600',
    title: 'text-danger-700',
  },
  neutral: {
    container: 'border-neutral-200 bg-neutral-100',
    iconBg: 'bg-neutral-200',
    icon: 'text-neutral-500',
    title: 'text-neutral-700',
  },
};

@Component({
  selector: 'app-enrollment-status-banner',
  imports: [IconComponent],
  template: `
    @if (config(); as c) {
      @let _styles = variantStyles();
      <button type="button" class="w-full text-left" (click)="openDetails()">
        <div [class]="'rounded-xl border-3 p-3 ' + _styles.container" role="status">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1 text-center">
              <p [class]="'text-base sm:text-xl font-semibold leading-tight ' + _styles.title">
                {{ c.title }}
              </p>
              <p class="mt-0.5 text-xs sm:text-sm leading-relaxed text-neutral-500">
                {{ c.subtitle }}
              </p>
            </div>
          </div>
          <div class="mt-1 text-end text-[10px] text-neutral-400 underline underline-offset-2">
            Kliknij, aby poznać szczegóły
          </div>
        </div>
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentStatusBannerComponent {
  private readonly overlays = inject(BottomOverlaysService);

  // ── Inputs ──
  readonly enrollmentPhase = input<EnrollmentPhase | null>(null);
  readonly eventTimeStatus = input<EventTimeStatus | null>(null);
  readonly isCancelled = input(false);
  readonly participantCount = input(0);

  // ── Computed ──
  readonly config = computed<BannerConfig | null>(() => {
    if (this.isCancelled()) {
      const msg = EVENT_STATUS_MESSAGES.CANCELLED;
      return { icon: msg.icon, color: msg.color, title: msg.title, subtitle: msg.description };
    }

    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') {
      const msg = EVENT_STATUS_MESSAGES.ENDED;
      return { icon: msg.icon, color: msg.color, title: msg.title, subtitle: msg.description };
    }
    if (ts === 'ONGOING') {
      const msg = EVENT_STATUS_MESSAGES.ONGOING;
      return { icon: msg.icon, color: msg.color, title: msg.title, subtitle: msg.description };
    }

    const phase = this.enrollmentPhase();
    const count = this.participantCount();
    if (phase === 'PRE_ENROLLMENT') {
      const countLabel = count > 0 ? ` · ${count} zgłoszonych` : '';
      return {
        icon: 'users',
        color: 'info',
        title: 'Wstępne zapisy',
        subtitle: 'Trwa faza wstępnych zgłoszeń' + countLabel,
      };
    }
    if (phase === 'LOTTERY_PENDING') {
      return {
        icon: 'loader',
        color: 'warning',
        title: 'Trwa losowanie',
        subtitle: 'Wyniki wkrótce',
      };
    }
    if (phase === 'OPEN_ENROLLMENT') {
      return {
        icon: 'check-circle',
        color: 'success',
        title: 'Zapisy otwarte',
        subtitle: 'Dołącz teraz',
      };
    }

    return null;
  });

  readonly variantStyles = computed(() => {
    const v = this.config()?.color ?? 'neutral';
    return VARIANT_STYLES[v];
  });

  // ── Methods ──
  openDetails(): void {
    this.overlays.open('enrollmentDetails');
  }
}
