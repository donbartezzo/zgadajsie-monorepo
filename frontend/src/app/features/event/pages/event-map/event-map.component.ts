import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventHeroSlotsComponent } from '../../ui/event-hero-slots/event-hero-slots.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { MapComponent } from '../../../../shared/event-form/ui/map/map.component';
import { EventAreaService } from '../../services/event-area.service';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-event-map',
  imports: [
    ButtonComponent,
    IconComponent,
    MapComponent,
    EventHeroSlotsComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './event-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 min-h-0' },
})
export class EventMapComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly eventArea = inject(EventAreaService);

  readonly event = this.eventArea.event;
  readonly loading = this.eventArea.loading;

  backToEvent(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
