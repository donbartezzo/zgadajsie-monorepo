import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { LayoutConfigService } from '../../../../shared/layouts/page-layout/layout-config.service';

@Component({
  selector: 'app-join-us',
  imports: [RouterLink, IconComponent],
  templateUrl: './join-us.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinUsComponent implements OnDestroy {
  private readonly layoutConfig = inject(LayoutConfigService);

  @ViewChild('extraContent', { static: true }) extraContent!: TemplateRef<unknown>;

  constructor() {
    effect(() => {
      this.layoutConfig.titleText.set('Dołącz do nas');
      this.layoutConfig.extraTpl.set(this.extraContent);
    });
  }

  ngOnDestroy(): void {
    this.layoutConfig.reset();
  }
}
