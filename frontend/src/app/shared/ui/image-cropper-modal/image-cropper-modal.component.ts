import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { SnackbarService } from '../snackbar/snackbar.service';

export interface ImageCropperResult {
  file: File;
  base64: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationError {
  isValid: boolean;
  actualWidth: number;
  actualHeight: number;
  requiredWidth: number;
  requiredHeight: number;
}

export type ImageCropperType = 'cover-image' | 'general';

export interface ImageCropperConfig {
  minWidth: number;
  minHeight: number;
  aspectRatio?: number;
  outputWidth: number;
  outputHeight: number;
  output?: 'base64' | 'blob';
  cropperStaticWidth?: number;
  cropperStaticHeight?: number;
}

const IMAGE_CROPPER_CONFIGS: Record<ImageCropperType, ImageCropperConfig> = {
  'cover-image': {
    minWidth: 700,
    minHeight: 250,
    outputWidth: 700,
    outputHeight: 250,
    output: 'base64',
    cropperStaticWidth: 700,
    cropperStaticHeight: 250,
  },
  general: {
    minWidth: 50,
    minHeight: 50,
    aspectRatio: 1, // square
    outputWidth: 1920,
    outputHeight: 1080,
    output: 'base64',
  },
};

@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, ImageCropperComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4">
      <div
        class="bg-white rounded-xl max-w-4xl w-full max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
      >
        <div class="p-4 border-b border-neutral-200 flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold text-neutral-900">Przytnij obrazek</h3>
            <p class="text-sm text-neutral-500 mt-1">
              Dostosuj obszar, który ma zostać użyty jako cover image
            </p>
          </div>
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-md hover:bg-neutral-100"
            (click)="onCancel()"
            [disabled]="isCropping()"
          >
            <app-icon name="x" size="md" />
          </button>
        </div>

