import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { NavMenuService } from '../../nav/nav-menu.service';

@Component({
  selector: 'app-navigation-overlay',
  imports: [BottomOverlayComponent, LinkListComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Nawigacja" (closed)="closed.emit()">
      <div class="space-y-3 max-w-lg mx-auto">
        <section class="space-y-1.5">
          <app-link-list [items]="navMenu.links()" (itemClicked)="handleNavigationClick($event)" />
        </section>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationOverlayComponent {
  readonly navMenu = inject(NavMenuService);

  readonly closed = output<void>();

  handleNavigationClick(item: LinkListItem): void {
    this.navMenu.handleClick(item, () => this.closed.emit());
  }
}
