import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../ui/button/button.component';

const MAX_LINKS = 3;

// Mirror walidacji backendu: tylko bezpieczne schematy http(s).
function isValidSocialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Edytor linków społecznościowych (max 3 URL-e, bez etykiet). Prezentacyjny:
 * emituje pełną listę przez `save`, zapis robi rodzic.
 */
@Component({
  selector: 'app-social-links-editor',
  imports: [FormsModule, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @for (link of links(); track $index) {
        <div class="flex items-center gap-2">
          <input
            type="url"
            [ngModel]="link"
            (ngModelChange)="updateLink($index, $event)"
            placeholder="https://..."
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <app-button
            appearance="ghost"
            color="danger"
            size="sm"
            [iconOnly]="true"
            iconLeft="trash"
            (clicked)="removeLink($index)"
            ariaLabel="Usuń link"
          />
        </div>
      }

      @if (hasInvalid()) {
        <p class="text-xs text-danger-500">
          Każdy link musi być adresem URL (http:// lub https://).
        </p>
      }

      <div class="flex items-center justify-between pt-1">
        @if (canAdd()) {
          <app-button appearance="ghost" color="primary" size="xs" (clicked)="addLink()">
            + Dodaj link
          </app-button>
        } @else {
          <span class="text-xs text-neutral-400">Maksymalnie {{ maxLinks }} linki.</span>
        }
        <app-button
          appearance="soft"
          color="primary"
          size="sm"
          [disabled]="hasInvalid()"
          (clicked)="onSave()"
        >
          Zapisz linki
        </app-button>
      </div>
    </div>
  `,
})
export class SocialLinksEditorComponent {
  readonly initialLinks = input<string[] | null>(null);
  readonly save = output<string[]>();

  readonly maxLinks = MAX_LINKS;
  readonly links = signal<string[]>([]);

  readonly canAdd = computed(() => this.links().length < MAX_LINKS);
  readonly hasInvalid = computed(() =>
    this.links().some((l) => l.trim() !== '' && !isValidSocialUrl(l.trim())),
  );

  constructor() {
    effect(() => {
      const initial = this.initialLinks();
      this.links.set(initial && initial.length > 0 ? [...initial] : []);
    });
  }

  addLink(): void {
    if (this.canAdd()) {
      this.links.update((list) => [...list, '']);
    }
  }

  removeLink(index: number): void {
    this.links.update((list) => list.filter((_, i) => i !== index));
  }

  updateLink(index: number, value: string): void {
    this.links.update((list) => list.map((l, i) => (i === index ? value : l)));
  }

  onSave(): void {
    if (this.hasInvalid()) {
      return;
    }
    const cleaned = this.links()
      .map((l) => l.trim())
      .filter((l) => l !== '');
    this.save.emit(cleaned);
  }
}