        <div class="p-4 flex flex-1 min-h-0 flex-col gap-4">
          @if (imageValidationError()) {
            <div class="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <app-icon name="alert-triangle" size="sm" class="text-warning-600 mt-0.5" />
                <div class="flex-1">
                  <h4 class="text-sm font-semibold text-warning-800 mb-2">
                    Obrazek jest za mały do przycięcia
                  </h4>
                  <div class="text-sm text-warning-700 space-y-1">
                    <p>
                      <strong>Wymagane wymiary:</strong> co najmniej
                      {{ imageValidationError()!.requiredWidth }}px szerokości ×
                      {{ imageValidationError()!.requiredHeight }}px wysokości
                      @if (imageTypeSignal() === 'cover-image') {
                        (proporcje cover image: 700×250px)
                      } @else {
                        (proporcje ogólne)
                      }
                    </p>
                    <p>
                      <strong>Aktualne wymiary:</strong> {{ imageValidationError()!.actualWidth }}px
                      × {{ imageValidationError()!.actualHeight }}px
                    </p>
                    <p class="text-xs mt-2">
                      @if (imageTypeSignal() === 'cover-image') {
                        Użyj obrazka o wymiarach co najmniej 700×250px dla cover image.
                      } @else {
                        Użyj obrazka o wymiarach co najmniej {{ config().minWidth }}×{{
                          config().minHeight
                        }}px.
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          } @else if (file()) {
            <div class="flex-1 min-h-0 overflow-auto flex justify-center items-start">
              <div class="cropper-container">
                <image-cropper
                  #imageCropper
                  [imageFile]="file()!"
                  [output]="config().output || 'base64'"
                  [maintainAspectRatio]="imageTypeSignal() !== 'cover-image'"
                  [aspectRatio]="
                    imageTypeSignal() === 'cover-image' ? undefined : config().aspectRatio
                  "
                  [resizeToWidth]="config().outputWidth"
                  [resizeToHeight]="config().outputHeight"
                  [cropperStaticWidth]="config().cropperStaticWidth || 0"
                  [cropperStaticHeight]="config().cropperStaticHeight || 0"
                  [containWithinAspectRatio]="false"
                  [hideResizeSquares]="true"
                  [allowMoveImage]="false"
                  [autoCrop]="false"
                  (imageCropped)="onImageCropped($event)"
                  (imageLoaded)="onCropperReady()"
                  (cropperReady)="onCropperReady()"
                />
              </div>
            </div>
          }
        </div>

        <div class="p-4 border-t border-neutral-200 flex justify-end gap-3">
          <app-button
            appearance="soft"
            color="neutral"
            [disabled]="isCropping()"
            (clicked)="onCancel()"
          >
            Anuluj
          </app-button>
          <app-button
            appearance="solid"
            color="primary"
            [disabled]="!cropperReady() || isCropping() || !!imageValidationError()"
            (clicked)="onConfirm()"
          >
            <app-icon name="check" size="sm" />
            Zatwierdź
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .cropper-container {
        position: relative;
        width: min(700px, 100%);
        min-width: 0;
        max-width: 100%;
      }

      image-cropper {
        display: block;
        width: 100%;
        max-width: 700px;

        .ngx-ic-container {
          width: 100% !important;
          max-width: 700px !important;
          margin: 0 auto !important;
        }

        /* Disable ALL resize points and lines - no resizing allowed */
        .ngx-ic-cropper-point {
          display: none !important;
        }

        .ngx-ic-cropper-line {
          display: none !important;
        }

        /* Keep only move cursor for the cropper area */
        .ngx-ic-cropper {
          cursor: move !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCropperModalComponent {
  @ViewChild(ImageCropperComponent) imageCropper!: ImageCropperComponent;

  @Input({ required: true }) set imageFile(value: File | null) {
    this._fileSignal.set(value);

    // Reset validation state when file changes
    this.imageValidationError.set(null);
    this.imageDimensions.set(null);
    this.croppedImage.set(null);
    this.cropperReady.set(false);

    // Validate dimensions if file is provided
    if (value) {
      this.validateImageDimensions(value);
    }
  }

  @Input() set imageType(value: ImageCropperType | undefined) {
    this._imageTypeSignal.set(value || 'general');
    this.updateConfig();
  }

  @Output() confirmed = new EventEmitter<ImageCropperResult>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly snackbar = inject(SnackbarService);

  readonly _fileSignal = signal<File | null>(null);
  readonly file = this._fileSignal.asReadonly();

  readonly _imageTypeSignal = signal<ImageCropperType>('general');
  readonly imageTypeSignal = this._imageTypeSignal.asReadonly();

  readonly config = signal<ImageCropperConfig>(IMAGE_CROPPER_CONFIGS['general']);

  readonly croppedImage = signal<string | null>(null);
  readonly cropperReady = signal(false);
  readonly isCropping = signal(false);

  // Use regular property for immediate synchronous access
  private userInitiatedCrop = false;

  readonly imageValidationError = signal<ImageValidationError | null>(null);
  readonly imageDimensions = signal<ImageDimensions | null>(null);

  private updateConfig(): void {
    const type = this._imageTypeSignal();
    this.config.set(IMAGE_CROPPER_CONFIGS[type]);
  }

  validateImageDimensions(file: File): void {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const config = this.config();

      this.imageDimensions.set({ width, height });

      const isValid = width >= config.minWidth && height >= config.minHeight;

      if (!isValid) {
        this.imageValidationError.set({
          isValid: false,
          actualWidth: width,
          actualHeight: height,
          requiredWidth: config.minWidth,
          requiredHeight: config.minHeight,
        });
      } else {
        this.imageValidationError.set(null);
      }
    };

    img.onerror = () => {
      const config = this.config();
      this.imageValidationError.set({
        isValid: false,
        actualWidth: 0,
        actualHeight: 0,
        requiredWidth: config.minWidth,
        requiredHeight: config.minHeight,
      });
    };

    img.src = URL.createObjectURL(file);
  }

  onImageCropped(event: ImageCroppedEvent): void {
    this.croppedImage.set(event.base64 || null);
    this.isCropping.set(false);

    // Only proceed with confirmation if this was user-initiated crop AND we have base64
    if (event.base64 && this.userInitiatedCrop) {
      this.confirmCrop();
      this.userInitiatedCrop = false; // Reset flag
    } else if (this.userInitiatedCrop && !event.base64) {
      this.userInitiatedCrop = false;
      this.snackbar.error('Nie udało się przyciąć obrazka - sprawdź wymiary');
    }
  }

  onCropperReady(): void {
    this.cropperReady.set(true);
    // Auto-generate initial crop with delay to ensure proper initialization
    // Skip auto-crop for cover-image to avoid conflicts with custom aspect ratio
    if (this._imageTypeSignal() !== 'cover-image') {
      setTimeout(() => {
        this.autoCrop();
      }, 100);
    }
  }

  autoCrop(): void {
    // Use ViewChild reference to trigger crop with validation
    if (this.imageCropper && this.file()) {
      try {
        this.imageCropper.crop();
      } catch {
        // Don't throw error, just let user crop manually
      }
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    // If no cropped image exists, generate it first
    if (!this.croppedImage()) {
      try {
        this.isCropping.set(true);
        this.userInitiatedCrop = true; // Mark as user-initiated
        this.imageCropper.crop();
        // Don't proceed immediately - wait for imageCropped event
        this.snackbar.info('Przycinanie obrazka...');
        return;
      } catch {
        this.isCropping.set(false);
        this.userInitiatedCrop = false;
        this.snackbar.error('Nie udało się przyciąć obrazka');
        return;
      }
    }

    // If we already have cropped image, confirm directly
    this.confirmCrop();
  }

  private confirmCrop(): void {
    const croppedBase64 = this.croppedImage();
    if (!croppedBase64) {
      this.snackbar.error('Obrazek nie został przycięty');
      return;
    }

    // Convert base64 to blob
    fetch(croppedBase64)
      .then((res) => res.blob())
      .then((blob) => {
        const originalFile = this.file();
        if (!originalFile) {
          this.snackbar.error('Brak oryginalnego pliku');
          return;
        }

        const file = new File([blob], originalFile.name, { type: 'image/jpeg' });

        this.confirmed.emit({
          file,
          base64: croppedBase64,
        });
      })
      .catch(() => {
        this.snackbar.error('Błąd podczas przetwarzania obrazka');
      });
  }
}
