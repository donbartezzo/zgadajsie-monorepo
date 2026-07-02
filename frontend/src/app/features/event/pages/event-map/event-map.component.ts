import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { MapComponent } from '../../../../shared/event-form/ui/map/map.component';
import { EventAreaService } from '../../services/event-area.service';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { NavigationService } from '../../../../core/services/navigation.service';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-event-map',
  imports: [
    ButtonComponent,
    IconComponent,
    MapComponent,
    EventHeroSlotsComponent,
    LoadingSpinnerComponent,
    PageHeadingComponent,
  ],
  templateUrl: './event-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 min-h-0' },
})
export class EventMapComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly navigation = inject(NavigationService);
  protected readonly eventArea = inject(EventAreaService);

  readonly event = this.eventArea.event;
  readonly loading = this.eventArea.loading;

  backToEvent(): void {
    this.navigation.navigateToParent(this.route);
  }
}
