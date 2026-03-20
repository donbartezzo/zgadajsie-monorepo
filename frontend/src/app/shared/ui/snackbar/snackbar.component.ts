import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';
import { SnackbarService, SnackbarType } from './snackbar.service';

const SNACKBAR_COLOR_MAP: Record<SnackbarType, SemanticColor> = {
  success: 'success',
  error: 'danger',
  info: 'info',
  warning: 'warning',
};

@Component({
  selector: 'app-snackbar',
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-full max-w-sm px-4"
    >
      @for (msg of messages(); track msg.id) {
      <div
        class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up"
        [ngClass]="typeClass(msg.type)"
      >
        <app-icon [name]="typeIcon(msg.type)" size="sm" />
        <span class="flex-1">{{ msg.message }}</span>
        <button class="opacity-70 hover:opacity-100" (click)="snackbar.dismiss(msg.id)">
          <app-icon name="x" size="sm" />
        </button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes slide-down {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .animate-slide-up {
        animation: slide-down 0.2s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);
  readonly messages = computed(() => this.snackbar.messages());

  typeClass(type: SnackbarType): string {
    return SEMANTIC_COLOR_CLASSES.button[SNACKBAR_COLOR_MAP[type]];
  }

  typeIcon(type: SnackbarType): 'check' | 'x' | 'bell' | 'shield-alert' {
    const icons: Record<SnackbarType, 'check' | 'x' | 'bell' | 'shield-alert'> = {
      success: 'check',
      error: 'x',
      info: 'bell',
      warning: 'shield-alert',
    };
    return icons[type];
  }
}
