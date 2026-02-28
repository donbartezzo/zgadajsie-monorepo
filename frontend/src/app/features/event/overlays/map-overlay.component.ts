import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../core/icons/icon.component';
import { MapComponent } from '../../../shared/ui/map/map.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { Event as EventModel } from '../../../shared/types';

@Component({
  selector: 'app-map-overlay',
  imports: [IconComponent, MapComponent, BottomOverlayComponent],
  template: `
    @if (event(); as e) { @if (e.lat && e.lng) {
    <app-bottom-overlay [open]="true" title="Lokalizacja" (closed)="closed.emit()">
      <app-map [lat]="e.lat" [lng]="e.lng" [interactive]="true" [height]="300"></app-map>
      <p class="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <app-icon name="map-pin" size="sm" variant="danger"></app-icon>
        {{ e.address }}
      </p>
    </app-bottom-overlay>
    } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapOverlayComponent {
  readonly event = input<EventModel | null>(null);
  readonly closed = output<void>();
}
