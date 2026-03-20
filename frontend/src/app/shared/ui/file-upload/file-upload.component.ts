import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
      [ngClass]="
        isDragging()
          ? 'border-highlight bg-primary-500-50'
          : 'border-neutral-300 hover:border-highlight-light'
      "
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
      <app-icon name="upload" size="lg" color="neutral" muted="light" class="mb-3" />
      }

      <p class="text-sm text-neutral-600">
        Przeciągnij plik lub
        <span class="text-primary-500 font-medium">kliknij, aby wybrać</span>
      </p>
      <p class="text-xs text-neutral-400 mt-1">Maksymalny rozmiar: {{ maxSizeMb() }} MB</p>
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
