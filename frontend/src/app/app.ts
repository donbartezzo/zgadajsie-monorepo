import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { BottomNavComponent } from './layout/footer/bottom-nav.component';
import { FooterComponent } from './layout/footer/footer.component';
import { SnackbarComponent } from './shared/ui/snackbar/snackbar.component';
import { BottomOverlaysComponent } from './shared/ui/bottom-overlays/bottom-overlays.component';
import { ConfirmModalComponent } from './shared/ui/confirm-modal/confirm-modal.component';

@Component({
  imports: [
    RouterModule,
    BottomNavComponent,
    FooterComponent,
    SnackbarComponent,
    BottomOverlaysComponent,
    ConfirmModalComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected title = 'ZgadajSię';

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly isHome = computed(() => this.url() === '/');
}
