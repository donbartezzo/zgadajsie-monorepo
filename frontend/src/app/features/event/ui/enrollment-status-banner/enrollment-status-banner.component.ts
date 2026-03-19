import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconComponent, IconName } from '../../../../core/icons/icon.component';
import { EnrollmentPhase } from '../../../../shared/types/event.interface';
import { EventTimeStatus } from '../../../../shared/utils/event-time-status.util';
import { BottomOverlaysService } from '../../../../shared/ui/bottom-overlays/bottom-overlays.service';

type BannerVariant = 'info' | 'warning' | 'success' | 'danger' | 'neutral';

interface BannerConfig {
  icon: IconName;
  variant: BannerVariant;
  title: string;
  subtitle: string;
}

const VARIANT_STYLES: Record<
  BannerVariant,
  { container: string; iconBg: string; icon: string; title: string }
> = {
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
    @if (config(); as c) { @let _styles = variantStyles();
    <button type="button" class="w-full text-left" (click)="openDetails()">
      <div [class]="'rounded-xl border p-3 ' + _styles.container" role="status">
        <div class="flex items-start gap-3">
          <div
            [class]="'flex shrink-0 items-center justify-center rounded-lg p-2 ' + _styles.iconBg"
          >
            <app-icon [name]="c.icon" size="sm" [class]="_styles.icon" />
          </div>
          <div class="min-w-0 flex-1">
            <p [class]="'text-sm font-semibold leading-tight ' + _styles.title">
              {{ c.title }}
            </p>
            <p class="mt-0.5 text-xs leading-relaxed text-neutral-500">{{ c.subtitle }}</p>
            <p class="mt-1 text-[10px] text-neutral-400 underline underline-offset-2">
              Kliknij, aby poznać szczegóły
            </p>
          </div>
          <app-icon name="chevron-right" size="sm" class="mt-1 shrink-0 text-neutral-300" />
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
      return {
        icon: 'x',
        variant: 'danger',
        title: 'Wydarzenie odwołane',
        subtitle: 'Zapisy zamknięte',
      };
    }

    const ts = this.eventTimeStatus();
    if (ts === 'ENDED') {
      return {
        icon: 'clock',
        variant: 'neutral',
        title: 'Zakończone',
        subtitle: 'Wydarzenie już się odbyło',
      };
    }
    if (ts === 'ONGOING') {
      return {
        icon: 'clock',
        variant: 'success',
        title: 'W trakcie',
        subtitle: 'Nowe zapisy niemożliwe',
      };
    }

    const phase = this.enrollmentPhase();
    const count = this.participantCount();
    if (phase === 'PRE_ENROLLMENT') {
      const countLabel = count > 0 ? ` · ${count} zgłoszonych` : '';
      return {
        icon: 'users',
        variant: 'info',
        title: 'Wstępne zapisy',
        subtitle: 'Trwa faza wstępnych zgłoszeń' + countLabel,
      };
    }
    if (phase === 'LOTTERY_PENDING') {
      return {
        icon: 'loader',
        variant: 'warning',
        title: 'Trwa losowanie',
        subtitle: 'Wyniki wkrótce',
      };
    }
    if (phase === 'OPEN_ENROLLMENT') {
      return {
        icon: 'check-circle',
        variant: 'success',
        title: 'Zapisy otwarte',
        subtitle: 'Dołącz teraz',
      };
    }

    return null;
  });

  readonly variantStyles = computed(() => {
    const v = this.config()?.variant ?? 'neutral';
    return VARIANT_STYLES[v];
  });

  // ── Methods ──
  openDetails(): void {
    this.overlays.open('enrollmentDetails');
  }
}
