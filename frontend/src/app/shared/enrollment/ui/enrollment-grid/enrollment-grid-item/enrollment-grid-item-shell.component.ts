import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-enrollment-grid-item-shell',
  template: `
    <div class="w-20 h-26 rounded-xl transition-colors">
      <button
        type="button"
        [attr.data-user-id]="dataUserId()"
        [class]="buttonClass()"
        (click)="clicked.emit()"
      >
        <div
          class="relative flex flex-col items-center justify-start flex-1 overflow-hidden w-full"
        >
          <ng-content />

          <span
            [class]="
              'text-[9px] px-0.5 mt-0.5 text-center leading-tight w-full line-clamp-2 ' +
              nameClass()
            "
          >
            {{ label() }}
          </span>

          <ng-content select="[afterLabel]" />
        </div>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridItemShellComponent {
  readonly buttonClass = input.required<string>();
  readonly dataUserId = input<string | null>(null);
  readonly label = input.required<string>();
  readonly nameClass = input<string>('');
  readonly clicked = output<void>();
}
