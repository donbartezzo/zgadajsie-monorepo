import { ChangeDetectionStrategy, Component, effect, inject, ViewContainerRef } from '@angular/core';
import { ModalService } from './modal.service';

@Component({
  selector: 'app-modal-host',
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalHostComponent {
  private readonly vcr = inject(ViewContainerRef);
  private readonly modalService = inject(ModalService);

  constructor() {
    effect(() => {
      const config = this.modalService.state();
      this.vcr.clear();

      if (config) {
        const ref = this.vcr.createComponent(config.component);
        if (config.inputs) {
          for (const [key, value] of Object.entries(config.inputs)) {
            ref.setInput(key, value);
          }
        }
      }
    });
  }
}
