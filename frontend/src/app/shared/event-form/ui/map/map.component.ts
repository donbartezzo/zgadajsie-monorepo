import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import type * as L from 'leaflet';

@Component({
  selector: 'app-map',
  host: { class: 'block h-full w-full max-w-full' },
  template: `
    <div class="relative h-full w-full">
      @if (showLayerControls()) {
        <div
          class="absolute top-2 right-2 z-[1000] bg-white rounded-lg shadow-md border border-neutral-200"
        >
          <select
            [value]="defaultLayer()"
            (change)="changeMapLayer($any($event.target).value)"
            class="px-3 py-1 text-sm border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="street">Mapa</option>
            <option value="satellite">Satelita</option>
            <option value="terrain">Teren</option>
          </select>
        </div>
      }
      <div #mapContainer class="block h-full w-full max-w-full overflow-hidden"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly lat = input(51.935);
  readonly lng = input(15.506);
  readonly zoom = input(13);
  readonly interactive = input(false); // Domyślnie statyczny
  readonly markerDraggable = input(true); // Domylnie marker jest przesuwalny gdy mapa jest interaktywna
  readonly showLayerControls = input(false); // Pokazuje kontrolki zmiany warstwy mapy
  readonly defaultLayer = input<'street' | 'satellite' | 'terrain'>('street'); // Domylna warstwa
  readonly markerMoved = output<{ lat: number; lng: number }>();

  readonly mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private leaflet: typeof L | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrameId: number | null = null;
  private currentTileLayer: L.TileLayer | null = null;
  private layerControl: L.Control | null = null;

  // Effect do aktualizacji pozycji przy zmianie koordynatów
  private readonly positionEffect = effect(() => {
    if (this.map && this.marker) {
      const lat = this.lat();
      const lng = this.lng();
      this.updateMarkerAndView(lat, lng);
    }
  });

  private updateMarkerAndView(lat: number, lng: number): void {
    if (this.map && this.marker) {
      this.marker.setLatLng([lat, lng]);
      this.map.setView([lat, lng], this.zoom());
      this.scheduleInvalidateSize();
    }
  }

  updatePosition(lat: number, lng: number): void {
    this.updateMarkerAndView(lat, lng);
  }

  changeMapLayer(layerType: 'street' | 'satellite' | 'terrain'): void {
    if (!this.map || !this.leaflet) return;

    // Usu obecn warstw
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    // Dodaj now warstw w zalenoci od typu
    let tileUrl: string;
    let attribution: string;

    switch (layerType) {
      case 'satellite':
        tileUrl =
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = '&copy; Esri';
        break;
      case 'terrain':
        tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenTopoMap';
        break;
      default: // street
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenStreetMap';
    }

    this.currentTileLayer = this.leaflet.tileLayer(tileUrl, {
      attribution,
    });

    this.currentTileLayer.addTo(this.map);
  }

  async ngAfterViewInit(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const container = this.mapContainer().nativeElement;
      const leafletWindow = window as Window & { L?: typeof import('leaflet') };

      // Sprawdź czy Leaflet jest już dostępny globalnie
      if (leafletWindow.L) {
        this.leaflet = leafletWindow.L;
      } else {
        const leafletModule = await import('leaflet');
        // Użyj domyślnego eksportu z modułu
        this.leaflet = leafletModule.default || leafletModule;
      }

      // Sprawdź czy icon funkcja jest dostępna
      if (!this.leaflet || typeof this.leaflet.icon !== 'function') {
        throw new Error('Leaflet.icon is not available');
      }

      // Fallback do domyślnych ikon Leaflet jeśli nasze nie są dostępne
      const markerIcon = this.leaflet.icon({
        iconUrl: '/assets/images/map/marker-icon.png',
        iconRetinaUrl: '/assets/images/map/marker-icon-2x.png',
        shadowUrl: '/assets/images/map/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      });

      this.map = this.leaflet
        .map(container, {
          dragging: this.interactive(),
          scrollWheelZoom: this.interactive(),
          zoomControl: this.interactive(),
        })
        .setView([this.lat(), this.lng()], this.zoom());

      // Inicjalizuj domyln warstw
      this.changeMapLayer(this.defaultLayer());

      this.marker = this.leaflet
        .marker([this.lat(), this.lng()], {
          draggable: this.markerDraggable(),
          icon: markerIcon,
        })
        .addTo(this.map);

      if (this.interactive()) {
        const marker = this.marker;

        if (marker) {
          marker.on(
            'dragend',
            (e: L.LeafletEvent) => {
              const target = e.target as L.Marker | null;
              if (!target) {
                return;
              }

              const pos = target.getLatLng();
              this.markerMoved.emit({ lat: pos.lat, lng: pos.lng });

              // Centruj mapę na nowej pozycji markera
              this.map?.setView([pos.lat, pos.lng], this.zoom());
            },
            { passive: true },
          );
        }
      }

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.scheduleInvalidateSize();
        });
        this.resizeObserver.observe(container);
      }

      this.scheduleInvalidateSize();
    } catch {
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
