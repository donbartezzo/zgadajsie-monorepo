import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from '../../../core/icons/icon.component';
import { ContactInfoComponent } from './contact-info.component';

export type PageVariant = 'green' | 'blue' | 'purple' | 'orange';

@Component({
  selector: 'app-static-page-layout',
  standalone: true,
  imports: [CommonModule, IconComponent, ContactInfoComponent],
  template: `
    <div class="page-content">
      <!-- Hero Section -->
      <div [class]="heroGradientClass()">
        <div class="absolute inset-0 bg-black/20"></div>
        <div class="relative text-center text-white px-4">
          <app-icon [name]="heroIcon()" size="lg" class="mb-4 mx-auto text-6xl" />
          <h1 class="text-3xl font-bold mb-2">{{ title() }}</h1>
          <p class="text-sm opacity-90 mb-6">{{ subtitle() }}</p>
          <ng-content select="[heroContent]"></ng-content>
        </div>
      </div>

      <!-- Main Content -->
      <ng-content></ng-content>

      <!-- Contact Section -->
      <app-contact-info [variant]="variant()" [showButton]="showContactButton()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaticPageLayoutComponent {
  variant = input.required<PageVariant>();
  heroIcon = input.required<IconName>();
  title = input.required<string>();
  subtitle = input.required<string>();
  showContactButton = input<boolean>(true);

  readonly heroGradientClass = computed(() => {
    const baseClasses = 'relative h-80 flex items-center justify-center bg-gradient-to-br';
    const gradientMap: Record<PageVariant, string> = {
      green: 'from-success-400 to-success-600',
      blue: 'from-info-400 to-info-600',
      purple: 'from-primary-400 to-primary-600',
      orange: 'from-warning-400 to-danger-400',
    };
    return `${baseClasses} ${gradientMap[this.variant()]}`;
  });
}
