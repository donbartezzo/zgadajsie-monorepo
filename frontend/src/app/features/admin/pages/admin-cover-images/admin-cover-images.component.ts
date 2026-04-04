import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import {
  CoverImageService,
  CoverImagesSyncReport,
} from '../../../../core/services/cover-image.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { CoverImage, DictionaryItem } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ImageCropperModalComponent,
  ImageCropperResult,
} from '../../../../shared/ui/image-cropper-modal';

@Component({
  selector: 'app-admin-cover-images',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    CardComponent,
    ButtonComponent,
    TranslocoPipe,
    ImageCropperModalComponent,
  ],
  template: `
    <div class="p-4">
      <div class="flex items-center gap-3 mb-4">
        <a routerLink="/admin" class="text-neutral-500">
          <app-icon name="arrow-left" size="sm" />
        </a>
        <h1 class="text-xl font-bold text-neutral-900">Galeria cover images</h1>
      </div>

      <!-- Importer / Synchronizator -->
      <app-card class="mb-4">
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-neutral-900">Synchronizator z katalogu</h3>
          <p class="text-xs text-neutral-600">
            Skanuje katalog <code>frontend/public/assets/covers/events/</code>, dodaje brakujące
            wpisy w bazie (bez usuwania ani modyfikacji istniejących) i wyświetla raport.
          </p>
          <app-button
            appearance="soft"
            color="neutral"
            (clicked)="onSync()"
            [loading]="syncLoading()"
          >
            <app-icon name="loader" size="sm" />
            Synchronizuj z katalogu
          </app-button>

          @if (syncReport()) {
            <div class="mt-3 space-y-4">
              <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div class="p-2 rounded-lg bg-neutral-100">
                  Foldery: <b>{{ syncReport()!.summary.totalFolders }}</b>
                </div>
                <div class="p-2 rounded-lg bg-neutral-100">
                  Pliki: <b>{{ syncReport()!.summary.totalFiles }}</b>
                </div>
                <div
                  class="p-2 rounded-lg bg-success-50 text-success-600 border border-success-200"
                >
                  Dodane: <b>{{ syncReport()!.summary.added }}</b>
                </div>
                <div class="p-2 rounded-lg bg-neutral-100">
                  Istniejące: <b>{{ syncReport()!.summary.existing }}</b>
                </div>
                <div class="p-2 rounded-lg bg-danger-50 text-danger-600 border border-danger-200">
                  Brak pliku dla wpisu w DB: <b>{{ syncReport()!.summary.missingFilesInDb }}</b>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-semibold text-neutral-900 mb-2">Zawartość wg dyscypliny</h4>
                <div class="space-y-3">
                  @for (b of syncReport()!.byDiscipline; track b.slug) {
                    <div class="rounded-xl border border-neutral-200">
                      <div
                        class="px-3 py-2 flex items-center justify-between text-xs bg-neutral-50 rounded-t-xl"
                      >
                        <div>
                          <span class="font-medium text-neutral-900">/{{ b.slug }}</span>
                          <span class="ml-2 text-neutral-500"
                            >(ID dyscypliny: {{ b.disciplineId || 'brak' }})</span
                          >
                        </div>
                        <div class="text-neutral-500">Plików: {{ b.files.length }}</div>
                      </div>
                      <div class="divide-y divide-neutral-100">
                        @for (f of b.files; track f.filename) {
                          <div class="px-3 py-2 text-xs flex items-center justify-between">
                            <span class="truncate mr-2">{{ f.filename }}</span>
                            <div class="flex items-center gap-2">
                              @if (f.added) {
                                <span
                                  class="px-1.5 py-0.5 rounded bg-success-50 text-success-600 border border-success-200"
                                  >dodany</span
                                >
                              } @else if (f.existed) {
                                <span class="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700"
                                  >istniał</span
                                >
                              } @else {
                                <span
                                  class="px-1.5 py-0.5 rounded bg-warning-50 text-warning-600 border border-warning-200"
                                  >pominięty (brak dyscypliny)</span
                                >
                              }
                              @if (!f.fileExists) {
                                <span
                                  class="px-1.5 py-0.5 rounded bg-danger-50 text-danger-600 border border-danger-200"
                                  >BRAK PLIKU</span
                                >
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              @if (syncReport()!.dbWithMissingFiles.length > 0) {
                <div>
                  <h4 class="text-sm font-semibold text-danger-600 mb-1">
                    Wpisy w DB bez fizycznego pliku
                  </h4>
                  <div class="rounded-xl border border-danger-200 overflow-hidden">
                    @for (m of syncReport()!.dbWithMissingFiles; track m.id) {
                      <div
                        class="px-3 py-2 text-xs bg-danger-50 text-danger-700 border-b border-danger-100"
                      >
                        <span class="font-mono">{{ m.filename }}</span>
                        <span class="ml-2"
                          >(discipline: {{ m.disciplineSlug || m.disciplineId }})</span
                        >
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </app-card>

      <!-- Upload new -->
      <app-card>
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-neutral-900">Dodaj nowy cover</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="uploadDiscipline" class="block text-xs font-medium text-neutral-600 mb-1"
                >Dyscyplina</label
              >
              <select
                id="uploadDiscipline"
                [(ngModel)]="uploadDisciplineSlug"
                class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
              >
                <option value="">Wybierz...</option>
                @for (d of disciplines(); track d.slug) {
                  <option [value]="d.slug">{{ 'dict.discipline.' + d.slug | transloco }}</option>
                }
              </select>
            </div>
            <div>
              <label for="uploadFile" class="block text-xs font-medium text-neutral-600 mb-1"
                >Plik graficzny</label
              >
              <input
                #uploadFileInput
                id="uploadFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                (change)="onFileChange($event)"
                class="w-full text-sm text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-primary-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary-600"
              />
            </div>
          </div>
          <app-button
            appearance="soft"
            color="primary"
            [disabled]="!uploadDisciplineSlug || !uploadFile || uploading()"
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
          [(ngModel)]="filterDisciplineSlug"
          (ngModelChange)="loadCovers()"
          class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        >
          <option value="">Wszystkie dyscypliny</option>
          @for (d of disciplines(); track d.slug) {
            <option [value]="d.slug">{{ 'dict.discipline.' + d.slug | transloco }}</option>
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
        <div class="text-center py-8 text-neutral-400">
          <app-icon name="image" size="lg" color="neutral" muted="light" />
          <p class="mt-2 text-sm">Brak cover images</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (cover of covers(); track cover.id) {
            <app-card>
              <div class="overflow-hidden rounded-xl">
                <img
                  [src]="getCoverUrl(cover)"
                  [alt]="cover.filename"
                  class="w-full aspect-[700/250] object-cover"
                />
                <div class="p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-xs font-medium text-neutral-900">
                        {{ cover.filename }}
                      </p>
                      @if (cover.discipline) {
                        <span
                          class="text-[10px] bg-primary-500-50 text-primary-500 px-1.5 py-0.5 rounded-full"
                          >{{ 'dict.discipline.' + cover.discipline.slug | transloco }}</span
                        >
                      }
                    </div>
                    <span class="text-[10px] text-neutral-400">{{
                      cover.createdAt | date: 'd MMM yyyy'
                    }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <label
                      class="flex-1 relative cursor-pointer rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-center text-xs text-neutral-500 hover:border-highlight hover:text-primary-500 transition-colors"
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
                      class="rounded-lg border border-danger-200 px-3 py-1.5 text-xs text-danger-400 hover:bg-danger-500 transition-colors"
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

    <!-- Image Cropper Modal -->
    @if (showCropper()) {
      <app-image-cropper-modal
        [imageFile]="imageOriginalFile()"
        imageType="cover-image"
        (confirmed)="onCropConfirmed($event)"
        (cancelled)="onCropCancelled()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCoverImagesComponent implements OnInit {
  @ViewChild('uploadFileInput') uploadFileInput?: ElementRef<HTMLInputElement>;

  private readonly coverImageService = inject(CoverImageService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly covers = signal<CoverImage[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly syncLoading = signal(false);
  readonly syncReport = signal<CoverImagesSyncReport | null>(null);

  uploadDisciplineSlug = '';
  uploadFile: File | null = null;
  filterDisciplineSlug = '';

  // Cropping related signals
  readonly showCropper = signal(false);
  readonly imageOriginalFile = signal<File | null>(null);

  private resetUploadFileInput(): void {
    if (this.uploadFileInput) {
      this.uploadFileInput.nativeElement.value = '';
    }
  }

  getCoverUrl(cover: CoverImage): string {
    return coverImageUrl(cover.disciplineSlug, cover.filename);
  }

  ngOnInit(): void {
    this.dictService.getDisciplines().subscribe((d) => this.disciplines.set(d));
    this.loadCovers();
  }

  loadCovers(): void {
    this.loading.set(true);
    const disciplineSlug = this.filterDisciplineSlug || undefined;
    this.coverImageService.getAll(disciplineSlug).subscribe({
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

  onSync(): void {
    this.syncLoading.set(true);
    this.coverImageService.syncFromFilesystem().subscribe({
      next: (report) => {
        this.syncReport.set(report);
        this.syncLoading.set(false);
        this.snackbar.success('Synchronizacja zakończona');
        this.loadCovers();
      },
      error: (err) => {
        this.syncLoading.set(false);
        this.snackbar.error(err?.error?.message || 'Synchronizacja nie powiodła się');
      },
    });
  }

  onFileChange(event: globalThis.Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile = input.files[0];
      this.imageOriginalFile.set(input.files[0]);
      this.showCropper.set(true);
    }
  }

  onCropConfirmed(result: ImageCropperResult): void {
    this.uploadFile = result.file;
    this.showCropper.set(false);
    this.imageOriginalFile.set(null);
  }

  onCropCancelled(): void {
    this.showCropper.set(false);
    this.imageOriginalFile.set(null);
    this.uploadFile = null;
    this.resetUploadFileInput();
  }

  onUpload(): void {
    if (!this.uploadDisciplineSlug || !this.uploadFile) {
      return;
    }
    this.uploading.set(true);
    this.coverImageService.create(this.uploadDisciplineSlug, this.uploadFile).subscribe({
      next: () => {
        this.snackbar.success('Cover image dodany');
        this.uploading.set(false);
        this.uploadFile = null;
        this.resetUploadFileInput();
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
          err?.error?.message || 'Nie udało się usunąć - sprawdź czy nie jest używany',
        );
      },
    });
  }
}
