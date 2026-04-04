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
import type * as L from 'leaflet';

@Component({
  selector: 'app-map',
  host: { class: 'block w-full max-w-full' },
  template: `
    <div
      #mapContainer
      class="block w-full max-w-full rounded-xl overflow-hidden"
      [style.height.px]="height()"
    ></div>
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

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private leaflet: typeof L | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrameId: number | null = null;

  async ngAfterViewInit(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const container = this.mapContainer().nativeElement;

      // Logowanie próby załadowania Leaflet
      console.log('MapComponent: Attempting to load Leaflet...');

      // Sprawdź czy Leaflet jest już dostępny globalnie
      if ((window as any).L) {
        console.log('MapComponent: Leaflet found globally');
        this.leaflet = (window as any).L;
      } else {
        console.log('MapComponent: Loading Leaflet dynamically...');
        this.leaflet = await import('leaflet');
      }

      console.log('MapComponent: Leaflet loaded successfully');

      // Sprawdź czy ikony istnieją, użyj fallback jeśli nie
      const iconUrls = {
        iconUrl: '/assets/images/map/marker-icon.png',
        iconRetinaUrl: '/assets/images/map/marker-icon-2x.png',
        shadowUrl: '/assets/images/map/marker-shadow.png',
      };

      // Fallback do domyślnych ikon Leaflet jeśli nasze nie są dostępne
      const markerIcon = this.leaflet!.icon({
        ...iconUrls,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      });

      console.log('MapComponent: Creating map instance...');
      this.map = this.leaflet!.map(container, {
        dragging: this.interactive(),
        scrollWheelZoom: this.interactive(),
        zoomControl: this.interactive(),
      }).setView([this.lat(), this.lng()], this.zoom());

      console.log('MapComponent: Adding tile layer...');
      this.leaflet!.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map!);

      console.log('MapComponent: Adding marker...');
      this.marker = this.leaflet!.marker([this.lat(), this.lng()], {
        draggable: this.interactive(),
        icon: markerIcon,
      }).addTo(this.map!);

      if (this.interactive()) {
        const marker = this.marker;

        if (marker) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            this.markerMoved.emit({ lat: pos.lat, lng: pos.lng });
          });
        }
      }

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.scheduleInvalidateSize();
        });
        this.resizeObserver.observe(container);
      }

      this.scheduleInvalidateSize();
      console.log('MapComponent: Map initialized successfully');
    } catch (error) {
      console.error('MapComponent: Failed to initialize map:', error);
      // Leaflet not available (SSR or missing dep)
    }
  }

  ngOnDestroy(): void {
    if (this.resizeFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.resizeFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.map) {
      this.map.remove();
    }

    this.map = null;
    this.marker = null;
    this.leaflet = null;
  }

  private scheduleInvalidateSize(): void {
    if (!this.map || typeof window === 'undefined') return;

    if (this.resizeFrameId !== null) {
      window.cancelAnimationFrame(this.resizeFrameId);
    }

    this.resizeFrameId = window.requestAnimationFrame(() => {
      this.resizeFrameId = null;
      this.map?.invalidateSize({ pan: false });
      window.requestAnimationFrame(() => {
        this.map?.invalidateSize({ pan: false });
      });
    });
  }
}
