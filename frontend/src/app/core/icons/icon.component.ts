import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// @TODO, @TMP - ikony przykładowe:
export type IconName =
  | 'menu'
  | 'close'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'sun'
  | 'moon'
  | 'home'
  | 'calendar'
  | 'user'
  | 'search'
  | 'settings';

export type IconSize = 'sm' | 'md' | 'lg';
export type IconVariant = 'default' | 'muted' | 'primary' | 'danger';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center justify-center align-middle shrink-0"
      [ngClass]="[colorClass()]"
      [style.width.px]="sizePx()"
      [style.height.px]="sizePx()"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        class="block"
        [style.width.px]="sizePx()"
        [style.height.px]="sizePx()"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        @switch (name()) { @case ('menu') {
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
        } @case ('close') {
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
        } @case ('chevron-down') {
        <polyline points="6 9 12 15 18 9" />
        } @case ('chevron-left') {
        <polyline points="15 18 9 12 15 6" />
        } @case ('chevron-right') {
        <polyline points="9 18 15 12 9 6" />
        } @case ('chevron-up') {
        <polyline points="18 15 12 9 6 15" />
        } @case ('sun') {
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        } @case ('moon') {
        <path
          d="M21 12.79A9 9 0 0 1 11.21 3 A7 7 0 0 0 12 17a7 7 0 0 0 9-4.21Z"
        />
        } @case ('home') {
        <path d="M3 11L12 2l9 9" />
        <path d="M5 12v9h14v-9" />
        } @case ('calendar') {
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        } @case ('user') {
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        } @case ('search') {
        <circle cx="11" cy="11" r="6" />
        <line x1="16" y1="16" x2="21" y2="21" />
        } @case ('settings') {
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        />
        } @default {
        <!-- empty icon -->
        } }
      </svg>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly variant = input<IconVariant>('default');

  readonly sizePx = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      case 'md':
      default:
        return 20;
    }
  });

  readonly colorClass = computed(() => {
    switch (this.variant()) {
      case 'muted':
        return 'text-gray-400 dark:text-gray-500';
      case 'primary':
        return 'text-blue-600 dark:text-blue-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      case 'default':
      default:
        return 'text-gray-700 dark:text-gray-200';
    }
  });

  readonly sizePxSignal = computed(() => this.sizePx());
  readonly colorClassSignal = computed(() => this.colorClass());
}
