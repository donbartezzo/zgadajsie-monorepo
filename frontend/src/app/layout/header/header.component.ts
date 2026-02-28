import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ThemeService } from '../../theme.service';
import { IconComponent } from '../../core/icons/icon.component';

@Component({
  selector: 'app-header',
  imports: [IconComponent],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  readonly theme = inject(ThemeService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => {
        let r = this.route;
        while (r.firstChild) r = r.firstChild;
        return (r.snapshot.data as { title?: string })['title'] ?? '';
      }),
    ),
    { initialValue: '' },
  );

  readonly isHome = computed(() => this.url() === '/');

  toggleTheme(event: Event): void {
    event.preventDefault();
    this.theme.toggle();
  }

  goBack(): void {
    this.location.back();
  }
}
