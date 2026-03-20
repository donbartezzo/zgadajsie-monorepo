import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

interface NotFoundState {
  reason?: 'event-not-found' | 'city-mismatch' | 'city-not-found';
  citySlug?: string;
}

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ButtonComponent, IconComponent],
  template: `
    <div class="text-center">
      <div
        class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100"
      >
        <app-icon name="search" class="text-neutral-400" size="lg"></app-icon>
      </div>

      <h1 class="text-2xl font-bold text-neutral-900">{{ title() }}</h1>

      <p class="mt-2 text-sm text-neutral-500">{{ description() }}</p>

      <div class="mt-8 flex flex-col gap-3">
        @if (citySlug()) {
        <a [routerLink]="['/w', citySlug()]">
          <app-button appearance="soft" color="primary" size="lg" class="w-full">
            Wydarzenia w mieście
          </app-button>
        </a>
        }
        <a routerLink="/">
          <app-button
            [appearance]="citySlug() ? 'outline' : 'soft'"
            [color]="citySlug() ? 'neutral' : 'primary'"
            size="lg"
            class="w-full"
          >
            Strona główna
          </app-button>
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent implements OnInit {
  private readonly router = inject(Router);

  readonly title = signal('Strona nie znaleziona');
  readonly description = signal('Podany adres nie istnieje lub został usunięty.');
  readonly citySlug = signal<string | undefined>(undefined);

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as NotFoundState | undefined;

    if (!state?.reason) return;

    switch (state.reason) {
      case 'event-not-found':
        this.title.set('Nie znaleziono wydarzenia');
        this.description.set('To wydarzenie nie istnieje lub zostało usunięte.');
        this.citySlug.set(state.citySlug);
        break;
      case 'city-mismatch':
        this.title.set('Nie znaleziono wydarzenia');
        this.description.set('To wydarzenie nie należy do podanej miejscowości.');
        this.citySlug.set(state.citySlug);
        break;
      case 'city-not-found':
        this.title.set('Nie znaleziono miejscowości');
        this.description.set('Podana miejscowość nie istnieje w naszej bazie.');
        break;
    }
  }
}
