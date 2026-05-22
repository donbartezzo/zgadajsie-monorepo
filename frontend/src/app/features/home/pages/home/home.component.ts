import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationService } from '../../../../core/services/navigation.service';
import { CitySearchComponent } from '../../../../shared/city/city-search/city-search.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterModule, IconComponent, CitySearchComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  host: { class: 'relative flex flex-1 flex-col min-h-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly navigation = inject(NavigationService);

  onCitySelected(city: { slug: string; name: string }): void {
    this.navigation.navigateToEvents(city.slug);
  }
}
