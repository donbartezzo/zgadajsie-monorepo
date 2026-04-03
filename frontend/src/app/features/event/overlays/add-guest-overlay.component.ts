import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-add-guest-overlay',
  imports: [BottomOverlayComponent, ButtonComponent, IconComponent, FormsModule],
  template: `
    <app-bottom-overlay
      [open]="open()"
      icon="user-plus"
      iconColor="success"
      title="Dodaj osobę towarzyszącą"
      description="Podaj nazwę, pod którą Twój znajomy będzie widoczny na liście uczestników."
      (closed)="closed.emit()"
    >
      <div class="space-y-4">
        <!-- Alert / Info box -->
        <div class="rounded-xl border border-secondary-200 bg-secondary-50 p-3">
          <div class="flex items-start gap-3">
            <app-icon
              name="help-circle"
              size="sm"
              class="text-secondary-500 shrink-0 mt-0.5"
            ></app-icon>
            <div class="text-xs text-secondary-800 space-y-2">
              <p>
                <strong>Zasady dodawania gości:</strong> Aby dodać gościa, musisz najpierw dołączyć
                do wydarzenia. Po dodaniu gościa możesz w dowolnym momencie zrezygnować ze swojego
                udziału – status Twoich gości pozostanie bez zmian.
              </p>
              <p>
                Jako osoba zapraszająca w pełni zarządzasz uczestnictwem swojego gościa. Wszystkie
                powiadomienia (np. o zwolnionym miejscu w przypadku listy rezerwowej) będą wysyłane
                bezpośrednio do Ciebie.
              </p>
              <p>
                Pamiętaj też, że odpowiadasz za każdą z osób dodaną w ten sposób oraz to Ty
                poniesiesz konsekwencje w przypadku naurszenia przez nich regulaminu (np.
                niezgłoszona nieobecność).
              </p>
            </div>
          </div>
        </div>

        <div>
          <label for="guestNameInput" class="block text-sm font-medium text-neutral-700 mb-1"
            >Nazwa gościa</label
          >
          <input
            id="guestNameInput"
            type="text"
            [(ngModel)]="guestName"
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden"
            placeholder="np. Jan Kowalski"
            (keyup.enter)="onSubmit()"
          />
          <p class="mt-1 text-xs text-neutral-500">
            Twój gość otrzyma własne miejsce i będzie widoczny na liście.
          </p>
        </div>

        <app-button
          appearance="soft"
          color="primary"
          [fullWidth]="true"
          [loading]="loading()"
          [disabled]="!isValid()"
          (clicked)="onSubmit()"
        >
          <app-icon name="plus" size="sm" class="mr-1"></app-icon>
          Dodaj do wydarzenia
        </app-button>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddGuestOverlayComponent {
  readonly open = input(false);
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<string>();

  readonly guestName = signal('');

  isValid(): boolean {
    return this.guestName().trim().length >= 2;
  }

  onSubmit(): void {
    if (!this.isValid()) return;
    this.confirmed.emit(this.guestName().trim());
    this.guestName.set(''); // reset after submit
  }
}
