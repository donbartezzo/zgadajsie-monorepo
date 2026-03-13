import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent, IconName } from '../../../../core/icons/icon.component';

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
  imports: [IconComponent],
  templateUrl: './design-system.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemComponent {
  readonly activeSection = signal<string>('colors');

  readonly sections = [
    { id: 'colors', label: 'Kolory' },
    { id: 'typography', label: 'Typografia' },
    { id: 'icons', label: 'Ikony' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'components', label: 'Komponenty' },
  ];

  readonly palettes: ColorPalette[] = [
    {
      name: 'Primary',
      description: 'Brand, przyciski, linki, akcenty',
      swatches: [
        { shade: '50', hex: '#fdf2f2' },
        { shade: '100', hex: '#fce4e4' },
        { shade: '200', hex: '#f9cece' },
        { shade: '300', hex: '#f2a5a5' },
        { shade: '400', hex: '#ed5565' },
        { shade: '500', hex: '#da4453' },
        { shade: '600', hex: '#c0392b' },
        { shade: '700', hex: '#a02020' },
        { shade: '800', hex: '#7a1a24' },
        { shade: '900', hex: '#501015' },
      ],
    },
    {
      name: 'Neutral',
      description: 'Tła, tekst, bordery, ikony muted',
      swatches: [
        { shade: '50', hex: '#fafafa' },
        { shade: '100', hex: '#eaeaef' },
        { shade: '200', hex: '#e0e0e5' },
        { shade: '300', hex: '#c8c8d0' },
        { shade: '400', hex: '#9e9ea8' },
        { shade: '500', hex: '#6c6c6c' },
        { shade: '600', hex: '#555555' },
        { shade: '700', hex: '#3f3f3f' },
        { shade: '800', hex: '#2a2a2a' },
        { shade: '900', hex: '#1f1f1f' },
        { shade: '950', hex: '#0f0f0f' },
      ],
    },
    {
      name: 'Success',
      description: 'Pozytywne statusy, notification bary uczestnika',
      swatches: [
        { shade: '50', hex: '#e8f5e0' },
        { shade: '100', hex: '#d4edcc' },
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
      name: 'Warning',
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
      name: 'Danger',
      description: 'Błędy, usuwanie, destrukcyjne akcje',
      swatches: [
        { shade: '50', hex: '#fce4ec' },
        { shade: '100', hex: '#f8bbd0' },
        { shade: '200', hex: '#ef9a9a' },
        { shade: '300', hex: '#ed5565' },
        { shade: '400', hex: '#da4453' },
        { shade: '500', hex: '#c62828' },
        { shade: '600', hex: '#b71c1c' },
        { shade: '700', hex: '#8e0000' },
        { shade: '800', hex: '#6d0000' },
        { shade: '900', hex: '#4a0000' },
      ],
    },
    {
      name: 'Info',
      description: 'Informacje, linki, focus ring',
      swatches: [
        { shade: '50', hex: '#e3f2fd' },
        { shade: '100', hex: '#bbdefb' },
        { shade: '200', hex: '#90caf9' },
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
      name: 'Teal',
      description: 'Dekoracyjny (karty)',
      swatches: [
        { shade: '50', hex: '#e0f2f1' },
        { shade: '100', hex: '#b2dfdb' },
        { shade: '200', hex: '#80cbc4' },
        { shade: '300', hex: '#a0cecb' },
        { shade: '400', hex: '#7db1b1' },
        { shade: '500', hex: '#5d9e9e' },
        { shade: '600', hex: '#00695c' },
        { shade: '700', hex: '#004d40' },
      ],
    },
    {
      name: 'Brown',
      description: 'Dekoracyjny (karty)',
      swatches: [
        { shade: '50', hex: '#efebe9' },
        { shade: '100', hex: '#d7ccc8' },
        { shade: '200', hex: '#bcaaa4' },
        { shade: '300', hex: '#baa286' },
        { shade: '400', hex: '#aa8e69' },
        { shade: '500', hex: '#8d6e4c' },
        { shade: '600', hex: '#795548' },
        { shade: '700', hex: '#5d4037' },
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
