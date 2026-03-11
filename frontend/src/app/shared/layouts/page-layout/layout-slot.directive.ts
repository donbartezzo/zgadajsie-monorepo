import { Directive, inject, input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { LayoutConfigService } from './layout-config.service';

export type LayoutSlotName = 'overlay' | 'badge' | 'miniBar' | 'heroExtra';

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
      overlay: this.layoutConfig.overlayTpl,
      badge: this.layoutConfig.badgeTpl,
      miniBar: this.layoutConfig.miniBarTpl,
      heroExtra: this.layoutConfig.heroExtraTpl,
    };
    return map[this.appLayoutSlot()];
  }
}
