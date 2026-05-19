import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { UserAvatarComponent } from '../../shared/user/ui/user-avatar/user-avatar.component';
import { AuthService } from '../../core/auth/auth.service';
import { BottomOverlaysService } from '../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { NavigationService } from '../../core/services/navigation.service';
import { CityContextService } from '../../core/services/city-context.service';

@Component({
  selector: 'app-bottom-nav',
  imports: [IconComponent, ButtonComponent, UserAvatarComponent],
  templateUrl: './bottom-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed bottom-0 left-1/2 z-[60] block w-full max-w-app -translate-x-1/2' },
})
export class BottomNavComponent {
  private readonly navigation = inject(NavigationService);
  readonly auth = inject(AuthService);
  readonly cityContext = inject(CityContextService);
  protected readonly overlays = inject(BottomOverlaysService);

  readonly cityLabel = computed(() => {
    const name = this.cityContext.cityName();
    if (!name) {
      return 'Wybierz miasto';
    }
    return name.length > 31 ? name.slice(0, 30) + '…' : name;
  });

  toggleShareMenu(): void {
    this.overlays.toggle('share');
  }

  toggleNavigation(): void {
    this.overlays.toggle('navigation');
  }

  toggleCityOptions(): void {
    this.overlays.toggle('cityOptions');
  }
}
