import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { CoverImage } from '../../../../shared/types';
import { buildCoverImageUrl } from '../../../../shared/utils/cover-image.utils';
import {
  ImageCropperModalComponent,
  ImageCropperResult,
} from '../../../../shared/ui/image-cropper-modal';
import { USER_COVER_IMAGE_LIMIT } from '@zgadajsie/shared';

@Component({
  selector: 'app-my-cover-images',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    CardComponent,
    ButtonComponent,
    ImageCropperModalComponent,
  ],
  template: `
    <div class="p-4">
      <div class="flex items-center gap-3 mb-4">
        <a routerLink="/me" class="text-neutral-500">
          <app-icon name="arrow-left" size="sm" />
        </a>
        <h1 class="text-xl font-bold text-neutral-900">Moja galeria cover images</h1>
      </div>

      <app-card class="mb-4">
        <div class="space-y-3">
          <p class="text-sm text-neutral-600">
            Maksymalnie możesz mieć {{ coverLimit }} własne cover images. Używaj ich w wydarzeniach,
            które organizujesz.
          </p>
          @if (covers().length < coverLimit) {
            <app-button appearance="soft" color="primary" (clicked)="onUploadNew()">
              <app-icon name="plus" size="sm" />
              Dodaj nowe cover image
            </app-button>
          }
        </div>
      </app-card>

      @if (loading()) {
        <div class="text-center py-8">
          <app-icon name="loader" size="lg" class="animate-spin text-neutral-400" />
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (cover of covers(); track cover.id) {
            <app-card>
              <div class="space-y-3">
                <div class="aspect-[700/250] rounded-lg overflow-hidden bg-neutral-100">
                  <img
                    [src]="getCoverUrl(cover)"
                    [alt]="cover.name || 'Cover image'"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="space-y-2">
                  <input
                    [(ngModel)]="cover.name"
                    (blur)="onRename(cover)"
                    class="w-full px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nazwa"
                    [disabled]="renameLoading() === cover.id"
                  />
                  <div class="flex items-center justify-between text-xs text-neutral-500">
                    <span>Dodano: {{ formatDate(cover.createdAt) }}</span>
                  </div>
                  <div class="flex gap-2">
                    <app-button
                      appearance="soft"
                      color="neutral"
                      size="sm"
                      (clicked)="onReplace(cover)"
                      [disabled]="replaceLoading() === cover.id"
                    >
                      <app-icon name="refresh-cw" size="xs" />
                      Podmień grafikę
                    </app-button>
                    <app-button
                      appearance="soft"
                      color="danger"
                      size="sm"
                      (clicked)="onDelete(cover)"
                      [disabled]="deleteLoading() === cover.id"
                    >
                      <app-icon name="trash" size="xs" />
                      Usuń
                    </app-button>
                  </div>
                </div>
              </div>
            </app-card>
          }

          @for (i of emptySlots(); track i) {
            <app-card
              class="border-dashed border-2 border-neutral-200 flex items-center justify-center min-h-[200px]"
            >
              <div class="text-center text-neutral-400">
                <app-icon name="image" size="lg" />
                <p class="text-sm mt-2">Pusty slot</p>
              </div>
            </app-card>
          }
        </div>
      }

      <!-- Modal upload -->
      @if (uploadModalVisible() && !uploadCroppedFile()) {
        <app-image-cropper-modal
          [imageFile]="uploadFile()"
          imageType="cover-image"
          (confirmed)="onUploadConfirmed($event)"
          (cancelled)="onUploadModalClosed()"
        />
      }

      <!-- Modal name input -->
      @if (uploadModalVisible() && uploadCroppedFile()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 class="text-lg font-semibold text-neutral-900">Nazwa cover image</h3>
            <input
              [(ngModel)]="uploadName"
              type="text"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Wpisz nazwę (min 3 znaki)"
            />
            <div class="flex gap-3 justify-end">
              <app-button appearance="soft" color="neutral" (clicked)="onUploadModalClosed()">
                Anuluj
              </app-button>
              <app-button
                appearance="solid"
                color="primary"
                [disabled]="uploadName().length < 3"
                (clicked)="onUploadConfirmedWithName()"
              >
                Zapisz
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCoverImagesComponent implements OnInit {
  readonly coverLimit = USER_COVER_IMAGE_LIMIT;

  private readonly coverImageService = inject(CoverImageService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);

  covers = signal<CoverImage[]>([]);
  loading = signal(false);
  uploadModalVisible = signal(false);
  uploadFile = signal<File | null>(null);
  uploadCroppedFile = signal<File | null>(null);
  uploadName = signal('');
  replaceTargetId = signal<string | null>(null);
  renameLoading = signal<string | null>(null);
  replaceLoading = signal<string | null>(null);
  deleteLoading = signal<string | null>(null);
  uploadLoading = signal(false);

  ngOnInit() {
    this.loadCovers();
  }

  loadCovers() {
    this.loading.set(true);
    this.coverImageService.getMy().subscribe({
      next: (covers) => {
        this.covers.set(covers);
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.error('Nie udało się załadować galerii');
        this.loading.set(false);
      },
    });
  }

  getCoverUrl(cover: CoverImage): string {
    return buildCoverImageUrl(cover);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pl-PL');
  }

  emptySlots() {
    return Array.from({ length: USER_COVER_IMAGE_LIMIT - this.covers().length }, (_, i) => i);
  }

  onUploadNew() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadFile.set(file);
        this.uploadModalVisible.set(true);
      }
    };
    input.click();
  }

  onUploadModalClosed() {
    this.uploadModalVisible.set(false);
    this.uploadFile.set(null);
    this.uploadCroppedFile.set(null);
    this.uploadName.set('');
    this.replaceTargetId.set(null);
  }

  onUploadConfirmed(result: ImageCropperResult) {
    const targetId = this.replaceTargetId();
    if (targetId) {
      this.executeReplace(targetId, result.file);
    } else {
      this.uploadCroppedFile.set(result.file);
    }
  }

  private executeReplace(id: string, file: File) {
    this.uploadModalVisible.set(false);
    this.replaceLoading.set(id);

    this.coverImageService.replaceMyImage(id, file).subscribe({
      next: () => {
        this.snackbar.success('Grafika podmieniona');
        this.replaceLoading.set(null);
        this.replaceTargetId.set(null);
        this.uploadFile.set(null);
        this.loadCovers();
      },
      error: () => {
        this.snackbar.error('Nie udało się podmienić grafiki');
        this.replaceLoading.set(null);
        this.replaceTargetId.set(null);
        this.uploadFile.set(null);
      },
    });
  }

  onUploadConfirmedWithName() {
    const croppedFile = this.uploadCroppedFile();
    const name = this.uploadName();

    if (!croppedFile || !name || name.length < 3) {
      return;
    }

    this.uploadLoading.set(true);
    this.uploadModalVisible.set(false);

    this.coverImageService.createMy(croppedFile, name).subscribe({
      next: () => {
        this.snackbar.success('Cover image dodany');
        this.uploadLoading.set(false);
        this.uploadFile.set(null);
        this.uploadCroppedFile.set(null);
        this.uploadName.set('');
        this.loadCovers();
      },
      error: () => {
        this.snackbar.error('Nie udało się dodać cover image');
        this.uploadLoading.set(false);
      },
    });
  }

  onRename(cover: CoverImage) {
    if (!cover.name || cover.name.length < 3) {
      this.snackbar.error('Nazwa musi mieć minimum 3 znaki');
      return;
    }

    this.renameLoading.set(cover.id);
    this.coverImageService.renameMy(cover.id, cover.name).subscribe({
      next: () => {
        this.snackbar.success('Nazwa zmieniona');
        this.renameLoading.set(null);
      },
      error: () => {
        this.snackbar.error('Nie udało się zmienić nazwy');
        this.renameLoading.set(null);
        this.loadCovers(); // reload to restore original name
      },
    });
  }

  onReplace(cover: CoverImage) {
    this.replaceTargetId.set(cover.id);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadFile.set(file);
        this.uploadModalVisible.set(true);
      } else {
        this.replaceTargetId.set(null);
      }
    };
    input.click();
  }

  async onDelete(cover: CoverImage): Promise<void> {
    this.deleteLoading.set(cover.id);
    this.coverImageService.getMyUsage(cover.id).subscribe({
      next: async (usage) => {
        if (usage.count > 0) {
          const confirmed = await this.confirmModal.confirm({
            title: 'Grafika jest używana',
            message: `Ta grafika jest obecnie używana w wydarzeniach (x${usage.count}), więc bezpośrednie usunięcie nie jest możliwe, ale możesz podmienić ją na inną.`,
            confirmLabel: 'Podmień grafikę',
            cancelLabel: 'Anuluj',
            color: 'warning',
            showIcon: true,
          });

          this.deleteLoading.set(null);

          if (confirmed) {
            this.onReplace(cover);
          }
        } else {
          const confirmed = await this.confirmModal.confirm({
            title: 'Usuń cover image',
            message: 'Czy na pewno chcesz usunąć ten cover image?',
            confirmLabel: 'Usuń',
            cancelLabel: 'Anuluj',
            color: 'danger',
            showIcon: true,
          });

          if (!confirmed) {
            this.deleteLoading.set(null);
            return;
          }

          this.coverImageService.removeMy(cover.id).subscribe({
            next: () => {
              this.snackbar.success('Cover image usunięty');
              this.deleteLoading.set(null);
              this.loadCovers();
            },
            error: () => {
              this.snackbar.error('Nie udało się usunąć cover image');
              this.deleteLoading.set(null);
            },
          });
        }
      },
      error: () => {
        this.snackbar.error('Nie udało się sprawdzić użycia');
        this.deleteLoading.set(null);
      },
    });
  }
}
