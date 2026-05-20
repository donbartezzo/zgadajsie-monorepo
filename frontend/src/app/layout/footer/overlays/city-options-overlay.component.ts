import { ChangeDetectionStrategy, Component, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { CitySearchComponent } from '../../../shared/city/city-search/city-search.component';
import { CityContextService } from '../../../core/services/city-context.service';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-city-options-overlay',
  imports: [CommonModule, BottomOverlayComponent, LinkListComponent, CitySearchComponent],
  template: `
    <app-bottom-overlay [open]="true" title="Twoje bieżące miasto" (closed)="closed.emit()">
      <div class="space-y-4 max-w-lg mx-auto">
        @if (cityOptions().length > 0) {
          <app-link-list [items]="cityOptions()" (itemClicked)="handleOptionClick($event)" />

          <div class="flex items-center gap-3 pt-1">
            <div class="h-px flex-1 bg-neutral-200"></div>
            <span class="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
              albo wybierz inne miasto
            </span>
            <div class="h-px flex-1 bg-neutral-200"></div>
          </div>
        }

        <app-city-search
          variant="light"
          dropdownPosition="top"
          placeholder="Wpisz miasto…"
          (citySelected)="onCitySelected($event)"
        />
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CityOptionsOverlayComponent {
  private readonly cityContext = inject(CityContextService);
  private readonly navigation = inject(NavigationService);

  readonly closed = output<void>();

  readonly cityOptions = computed<LinkListItem[]>(() => {
    const citySlug = this.cityContext.citySlug();
    if (!citySlug) {
      return [];
    }
    const cityName = this.cityContext.cityName() || 'miasto';
    return [
      {
        label: `Wyświetl wydarzenia w mieście ${cityName}`,
        icon: 'map-pin',
        value: 'cityEvents',
        iconColor: 'neutral',
      },
    ];
  });

  handleOptionClick(item: LinkListItem): void {
    if (item.value === 'cityEvents') {
      const citySlug = this.cityContext.citySlug();
      if (citySlug) {
        this.navigation.navigateToEvents(citySlug);
      } else {
        this.navigation.navigateToHome();
      }
      this.closed.emit();
    }
  }

  onCitySelected(city: { slug: string; name: string }): void {
    this.navigation.navigateToEvents(city.slug);
    this.closed.emit();
  }
}
