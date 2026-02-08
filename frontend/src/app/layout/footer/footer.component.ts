import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { IconComponent } from '../../core/icons/icon.component';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../theme.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly isHome = computed(() => this.url() === '/');

  goBack(): void {
    this.location.back();
  }

  toggleTheme(event: Event): void {
    event.preventDefault();
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
  }
}
