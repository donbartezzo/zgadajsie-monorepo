import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { ButtonComponent } from '../../../ui/button/button.component';

export interface DisciplineProfileFormValue {
  levelSlug: string;
  bio: string | null;
}

// Poziom „open" oznacza wydarzenie otwarte, nie realny poziom uczestnika — wykluczony.
const FORBIDDEN_LEVEL_SLUG = 'open';
const BIO_MAX_LENGTH = 500;

/**
 * Wspólny formularz profilu dyscypliny (tworzenie + edycja). Reużywany w: `/profile`,
 * ścieżce dołączania (po 409 DISCIPLINE_PROFILE_REQUIRED) oraz dodawaniu gościa.
 * Prezentacyjny: zbiera { levelSlug, bio } i emituje przez `save`; zapis robi rodzic.
 */
@Component({
  selector: 'app-discipline-profile-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, ButtonComponent],
  templateUrl: './discipline-profile-form.component.html',
})
export class DisciplineProfileFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dict = inject(DictionaryService);

  readonly disciplineSlug = input<string | null>(null);
  readonly initial = input<DisciplineProfileFormValue | null>(null);
  readonly pending = input(false);
  readonly submitLabel = input('Zapisz profil');
  readonly showCancel = input(true);

  readonly save = output<DisciplineProfileFormValue>();
  readonly cancelled = output<void>();

  readonly bioMaxLength = BIO_MAX_LENGTH;

  readonly form = this.fb.nonNullable.group({
    levelSlug: ['', Validators.required],
    bio: ['', [Validators.maxLength(BIO_MAX_LENGTH)]],
  });

  // Dozwolone poziomy uczestnika: słownik bez „open".
  readonly levels = toSignal(
    this.dict.getLevels().pipe(map((list) => list.filter((l) => l.slug !== FORBIDDEN_LEVEL_SLUG))),
    { initialValue: [] },
  );

  private readonly bioValue = toSignal(
    this.form.controls.bio.valueChanges.pipe(takeUntilDestroyed()),
    { initialValue: '' },
  );
  readonly bioLength = computed(() => this.bioValue().length);

  constructor() {
    // Prefill przy edycji.
    effect(() => {
      const initial = this.initial();
      if (initial) {
        this.form.patchValue({ levelSlug: initial.levelSlug, bio: initial.bio ?? '' });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }
    const { levelSlug, bio } = this.form.getRawValue();
    this.save.emit({ levelSlug, bio: bio.trim() === '' ? null : bio.trim() });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
