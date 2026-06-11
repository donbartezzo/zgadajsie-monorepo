import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import {
  BottomOverlaysService,
  DisciplineProfileValue,
} from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { DisciplineProfileFormComponent } from '../../../shared/discipline-profile/ui/discipline-profile-form/discipline-profile-form.component';

@Component({
  selector: 'app-discipline-profile-overlay',
  imports: [BottomOverlayComponent, DisciplineProfileFormComponent, TranslocoPipe],
  template: `
    @let _ctx = context();
    <app-bottom-overlay [open]="isOpen()" (closed)="close()">
      <div class="mx-auto max-w-lg">
        <h2 class="mb-1 text-lg font-bold text-neutral-900">Profil dyscypliny</h2>
        @if (_ctx) {
          <p class="mb-4 text-sm text-neutral-500">
            Uzupełnij swój profil dla dyscypliny
            <span class="font-semibold text-neutral-700">
              {{ 'dict.discipline.' + _ctx.disciplineSlug | transloco }}</span
            >, aby kontynuować.
          </p>
          <app-discipline-profile-form
            [disciplineSlug]="_ctx.disciplineSlug"
            [initial]="_ctx.initial"
            [submitLabel]="_ctx.submitLabel"
            [pending]="loading()"
            (save)="onSave($event)"
            (cancelled)="close()"
          />
        }
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplineProfileOverlayComponent {
  private readonly overlays = inject(BottomOverlaysService);

  readonly isOpen = computed(() => this.overlays.active() === 'disciplineProfile');
  readonly context = this.overlays.disciplineProfileContext;
  readonly loading = this.overlays.loading;

  onSave(value: DisciplineProfileValue): void {
    this.overlays.confirmDisciplineProfile(value);
  }

  close(): void {
    this.overlays.close();
  }
}
