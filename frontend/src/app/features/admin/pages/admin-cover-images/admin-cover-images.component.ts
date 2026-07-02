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
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { CoverImage } from '../../../../shared/types';
import { buildCoverImageUrl } from '../../../../shared/utils/cover-image.utils';
import { environment } from '../../../../../environments/environment';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ImageCropperModalComponent,
  ImageCropperResult,
} from '../../../../shared/ui/image-cropper-modal';
import { DictionaryItem } from '@zgadajsie/shared';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

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
    PageHeadingComponent,
  ],
  template: `
    <div class="p-4">
      <app-page-heading heading="Galeria cover images">
        <a slot="prefix" routerLink="/admin" class="text-neutral-500">
          <app-icon name="arrow-left" size="sm" />
        </a>
      </app-page-heading>

      @if (!canManage) {
        <div class="mb-4 rounded-xl bg-info-50 px-3 py-2 text-xs text-info-600">
          Galeria publiczna jest wspólna dla wszystkich środowisk i edytowalna wyłącznie z
          produkcji. Tutaj widok jest tylko do odczytu.
        </div>
      }

      <!-- Upload new -->
      @if (canManage) {
        <app-card>
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-neutral-900">Dodaj nowy cover</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  for="uploadDiscipline"
                  class="block text-xs font-medium text-neutral-600 mb-1"
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
      }

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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (cover of covers(); track cover.id) {
            <app-card>
              <div class="overflow-hidden rounded-xl">
                <img
                  [src]="getCoverUrl(cover)"
                  [alt]="cover.filename"
                  class="w-full aspect-[700/250] object-cover"
                  loading="lazy"
                  decoding="async"
                  width="700"
                  height="250"
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
                  @if (canManage) {
                    <div class="flex items-center gap-2">
                      <app-button
                        appearance="soft"
                        color="neutral"
                        size="sm"
                        (clicked)="onReplace(cover.id)"
                      >
                        <app-icon name="refresh-cw" size="xs" />
                        Podmień grafikę
                      </app-button>
                    </div>
                  }
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

  // Galeria publiczna jest wspólna dla wszystkich środowisk - zapis tylko gdy feature flag włączona.
  readonly canManage = environment.enablePublicCoverManagement;

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly covers = signal<CoverImage[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);

  uploadDisciplineSlug = '';
  uploadFile: File | null = null;
  filterDisciplineSlug = '';

  // Cropping related signals
  readonly showCropper = signal(false);
  readonly imageOriginalFile = signal<File | null>(null);
  readonly replaceTargetId = signal<string | null>(null);

  private resetUploadFileInput(): void {
    if (this.uploadFileInput) {
      this.uploadFileInput.nativeElement.value = '';
    }
  }

  getCoverUrl(cover: CoverImage): string {
    return buildCoverImageUrl(cover);
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

  onFileChange(event: globalThis.Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFile = input.files[0];
      this.imageOriginalFile.set(input.files[0]);
      this.showCropper.set(true);
    }
  }

  onCropConfirmed(result: ImageCropperResult): void {
    const targetId = this.replaceTargetId();
    if (targetId) {
      this.executeReplace(targetId, result.file);
    } else {
      this.uploadFile = result.file;
      this.showCropper.set(false);
      this.imageOriginalFile.set(null);
    }
  }

  onCropCancelled(): void {
    this.showCropper.set(false);
    this.imageOriginalFile.set(null);
    this.uploadFile = null;
    this.replaceTargetId.set(null);
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

  onReplace(id: string): void {
    this.replaceTargetId.set(id);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.imageOriginalFile.set(file);
        this.showCropper.set(true);
      } else {
        this.replaceTargetId.set(null);
      }
    };
    input.click();
  }

  private executeReplace(id: string, file: File): void {
    this.showCropper.set(false);
    this.replaceTargetId.set(null);
    this.imageOriginalFile.set(null);

    this.coverImageService.replaceImage(id, file).subscribe({
      next: () => {
        this.snackbar.success('Grafika podmieniona');
        this.loadCovers();
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się podmienić grafiki');
      },
    });
  }
}
