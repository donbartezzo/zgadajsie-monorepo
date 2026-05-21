import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { ExplainerService } from './explainer.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-explainer-trigger',
  imports: [IconComponent],
  template: `
    <span
      class="relative inline-flex cursor-help"
      tabindex="0"
      (click)="open($event)"
      (keydown.enter)="open($event)"
    >
      <ng-content />
      <app-icon
        name="help"
        size="xs"
        class="absolute -top-0.5 -right-0.5 bg-neutral-900 text-white rounded-full shrink-0 opacity-25"
        aria-hidden="true"
      />
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplainerTriggerComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();

  private readonly explainer = inject(ExplainerService);
  private readonly el = inject(ElementRef<HTMLElement>);

  open(event: Event): void {
    event.stopPropagation();
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.explainer.toggle({ title: this.title(), description: this.description(), anchor: rect });
  }
}
