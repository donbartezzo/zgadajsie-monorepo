import { Directive, inject, input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { LayoutConfigService } from './layout-config.service';

export type LayoutSlotName = 'subtitleTemplate' | 'stickyTemplate' | 'aside';

@Directive({ selector: '[appLayoutSlot]' })
export class LayoutSlotDirective implements OnInit, OnDestroy {
  readonly appLayoutSlot = input.required<LayoutSlotName>();

  private readonly tpl = inject(TemplateRef);
  private readonly layoutConfig = inject(LayoutConfigService);

  ngOnInit(): void {
    this.getSignal().set(this.tpl);
  }

  ngOnDestroy(): void {
    const sig = this.getSignal();
    if (sig() === this.tpl) {
      sig.set(null);
    }
  }

  private getSignal() {
    const map = {
      subtitleTemplate: this.layoutConfig.subtitleTemplate,
      stickyTemplate: this.layoutConfig.stickyTemplate,
      aside: this.layoutConfig.asideTemplate,
    };
    return map[this.appLayoutSlot()];
  }
}
