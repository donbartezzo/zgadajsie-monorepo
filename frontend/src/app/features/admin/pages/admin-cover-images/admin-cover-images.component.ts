import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { CoverImage, DictionaryItem } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';

@Component({
  selector: 'app-admin-cover-images',
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, CardComponent, ButtonComponent],
  template: `
    <div class="p-4">
      <div class="flex items-center gap-3 mb-4">
        <a routerLink="/admin" class="text-gray-500 dark:text-gray-400">
          <app-icon name="arrow-left" size="sm" />
        </a>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Galeria cover images</h1>
      </div>

      <!-- Upload new -->
      <app-card>
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Dodaj nowy cover</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
                >Dyscyplina</label
              >
              <select
                [(ngModel)]="uploadDisciplineId"
                class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Wybierz...</option>
                @for (d of disciplines(); track d.id) {
                <option [value]="d.id">{{ d.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
                >Plik graficzny</label
              >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                (change)="onFileChange($event)"
                class="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:rounded-lg file:border-0 file:bg-highlight file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-highlight-dark"
              />
            </div>
          </div>
          <app-button
            variant="primary"
            [disabled]="!uploadDisciplineId || !uploadFile || uploading()"
            [loading]="uploading()"
            (clicked)="onUpload()"
          >
            <app-icon name="upload" size="sm" />
            Dodaj cover
          </app-button>
        </div>
      </app-card>

      <!-- Filter -->
      <div class="mt-4 mb-3">
        <select
          [(ngModel)]="filterDisciplineId"
          (ngModelChange)="loadCovers()"
          class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">Wszystkie dyscypliny</option>
          @for (d of disciplines(); track d.id) {
          <option [value]="d.id">{{ d.name }}</option>
          }
        </select>
      </div>

      <!-- Cover list -->
      @if (loading()) {
      <div class="flex items-center justify-center py-8">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-highlight border-t-transparent"
        ></div>
      </div>
      } @else if (covers().length === 0) {
      <div class="text-center py-8 text-gray-400 dark:text-gray-500">
        <app-icon name="image" size="lg" variant="muted" />
        <p class="mt-2 text-sm">Brak cover images</p>
      </div>
      } @else {
      <div class="space-y-3">
        @for (cover of covers(); track cover.id) {
        <app-card>
          <div class="overflow-hidden rounded-xl">
            <img
              [src]="getCoverUrl(cover)"
              [alt]="cover.originalName"
              class="w-full aspect-[700/250] object-cover"
            />
            <div class="p-3 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {{ cover.originalName }}
                  </p>
                  @if (cover.discipline) {
                  <span
                    class="text-[10px] bg-highlight-50 dark:bg-highlight-200/20 text-highlight dark:text-highlight-light px-1.5 py-0.5 rounded-full"
                    >{{ cover.discipline.name }}</span
                  >
                  }
                </div>
                <span class="text-[10px] text-gray-400">{{
                  cover.createdAt | date : 'd MMM yyyy'
                }}</span>
              </div>
              <div class="flex items-center gap-2">
                <label
                  class="flex-1 relative cursor-pointer rounded-lg border border-dashed border-gray-300 dark:border-slate-600 px-3 py-1.5 text-center text-xs text-gray-500 hover:border-highlight hover:text-highlight transition-colors"
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="hidden"
                    (change)="onReplace(cover.id, $event)"
                  />
                  Zamień grafikę
                </label>
                <button
                  type="button"
                  class="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  (click)="onDelete(cover.id)"
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        </app-card>
        }
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCoverImagesComponent implements OnInit {
  private readonly coverImageService = inject(CoverImageService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly covers = signal<CoverImage[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);

  uploadDisciplineId = '';
  uploadFile: File | null = null;
  filterDisciplineId = '';

  getCoverUrl(cover: CoverImage): string {
    return coverImageUrl(cover.filename);
  }

  ngOnInit(): void {
    this.dictService.getDisciplines().subscribe((d) => this.disciplines.set(d));
    this.loadCovers();
  }

  loadCovers(): void {
    this.loading.set(true);
    const disciplineId = this.filterDisciplineId || undefined;
    this.coverImageService.getAll(disciplineId).subscribe({
      next: (covers) => {
        this.covers.set(covers);
        this.loading.set(false);
      },
      error: () => {
        this.covers.set([]);
        this.loading.set(false);
      },
    });
  }

  onFileChange(event: globalThis.Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile = input.files[0];
    }
  }

  onUpload(): void {
    if (!this.uploadDisciplineId || !this.uploadFile) {
      return;
    }
    this.uploading.set(true);
    this.coverImageService.create(this.uploadDisciplineId, this.uploadFile).subscribe({
      next: () => {
        this.snackbar.success('Cover image dodany');
        this.uploading.set(false);
        this.uploadFile = null;
        this.uploadDisciplineId = '';
        this.loadCovers();
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się dodać cover image');
        this.uploading.set(false);
      },
    });
  }

  onReplace(id: string, event: globalThis.Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    this.coverImageService.replaceImage(id, file).subscribe({
      next: () => {
        this.snackbar.success('Grafika zastąpiona');
        this.loadCovers();
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się zastąpić grafiki');
      },
    });
  }

  onDelete(id: string): void {
    if (!confirm('Czy na pewno chcesz usunąć ten cover image?')) {
      return;
    }
    this.coverImageService.remove(id).subscribe({
      next: () => {
        this.snackbar.success('Cover image usunięty');
        this.loadCovers();
      },
      error: (err) => {
        this.snackbar.error(
          err?.error?.message || 'Nie udało się usunąć — sprawdź czy nie jest używany',
        );
      },
    });
  }
}
