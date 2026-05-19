import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CityContextService } from '../../../../core/services/city-context.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { CitySearchComponent } from '../../../../shared/city/city-search/city-search.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterModule, IconComponent, CitySearchComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly cityContext = inject(CityContextService);
  private readonly navigation = inject(NavigationService);

  onCitySelected(city: { slug: string; name: string }): void {
    this.cityContext.selectCity(city);
    this.navigation.navigateToEvents(city.slug);
  }
}
