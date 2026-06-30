import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  COLOR_PALETTE,
  EventSeriesRecurrenceType,
  STATUS_INDICATORS,
  type StatusIndicatorType,
} from '@zgadajsie/shared';
import { RecurrencePickerComponent } from '../../../../shared/event-form/ui/recurrence-picker/recurrence-picker.component';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { ButtonAppearance, ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { CapacityProgressComponent } from '../../../../shared/ui/capacity-progress/capacity-progress.component';
import { EventInfoItemComponent } from '../../../../shared/ui/event-info-item/event-info-item.component';
import { SemanticColor } from '../../../../shared/types/colors';
import {
  EventStatusBarConfig,
  EventStatusBarItemComponent,
  EventStatusBarVariant,
} from '../../../../features/event/ui/event-status-bars/event-status-bar-item/event-status-bar-item.component';
import { EVENT_LIFECYCLE_CONFIG } from '../../../../features/event/constants/event-status-messages';
import {
  UserAvatarComponent,
  AvatarSize,
  AvatarShape,
} from '../../../../shared/user/ui/user-avatar/user-avatar.component';
import { UserProfileCardComponent } from '../../../../shared/user/ui/user-profile-card/user-profile-card.component';
import { StatusIndicatorComponent } from '../../../../shared/ui/status-indicator/status-indicator.component';
import { ExplainerTriggerComponent } from '../../../../shared/ui/explainer/explainer-trigger.component';

interface ColorSwatch {
  shade: string;
  hex: string;
}

interface ColorPalette {
  name: string;
  description: string;
  token?: string;
  swatches: ColorSwatch[];
}

const FOUNDATION_META: Array<{
  key: keyof typeof COLOR_PALETTE;
  name: string;
  description: string;
}> = [
  { key: 'red', name: 'Red', description: 'Bazowy czerwony (używany przez danger)' },
  { key: 'orange', name: 'Orange', description: 'Bazowy pomarańczowy (używany przez warning)' },
  { key: 'yellow', name: 'Yellow', description: 'Dekoracyjny żółty' },
  { key: 'green', name: 'Green', description: 'Bazowy zielony (używany przez success)' },
  { key: 'mint', name: 'Mint', description: 'Bazowy miętowy (używany przez primary)' },
  { key: 'blue', name: 'Blue', description: 'Bazowy niebieski (używany przez info)' },
  { key: 'magenta', name: 'Magenta', description: 'Dekoracyjny fioletowy' },
  { key: 'pink', name: 'Pink', description: 'Dekoracyjny różowy' },
  { key: 'brown', name: 'Brown', description: 'Dekoracyjny brązowy' },
  { key: 'dark', name: 'Dark', description: 'Bazowa skala szarości (używana przez neutral)' },
];

const SEMANTIC_META: Array<{
  token: string;
  key: keyof typeof COLOR_PALETTE;
  name: string;
  description: string;
}> = [
  {
    token: 'primary',
    key: 'mint',
    name: 'Primary (mint)',
    description: 'Brand, CTA, przyciski, linki, akcenty',
  },
  {
    token: 'neutral',
    key: 'dark',
    name: 'Neutral (dark/gray)',
    description: 'Tła, tekst, bordery, ikony muted',
  },
  {
    token: 'success',
    key: 'green',
    name: 'Success (green)',
    description: 'Pozytywne statusy, potwierdzenia',
  },
  {
    token: 'warning',
    key: 'orange',
    name: 'Warning (orange)',
    description: 'Ostrzeżenia, countdown urgent',
  },
  {
    token: 'danger',
    key: 'red',
    name: 'Danger (red)',
    description: 'Błędy, usuwanie, destrukcyjne akcje',
  },
  {
    token: 'info',
    key: 'blue',
    name: 'Info (blue)',
    description: 'Informacje, focus ring, linki informacyjne',
  },
];

function paletteSwatches(key: keyof typeof COLOR_PALETTE): ColorSwatch[] {
  return Object.entries(COLOR_PALETTE[key]).map(([shade, hex]) => ({ shade, hex: hex as string }));
}

@Component({
  selector: 'app-design-system',
  imports: [
    IconComponent,
    ButtonComponent,
    BadgeComponent,
    CapacityProgressComponent,
    EventInfoItemComponent,
    EventStatusBarItemComponent,
    UserAvatarComponent,
    UserProfileCardComponent,
    StatusIndicatorComponent,
    ExplainerTriggerComponent,
    RecurrencePickerComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './design-system.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemComponent {
  private readonly fb = inject(FormBuilder);

  readonly recurrencePickerIntervalForm = this.fb.group({
    recurrenceType: [EventSeriesRecurrenceType.INTERVAL],
    intervalDays: [7],
    daysOfWeek: [[] as number[]],
    time: ['20:00'],
    durationMinutes: [90],
    startDate: [new Date().toISOString().substring(0, 10)],
    endDate: [''],
  });

  readonly recurrencePickerWeeklyForm = this.fb.group({
    recurrenceType: [EventSeriesRecurrenceType.WEEKLY],
    intervalDays: [7],
    daysOfWeek: [[1, 4]],
    time: ['18:30'],
    durationMinutes: [60],
    startDate: [new Date().toISOString().substring(0, 10)],
    endDate: [''],
  });
  readonly activeSection = signal<string>('colors');
  readonly semanticColors: SemanticColor[] = [
    'primary',
    'success',
    'danger',
    'warning',
    'info',
    'neutral',
  ];
  readonly buttonAppearances: ButtonAppearance[] = ['solid', 'soft', 'outline', 'ghost', 'link'];
  readonly badgeVariants = ['solid', 'soft', 'outline', 'ghost'] as const;

  readonly avatarSizes: AvatarSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  readonly avatarShapes: AvatarShape[] = ['circle', 'rounded'];
  readonly avatarExamples = [
    { id: 'demo-user-1', displayName: 'Jan Kowalski', avatarSeed: null },
    { id: 'demo-user-2', displayName: 'Anna Nowak', avatarSeed: 'abc123' },
    { id: 'demo-user-3', displayName: 'Marek Zieliński', avatarSeed: null },
    { id: 'demo-user-4', displayName: 'Katarzyna Wójcik', avatarSeed: 'xyz789' },
  ];

  readonly statusIndicatorTypes: StatusIndicatorType[] = Object.keys(
    STATUS_INDICATORS,
  ) as StatusIndicatorType[];

  readonly sections = [
    { id: 'colors', label: 'Kolory' },
    { id: 'typography', label: 'Typografia' },
    { id: 'icons', label: 'Ikony' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'components', label: 'Komponenty' },
    { id: 'avatars', label: 'Avatary' },
    { id: 'profile-card', label: 'Profile Card' },
    { id: 'event-status-bars', label: 'Status bars' },
    { id: 'cover-images', label: 'Cover Images' },
  ];

  readonly profileCardDemoUser = signal({
    id: 'demo-profile-user',
    displayName: 'Jan Kowalski',
    email: 'jan.kowalski@example.com',
    avatarSeed: 'demo-seed-123',
  });
  readonly profileCardDraftName = signal('Nowa nazwa');
  readonly profileCardDraftSeed = signal<string | null>('draft-seed');

  readonly coverImageExamples = [
    {
      id: 'demo-cover-1',
      name: 'Meczyk piłkarski',
      storageKey: 'cover-images/public/football/demo1.webp',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-cover-2',
      name: 'Koszykówka sparing',
      storageKey: 'cover-images/public/basketball/demo2.webp',
      createdAt: new Date().toISOString(),
    },
  ];

  // ════════════════════════════════════════════════════════
  // SEMANTIC PALETTES - główne palety do użycia w komponentach
  // Mapowane na CSS vars w _tokens.scss; initial hex override'owane przez CSS vars w konstruktorze
  // ════════════════════════════════════════════════════════
  readonly semanticPalettes = signal<ColorPalette[]>(
    SEMANTIC_META.map(({ token, key, name, description }) => ({
      token,
      name,
      description,
      swatches: paletteSwatches(key),
    })),
  );

  constructor() {
    afterNextRender(() => this.syncSemanticPalettesFromCssVars());
  }

  // ════════════════════════════════════════════════════════
  // FOUNDATION PALETTES - raw kolory z libs/src/lib/constants/color-palette.ts
  // Dostępne dla dekoracji, kart kolorowych, akcentów
  // ════════════════════════════════════════════════════════
  readonly foundationPalettes: ColorPalette[] = FOUNDATION_META.map(
    ({ key, name, description }) => ({
      name,
      description,
      swatches: paletteSwatches(key),
    }),
  );

  readonly allIcons: IconName[] = [
    'menu',
    'more-horizontal',
    'close',
    'chevron-down',
    'chevron-left',
    'chevron-right',
    'chevron-up',
    'sun',
    'moon',
    'home',
    'calendar',
    'user',
    'user-check',
    'search',
    'settings',
    'plus',
    'minus',
    'check',
    'x',
    'heart',
    'share',
    'send',
    'message-circle',
    'bell',
    'bell-off',
    'map-pin',
    'clock',
    'dollar-sign',
    'credit-card',
    'wallet',
    'upload',
    'trash',
    'edit',
    'copy',
    'users',
    'user-plus',
    'user-x',
    'shield',
    'shield-alert',
    'star',
    'trophy',
    'flag',
    'arrow-left',
    'arrow-right',
    'arrow-up',
    'arrow-down',
    'external-link',
    'log-in',
    'log-out',
    'eye',
    'eye-off',
    'lock',
    'unlock',
    'mail',
    'phone',
    'image',
    'camera',
    'filter',
    'sort',
    'loader',
    'facebook',
    'x-twitter',
    'whatsapp',
    'alert-triangle',
    'help',
    'help-circle',
    'check-circle',
    'list',
    'hanger',
    'toilet',
    'ball',
    'bookmark',
    'coffee',
    'crosshair',
  ];

  readonly spacingScale = [
    { name: '0.5', rem: '0.125rem', px: '2px' },
    { name: '1', rem: '0.25rem', px: '4px' },
    { name: '2', rem: '0.5rem', px: '8px' },
    { name: '3', rem: '0.75rem', px: '12px' },
    { name: '4', rem: '1rem', px: '16px' },
    { name: '5', rem: '1.25rem', px: '20px' },
    { name: '6', rem: '1.5rem', px: '24px' },
    { name: '8', rem: '2rem', px: '32px' },
    { name: '10', rem: '2.5rem', px: '40px' },
    { name: '12', rem: '3rem', px: '48px' },
    { name: '16', rem: '4rem', px: '64px' },
  ];

  readonly progressExamples = [
    { participantsCount: 0, max: 10 },
    { participantsCount: 1, max: 10 },
    { participantsCount: 2, max: 10 },
    { participantsCount: 3, max: 10 },
    { participantsCount: 4, max: 10 },
    { participantsCount: 5, max: 10 },
    { participantsCount: 6, max: 10 },
    { participantsCount: 7, max: 10 },
    { participantsCount: 8, max: 10 },
    { participantsCount: 9, max: 10 },
    { participantsCount: 10, max: 10 },
    { participantsCount: 5, max: 0 },
  ];

  // ════════════════════════════════════════════════════════
  // EVENT STATUS BARS - statusy cyklu życia wydarzenia
  // Źródło prawdy: event-status-messages.ts → EVENT_LIFECYCLE_CONFIG
  // Pokazywany gdy NIE ma participation bara
  // ════════════════════════════════════════════════════════
  readonly eventStatusBarExamples: EventStatusBarConfig[] = (
    ['UPCOMING', 'ONGOING', 'ENDED', 'CANCELLED'] as const
  ).map((status) => {
    const cfg = EVENT_LIFECYCLE_CONFIG[status];
    return {
      id: status.toLowerCase(),
      color: cfg.color,
      title: cfg.title,
      subtitle: cfg.subtitle,
      bgClass: cfg.appearance.bgClass,
      borderClass: cfg.appearance.borderClass,
    };
  });

  // ════════════════════════════════════════════════════════
  // PARTICIPATION STATUS BAR - jeden wariant z listingiem uczestników
  // Wyświetlany TYLKO gdy: lifecycleStatus === 'UPCOMING' + user ma zapisy
  // Kolor: taki sam jak UPCOMING event bar (bg-primary-500)
  // Źródło: EventAreaService.notificationBars → config.appearance dla UPCOMING
  // ════════════════════════════════════════════════════════
  readonly participationStatusBarExamples: EventStatusBarConfig[] = [
    {
      id: 'participation-single',
      title: 'Jesteś zapisany:',
      bgClass: 'bg-primary-500',
      borderClass: 'border-2 border-primary-500',
      enrollments: [{ id: 'demo-user-1', displayName: 'Jan Kowalski' }],
    },
    {
      id: 'participation-multi',
      title: 'Jesteś zapisany:',
      bgClass: 'bg-primary-500',
      borderClass: 'border-2 border-primary-500',
      enrollments: [
        { id: 'demo-user-1', displayName: 'Jan Kowalski' },
        { id: 'demo-user-2', displayName: 'Anna Nowak' },
        { id: 'demo-user-3', displayName: 'Marek Zieliński' },
      ],
    },
  ];

  readonly statusBarVariants: EventStatusBarVariant[] = ['inline', 'sticky'];

  // ════════════════════════════════════════════════════════
  // BADGE COLOR PROPOSAL - Foundation Palettes (głębsze odcienie)
  // Wybrane tak, aby pasowały do białej czcionki (text-white)
  // i były maksymalnie zróżnicowane wizualnie
  // ════════════════════════════════════════════════════════
  readonly badgeColorProposal = [
    { name: 'Red', shade: '700', hex: COLOR_PALETTE.red[700], tailwind: 'bg-red-700' },
    { name: 'Yellow', shade: '800', hex: COLOR_PALETTE.yellow[800], tailwind: 'bg-yellow-800' },
    { name: 'Green', shade: '700', hex: COLOR_PALETTE.green[700], tailwind: 'bg-green-700' },
    { name: 'Mint', shade: '700', hex: COLOR_PALETTE.mint[700], tailwind: 'bg-mint-700' },
    { name: 'Blue', shade: '700', hex: COLOR_PALETTE.blue[700], tailwind: 'bg-blue-700' },
    { name: 'Magenta', shade: '700', hex: COLOR_PALETTE.magenta[700], tailwind: 'bg-magenta-700' },
    { name: 'Pink', shade: '700', hex: COLOR_PALETTE.pink[700], tailwind: 'bg-pink-700' },
    { name: 'Brown', shade: '700', hex: COLOR_PALETTE.brown[700], tailwind: 'bg-brown-700' },
    { name: 'Dark', shade: '800', hex: COLOR_PALETTE.dark[800], tailwind: 'bg-dark-800' },
  ];

  // ════════════════════════════════════════════════════════
  // BADGE BRIGHT PROPOSAL - Foundation Palettes (jasne, nie pastelowe)
  // Wybrane tak, aby pasowały do ciemnej czcionki (text-neutral-900)
  // i były bardziej nasycone niż pastele
  // ════════════════════════════════════════════════════════
  readonly badgeBrightProposal = [
    { name: 'Red', shade: '200', hex: COLOR_PALETTE.red[200], tailwind: 'bg-red-200' },
    { name: 'Yellow', shade: '200', hex: COLOR_PALETTE.yellow[200], tailwind: 'bg-yellow-200' },
    { name: 'Green', shade: '200', hex: COLOR_PALETTE.green[200], tailwind: 'bg-green-200' },
    { name: 'Mint', shade: '200', hex: COLOR_PALETTE.mint[200], tailwind: 'bg-mint-200' },
    { name: 'Blue', shade: '200', hex: COLOR_PALETTE.blue[200], tailwind: 'bg-blue-200' },
    { name: 'Magenta', shade: '200', hex: COLOR_PALETTE.magenta[200], tailwind: 'bg-magenta-200' },
    { name: 'Pink', shade: '200', hex: COLOR_PALETTE.pink[200], tailwind: 'bg-pink-200' },
    { name: 'Brown', shade: '200', hex: COLOR_PALETTE.brown[200], tailwind: 'bg-brown-200' },
    { name: 'Dark', shade: '200', hex: COLOR_PALETTE.dark[200], tailwind: 'bg-dark-200' },
  ];

  // ════════════════════════════════════════════════════════
  // BADGE PASTEL PROPOSAL - Foundation Palettes (pastelowe odcienie)
  // Wybrane tak, aby pasowały do ciemnej czcionki (text-neutral-900)
  // i były maksymalnie zróżnicowane wizualnie
  // ════════════════════════════════════════════════════════
  readonly badgePastelProposal = [
    { name: 'Red', shade: '100', hex: COLOR_PALETTE.red[100], tailwind: 'bg-red-100' },
    { name: 'Yellow', shade: '100', hex: COLOR_PALETTE.yellow[100], tailwind: 'bg-yellow-100' },
    { name: 'Green', shade: '100', hex: COLOR_PALETTE.green[100], tailwind: 'bg-green-100' },
    { name: 'Mint', shade: '100', hex: COLOR_PALETTE.mint[100], tailwind: 'bg-mint-100' },
    { name: 'Blue', shade: '100', hex: COLOR_PALETTE.blue[100], tailwind: 'bg-blue-100' },
    { name: 'Magenta', shade: '100', hex: COLOR_PALETTE.magenta[100], tailwind: 'bg-magenta-100' },
    { name: 'Pink', shade: '100', hex: COLOR_PALETTE.pink[100], tailwind: 'bg-pink-100' },
    { name: 'Brown', shade: '100', hex: COLOR_PALETTE.brown[100], tailwind: 'bg-brown-100' },
    { name: 'Dark', shade: '100', hex: COLOR_PALETTE.dark[100], tailwind: 'bg-dark-100' },
  ];

  setSection(id: string): void {
    this.activeSection.set(id);
  }

  private syncSemanticPalettesFromCssVars(): void {
    const rootStyles = getComputedStyle(document.documentElement);

    const synced = this.semanticPalettes().map((palette) => {
      const token = palette.token;

      if (!token) {
        return palette;
      }

      return {
        ...palette,
        swatches: palette.swatches.map((swatch) => {
          const resolvedHex = this.resolveCssVariableHex(rootStyles, token, swatch.shade);

          return resolvedHex ? { ...swatch, hex: resolvedHex } : swatch;
        }),
      };
    });

    this.semanticPalettes.set(synced);
  }

  private resolveCssVariableHex(
    rootStyles: CSSStyleDeclaration,
    token: string,
    shade: string,
  ): string | null {
    const rawValue = rootStyles.getPropertyValue(`--color-${token}-${shade}`).trim();

    if (!rawValue) {
      return null;
    }

    const channels = rawValue.split(/\s+/).map((channel) => Number(channel));

    if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
      return null;
    }

    return `#${channels
      .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
      .join('')}`;
  }

  isDark(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 < 150;
  }
}
