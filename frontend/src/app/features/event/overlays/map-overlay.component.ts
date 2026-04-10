import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { MapComponent } from '../../../shared/event-form/ui/map/map.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { Event as EventModel } from '../../../shared/types';

@Component({
  selector: 'app-map-overlay',
  imports: [IconComponent, MapComponent, BottomOverlayComponent],
  template: `
    @if (event(); as e) {
      @if (e.lat && e.lng) {
        <app-bottom-overlay [open]="true" title="Lokalizacja" (closed)="closed.emit()">
          <div class="max-w-lg mx-auto">
            <app-map
              [lat]="e.lat"
              [lng]="e.lng"
              [height]="300"
              [interactive]="true"
              [markerDraggable]="false"
              [showLayerControls]="true"
            ></app-map>
            <p class="mt-3 flex items-center gap-2 text-sm text-neutral-700">
              <app-icon name="map-pin" size="sm" color="danger"></app-icon>
              {{ e.address }}
            </p>
          </div>
        </app-bottom-overlay>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapOverlayComponent {
  readonly event = input<EventModel | null>(null);
  readonly closed = output<void>();
}
