import { Directive, inject, input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { LayoutConfigService } from './layout-config.service';

export type LayoutSlotName = 'extra' | 'sticky';

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
      extra: this.layoutConfig.extraTpl,
      sticky: this.layoutConfig.stickyTpl,
    };
    return map[this.appLayoutSlot()];
  }
}
