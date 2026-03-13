import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent, IconName } from '../../../../core/icons/icon.component';

interface ColorToken {
  name: string;
  cssVar: string;
  twClass: string;
  description: string;
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

  readonly surfaceTokens: ColorToken[] = [
    {
      name: 'background',
      cssVar: '--color-background',
      twClass: 'bg-background',
      description: 'Tło strony / app shell',
    },
    {
      name: 'surface',
      cssVar: '--color-surface',
      twClass: 'bg-surface',
      description: 'Karty, panele, komponenty',
    },
    {
      name: 'surface-elevated',
      cssVar: '--color-surface-elevated',
      twClass: 'bg-surface-elevated',
      description: 'Menu, dialogi, overlay',
    },
  ];

  readonly textTokens: ColorToken[] = [
    {
      name: 'foreground',
      cssVar: '--color-foreground',
      twClass: 'text-foreground',
      description: 'Tekst główny, nagłówki',
    },
    {
      name: 'muted',
      cssVar: '--color-muted',
      twClass: 'text-muted',
      description: 'Tekst drugorzędny',
    },
    {
      name: 'muted-foreground',
      cssVar: '--color-muted-foreground',
      twClass: 'text-muted-foreground',
      description: 'Tekst na muted tle',
    },
  ];

  readonly brandTokens: ColorToken[] = [
    {
      name: 'primary',
      cssVar: '--color-primary',
      twClass: 'bg-primary',
      description: 'Brand / CTA / akcent',
    },
    {
      name: 'primary-hover',
      cssVar: '--color-primary-hover',
      twClass: 'bg-primary-hover',
      description: 'Hover na primary',
    },
    {
      name: 'primary-foreground',
      cssVar: '--color-primary-foreground',
      twClass: 'text-primary-foreground',
      description: 'Tekst na tle primary',
    },
  ];

  readonly statusTokens: ColorToken[] = [
    {
      name: 'success',
      cssVar: '--color-success',
      twClass: 'bg-success',
      description: 'Akcja udana',
    },
    {
      name: 'warning',
      cssVar: '--color-warning',
      twClass: 'bg-warning',
      description: 'Ostrzeżenie',
    },
    {
      name: 'danger',
      cssVar: '--color-danger',
      twClass: 'bg-danger',
      description: 'Błąd / usunięcie',
    },
    {
      name: 'info',
      cssVar: '--color-info',
      twClass: 'bg-info',
      description: 'Informacja',
    },
  ];

  readonly utilityTokens: ColorToken[] = [
    {
      name: 'border',
      cssVar: '--color-border',
      twClass: 'border-border',
      description: 'Domyślne obramowanie',
    },
    {
      name: 'ring',
      cssVar: '--color-ring',
      twClass: 'ring-ring',
      description: 'Focus ring',
    },
  ];

  readonly highlightScale = [
    { shade: '50', hex: '#FDF2F2' },
    { shade: '100', hex: '#FCE4E4' },
    { shade: '200', hex: '#F9CECE' },
    { shade: '500', hex: '#ED5565' },
    { shade: '600', hex: '#DA4453' },
    { shade: '700', hex: '#C0392B' },
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

  getComputedColor(cssVar: string): string {
    if (typeof document === 'undefined') {
      return '';
    }
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  }
}
