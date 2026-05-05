import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { ExplainerService } from './explainer.service';

@Component({
  selector: 'app-explainer-trigger',
  template: `
    <span
      class="relative inline-flex cursor-help"
      tabindex="0"
      (click)="open($event)"
      (keydown.enter)="open($event)"
    >
      <ng-content />
      <span
        class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-info-400 shrink-0"
        aria-hidden="true"
      ></span>
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
