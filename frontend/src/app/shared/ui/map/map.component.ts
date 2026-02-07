import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `
    <div #mapContainer class="w-full rounded-xl overflow-hidden" [style.height.px]="height()"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly lat = input(51.935);
  readonly lng = input(15.506);
  readonly zoom = input(13);
  readonly height = input(300);
  readonly interactive = input(true);
  readonly markerMoved = output<{ lat: number; lng: number }>();

  readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  private map: any;
  private marker: any;
  private L: any;

  async ngAfterViewInit(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.L = await import('leaflet');

      this.map = this.L.map(this.mapContainer().nativeElement, {
        dragging: this.interactive(),
        scrollWheelZoom: this.interactive(),
        zoomControl: this.interactive(),
      }).setView([this.lat(), this.lng()], this.zoom());

      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.marker = this.L.marker([this.lat(), this.lng()], {
        draggable: this.interactive(),
      }).addTo(this.map);

      if (this.interactive()) {
        this.marker.on('dragend', () => {
          const pos = this.marker.getLatLng();
          this.markerMoved.emit({ lat: pos.lat, lng: pos.lng });
        });
      }
    } catch {
      // Leaflet not available (SSR or missing dep)
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
