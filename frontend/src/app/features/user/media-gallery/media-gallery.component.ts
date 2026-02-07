import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { MediaService, MediaFile } from '../../../core/services/media.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule, IconComponent, FileUploadComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Galeria</h1>

      <div class="mb-4">
        <app-file-upload accept="image/*" [maxSizeMb]="10" (fileSelected)="onUpload($event)"></app-file-upload>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (files().length === 0) {
        <app-empty-state icon="image" title="Brak zdjęć" message="Nie masz jeszcze żadnych zdjęć w galerii."></app-empty-state>
      } @else {
        <div class="grid grid-cols-3 gap-2">
          @for (f of files(); track f.id) {
            <div class="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
              <img [src]="f.url" [alt]="f.originalName" class="w-full h-full object-cover" />
              <button
                (click)="onDelete(f.id)"
                class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-1"
              >
                <app-icon name="trash" size="sm"></app-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaGalleryComponent implements OnInit {
  private readonly mediaService = inject(MediaService);
  private readonly snackbar = inject(SnackbarService);

  readonly files = signal<MediaFile[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.mediaService.getMyMedia().subscribe({
      next: (f) => { this.files.set(f); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onUpload(file: File): void {
    this.mediaService.upload(file).subscribe({
      next: (m) => {
        this.files.update(prev => [m, ...prev]);
        this.snackbar.success('Zdjęcie dodane');
      },
      error: () => this.snackbar.error('Nie udało się dodać zdjęcia'),
    });
  }

  onDelete(id: string): void {
    this.mediaService.delete(id).subscribe({
      next: () => {
        this.files.update(prev => prev.filter(f => f.id !== id));
        this.snackbar.info('Zdjęcie usunięte');
      },
      error: () => this.snackbar.error('Nie udało się usunąć'),
    });
  }
}
