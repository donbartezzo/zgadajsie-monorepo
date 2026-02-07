import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
      [ngClass]="isDragging() ? 'border-highlight bg-highlight-50 dark:bg-highlight-200/20' : 'border-gray-300 dark:border-slate-600 hover:border-highlight-light'"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragging.set(false)"
      (drop)="onDrop($event)"
      (click)="openFileDialog()"
    >
      <input
        #fileInput
        type="file"
        class="hidden"
        [accept]="accept()"
        (change)="onFileSelected($event)"
      />

      @if (preview()) {
        <img [src]="preview()" class="w-24 h-24 mx-auto rounded-lg object-cover mb-3" alt="Preview" />
      } @else {
        <app-icon name="upload" size="lg" variant="muted" class="mb-3" />
      }

      <p class="text-sm text-gray-600 dark:text-gray-400">
        Przeciągnij plik lub <span class="text-highlight dark:text-highlight-light font-medium">kliknij, aby wybrać</span>
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Maksymalny rozmiar: {{ maxSizeMb() }} MB</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  readonly accept = input('image/*');
  readonly maxSizeMb = input(5);
  readonly fileSelected = output<File>();

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  readonly isDragging = signal(false);
  readonly preview = signal<string | null>(null);

  openFileDialog(): void {
    this.fileInput().nativeElement.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    if (file.size > this.maxSizeMb() * 1024 * 1024) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.preview.set(reader.result as string);
      reader.readAsDataURL(file);
    }

    this.fileSelected.emit(file);
  }
}
