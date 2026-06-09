import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';

// Po każdym deployu Service Worker pobiera nowy bundle w tle, ale serwuje stary
// kod aż do następnego pełnego załadowania. Bez tej obsługi użytkownik widzi
// nieaktualną wersję (np. stare adresy grafik) do czasu zamknięcia wszystkich kart.
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.promptReload());
  }

  private promptReload(): void {
    this.snackbar.show(
      'Dostępna jest nowa wersja aplikacji. Kliknij, aby odświeżyć.',
      'info',
      0,
      () => {
        void this.swUpdate.activateUpdate().then(() => document.location.reload());
      },
    );
  }
}
