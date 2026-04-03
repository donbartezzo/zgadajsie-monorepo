import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { GlobalInfoPageService } from '../../../../shared/layouts/page-layout/global-info-page.service';

@Component({
  selector: 'app-info-page',
  standalone: true,
  imports: [RouterLink, ButtonComponent, IconComponent],
  template: `
    @let _data = displayData();
    @let _title = _data?.title || 'Dostęp ograniczony';
    @let _description =
      _data?.description ||
      'Wybrana operacja lub zasób jest w tej chwili niedostępny dla Twojego konta.';
    @let _icon = _data?.icon || 'shield';
    @let _buttonLabel = _data?.buttonLabel || 'Skontaktuj się z administracją';
    @let _buttonLink = _data?.buttonLink || '/contact';

    <div class="flex min-h-screen items-center justify-center px-4 pb-4">
      <div class="max-w-xl text-center">
        <div
          class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-secondary-50"
        >
          <app-icon [name]="_icon" class="text-secondary-400" size="lg"></app-icon>
        </div>

        <h1 class="text-2xl font-bold text-neutral-900">{{ _title }}</h1>
        <p class="mt-3 text-sm leading-relaxed text-neutral-500">{{ _description }}</p>

        <div class="mt-8 flex justify-center">
          <a [routerLink]="_buttonLink">
            <app-button appearance="soft" color="primary" size="lg">
              {{ _buttonLabel }}
            </app-button>
          </a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoPageComponent {
  private readonly globalInfoPage = inject(GlobalInfoPageService);

  readonly displayData = computed(() => this.globalInfoPage.data());
}
