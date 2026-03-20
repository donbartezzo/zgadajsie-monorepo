import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from '../../ui/icon/icon.component';
import { ContactInfoComponent } from './contact-info.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';

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
  variant = input.required<SemanticColor>();
  heroIcon = input.required<IconName>();
  title = input.required<string>();
  subtitle = input.required<string>();
  showContactButton = input<boolean>(true);

  readonly heroGradientClass = computed(() => {
    const baseClasses = 'relative h-80 flex items-center justify-center bg-gradient-to-br';
    return `${baseClasses} ${SEMANTIC_COLOR_CLASSES.gradient[this.variant()]}`;
  });
}
