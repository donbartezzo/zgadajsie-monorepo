import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import { ButtonAppearance, ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { CapacityProgressComponent } from '../../../../shared/ui/capacity-progress/capacity-progress.component';
import { SemanticColor } from '../../../../shared/types/colors';

interface ColorSwatch {
  shade: string;
  hex: string;
}

interface ColorPalette {
  name: string;
  description: string;
  swatches: ColorSwatch[];
}

@Component({
  selector: 'app-design-system',
  imports: [IconComponent, ButtonComponent, BadgeComponent, CapacityProgressComponent],
  templateUrl: './design-system.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemComponent {
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

  readonly sections = [
    { id: 'colors', label: 'Kolory' },
    { id: 'typography', label: 'Typografia' },
    { id: 'icons', label: 'Ikony' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'components', label: 'Komponenty' },
  ];

  // ════════════════════════════════════════════════════════
  // SEMANTIC PALETTES - główne palety do użycia w komponentach
  // Mapowane na CSS vars w _tokens.scss
  // ════════════════════════════════════════════════════════
  readonly semanticPalettes: ColorPalette[] = [
    {
      name: 'Primary (mint)',
      description: 'Brand, CTA, przyciski, linki, akcenty',
      swatches: [
        { shade: '50', hex: '#e8faf5' },
        { shade: '100', hex: '#d1f5ea' },
        { shade: '200', hex: '#a7edd8' },
        { shade: '300', hex: '#72dfbd' },
        { shade: '400', hex: '#48cfad' },
        { shade: '500', hex: '#37bc9b' },
        { shade: '600', hex: '#26a386' },
        { shade: '700', hex: '#1e826b' },
        { shade: '800', hex: '#186856' },
        { shade: '900', hex: '#124e40' },
      ],
    },
    {
      name: 'Neutral (dark/gray)',
      description: 'Tła, tekst, bordery, ikony muted',
      swatches: [
        { shade: '50', hex: '#f8f9fa' },
        { shade: '100', hex: '#eaecf0' },
        { shade: '200', hex: '#dadce2' },
        { shade: '300', hex: '#bcc0ca' },
        { shade: '400', hex: '#9ea2ae' },
        { shade: '500', hex: '#656d78' },
        { shade: '600', hex: '#434a54' },
        { shade: '700', hex: '#343941' },
        { shade: '800', hex: '#262a30' },
        { shade: '900', hex: '#1c1f23' },
        { shade: '950', hex: '#121417' },
      ],
    },
    {
      name: 'Success (green)',
      description: 'Pozytywne statusy, potwierdzenia',
      swatches: [
        { shade: '50', hex: '#f0f9e8' },
        { shade: '100', hex: '#dcf2cc' },
        { shade: '200', hex: '#c5e1a5' },
        { shade: '300', hex: '#a0d468' },
        { shade: '400', hex: '#8cc152' },
        { shade: '500', hex: '#6fa834' },
        { shade: '600', hex: '#558b2f' },
        { shade: '700', hex: '#437020' },
        { shade: '800', hex: '#305214' },
        { shade: '900', hex: '#1e350a' },
      ],
    },
    {
      name: 'Warning (orange)',
      description: 'Ostrzeżenia, countdown urgent',
      swatches: [
        { shade: '50', hex: '#fff3e0' },
        { shade: '100', hex: '#ffe0b2' },
        { shade: '200', hex: '#ffcc80' },
        { shade: '300', hex: '#fc6e51' },
        { shade: '400', hex: '#e9573f' },
        { shade: '500', hex: '#d84315' },
        { shade: '600', hex: '#bf360c' },
        { shade: '700', hex: '#a02e0a' },
        { shade: '800', hex: '#7f2508' },
        { shade: '900', hex: '#5c1a05' },
      ],
    },
    {
      name: 'Danger (red)',
      description: 'Błędy, usuwanie, destrukcyjne akcje',
      swatches: [
        { shade: '50', hex: '#feecee' },
        { shade: '100', hex: '#fcd4d9' },
        { shade: '200', hex: '#f9b4bc' },
        { shade: '300', hex: '#f28c96' },
        { shade: '400', hex: '#ed5565' },
        { shade: '500', hex: '#da4453' },
        { shade: '600', hex: '#c0392b' },
        { shade: '700', hex: '#a02020' },
        { shade: '800', hex: '#7a1a24' },
        { shade: '900', hex: '#501015' },
      ],
    },
    {
      name: 'Info (blue)',
      description: 'Informacje, focus ring, linki informacyjne',
      swatches: [
        { shade: '50', hex: '#e8f3fe' },
        { shade: '100', hex: '#c8e3fc' },
        { shade: '200', hex: '#9dccf8' },
        { shade: '300', hex: '#5d9cec' },
        { shade: '400', hex: '#4a89dc' },
        { shade: '500', hex: '#3070c4' },
        { shade: '600', hex: '#1565c0' },
        { shade: '700', hex: '#0d47a1' },
        { shade: '800', hex: '#0a3470' },
        { shade: '900', hex: '#072240' },
      ],
    },
  ];

  // ════════════════════════════════════════════════════════
  // FOUNDATION PALETTES - raw kolory z szablonu sticky-mobile
  // Dostępne dla dekoracji, kart kolorowych, akcentów
  // ════════════════════════════════════════════════════════
  readonly foundationPalettes: ColorPalette[] = [
    {
      name: 'Red',
      description: 'Bazowy czerwony (używany przez danger)',
      swatches: [
        { shade: '50', hex: '#feecee' },
        { shade: '100', hex: '#fcd4d9' },
        { shade: '200', hex: '#f9b4bc' },
        { shade: '300', hex: '#f28c96' },
        { shade: '400', hex: '#ed5565' },
        { shade: '500', hex: '#da4453' },
        { shade: '600', hex: '#c0392b' },
        { shade: '700', hex: '#a02020' },
        { shade: '800', hex: '#7a1a24' },
        { shade: '900', hex: '#501015' },
      ],
    },
    {
      name: 'Orange',
      description: 'Bazowy pomarańczowy (używany przez warning)',
      swatches: [
        { shade: '50', hex: '#fff3e0' },
        { shade: '100', hex: '#ffe0b2' },
        { shade: '200', hex: '#ffcc80' },
        { shade: '300', hex: '#fc6e51' },
        { shade: '400', hex: '#e9573f' },
        { shade: '500', hex: '#d84315' },
        { shade: '600', hex: '#bf360c' },
        { shade: '700', hex: '#a02e0a' },
        { shade: '800', hex: '#7f2508' },
        { shade: '900', hex: '#5c1a05' },
      ],
    },
    {
      name: 'Yellow',
      description: 'Dekoracyjny żółty',
      swatches: [
        { shade: '50', hex: '#fffde7' },
        { shade: '100', hex: '#fff9c4' },
        { shade: '200', hex: '#fff59d' },
        { shade: '300', hex: '#ffee58' },
        { shade: '400', hex: '#ffce54' },
        { shade: '500', hex: '#f6bb42' },
        { shade: '600', hex: '#f9a825' },
        { shade: '700', hex: '#f57f17' },
        { shade: '800', hex: '#e65100' },
        { shade: '900', hex: '#bf360c' },
      ],
    },
    {
      name: 'Green',
      description: 'Bazowy zielony (używany przez success)',
      swatches: [
        { shade: '50', hex: '#f0f9e8' },
        { shade: '100', hex: '#dcf2cc' },
        { shade: '200', hex: '#c5e1a5' },
        { shade: '300', hex: '#a0d468' },
        { shade: '400', hex: '#8cc152' },
        { shade: '500', hex: '#6fa834' },
        { shade: '600', hex: '#558b2f' },
        { shade: '700', hex: '#437020' },
        { shade: '800', hex: '#305214' },
        { shade: '900', hex: '#1e350a' },
      ],
    },
    {
      name: 'Mint',
      description: 'Bazowy miętowy (używany przez primary)',
      swatches: [
        { shade: '50', hex: '#e8faf5' },
        { shade: '100', hex: '#d1f5ea' },
        { shade: '200', hex: '#a7edd8' },
        { shade: '300', hex: '#72dfbd' },
        { shade: '400', hex: '#48cfad' },
        { shade: '500', hex: '#37bc9b' },
        { shade: '600', hex: '#26a386' },
        { shade: '700', hex: '#1e826b' },
        { shade: '800', hex: '#186856' },
        { shade: '900', hex: '#124e40' },
      ],
    },
    {
      name: 'Blue',
      description: 'Bazowy niebieski (używany przez info)',
      swatches: [
        { shade: '50', hex: '#e8f3fe' },
        { shade: '100', hex: '#c8e3fc' },
        { shade: '200', hex: '#9dccf8' },
        { shade: '300', hex: '#5d9cec' },
        { shade: '400', hex: '#4a89dc' },
        { shade: '500', hex: '#3070c4' },
        { shade: '600', hex: '#1565c0' },
        { shade: '700', hex: '#0d47a1' },
        { shade: '800', hex: '#0a3470' },
        { shade: '900', hex: '#072240' },
      ],
    },
    {
      name: 'Magenta',
      description: 'Dekoracyjny fioletowy',
      swatches: [
        { shade: '50', hex: '#f3effc' },
        { shade: '100', hex: '#e4daf8' },
        { shade: '200', hex: '#d4c4f4' },
        { shade: '300', hex: '#bfa8ee' },
        { shade: '400', hex: '#ac92ec' },
        { shade: '500', hex: '#967adc' },
        { shade: '600', hex: '#7c5cc4' },
        { shade: '700', hex: '#6244a8' },
        { shade: '800', hex: '#4a3380' },
        { shade: '900', hex: '#322258' },
      ],
    },
    {
      name: 'Pink',
      description: 'Dekoracyjny różowy',
      swatches: [
        { shade: '50', hex: '#fdf2f8' },
        { shade: '100', hex: '#fce7f3' },
        { shade: '200', hex: '#f9c4de' },
        { shade: '300', hex: '#f49ac2' },
        { shade: '400', hex: '#ec87c0' },
        { shade: '500', hex: '#d770ad' },
        { shade: '600', hex: '#c2549a' },
        { shade: '700', hex: '#a33e80' },
        { shade: '800', hex: '#832f66' },
        { shade: '900', hex: '#63234d' },
      ],
    },
    {
      name: 'Brown',
      description: 'Dekoracyjny brązowy',
      swatches: [
        { shade: '50', hex: '#f5f0eb' },
        { shade: '100', hex: '#e8ddd3' },
        { shade: '200', hex: '#d4c4b4' },
        { shade: '300', hex: '#baa286' },
        { shade: '400', hex: '#aa8e69' },
        { shade: '500', hex: '#8d6e4c' },
        { shade: '600', hex: '#795548' },
        { shade: '700', hex: '#5d4037' },
        { shade: '800', hex: '#4a332c' },
        { shade: '900', hex: '#3e2723' },
      ],
    },
    {
      name: 'Dark',
      description: 'Bazowa skala szarości (używana przez neutral)',
      swatches: [
        { shade: '50', hex: '#f8f9fa' },
        { shade: '100', hex: '#eaecf0' },
        { shade: '200', hex: '#dadce2' },
        { shade: '300', hex: '#bcc0ca' },
        { shade: '400', hex: '#9ea2ae' },
        { shade: '500', hex: '#656d78' },
        { shade: '600', hex: '#434a54' },
        { shade: '700', hex: '#343941' },
        { shade: '800', hex: '#262a30' },
        { shade: '900', hex: '#1c1f23' },
        { shade: '950', hex: '#121417' },
      ],
    },
  ];

  readonly allIcons: IconName[] = [
    'menu',
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
    'help-circle',
    'check-circle',
    'list',
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
    { current: 0, max: 10 },
    { current: 1, max: 10 },
    { current: 2, max: 10 },
    { current: 3, max: 10 },
    { current: 4, max: 10 },
    { current: 5, max: 10 },
    { current: 6, max: 10 },
    { current: 7, max: 10 },
    { current: 8, max: 10 },
    { current: 9, max: 10 },
    { current: 10, max: 10 },
    { current: 5, max: 0 },
  ];

  setSection(id: string): void {
    this.activeSection.set(id);
  }

  isDark(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 < 150;
  }
}
