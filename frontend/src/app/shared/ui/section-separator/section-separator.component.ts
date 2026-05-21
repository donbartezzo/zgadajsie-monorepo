import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-separator',
  template: `
    <div class="flex items-center gap-3 my-2">
      <div class="h-px flex-1 bg-neutral-500/10"></div>
      <span class="text-[10px] font-medium uppercase tracking-widest text-neutral-500/45">{{
        label()
      }}</span>
      <div class="h-px flex-1 bg-neutral-500/10"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionSeparatorComponent {
  readonly label = input.required<string>();
}
