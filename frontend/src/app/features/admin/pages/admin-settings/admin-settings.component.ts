import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { LoadingSpinnerComponent } from '../../../../shared/ui/loading-spinner/loading-spinner.component';
import { AdminService } from '../../../../core/services/admin.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { DictionaryItem } from '../../../../shared/types';

interface Setting {
  key: string;
  value: string;
}

@Component({
  selector: 'app-admin-settings',
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Ustawienia systemowe</h1>

      @if (loading()) {
      <app-loading-spinner></app-loading-spinner>
      } @else {
      <app-card>
        <div class="p-4 space-y-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Parametry</h3>
          @for (s of settings(); track s.key) {
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-40">{{ s.key }}</label>
            <input
              [(ngModel)]="s.value"
              class="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            />
            <app-button variant="outline" size="sm" (clicked)="saveSetting(s)"
              ><app-icon name="check" size="sm"></app-icon
            ></app-button>
          </div>
          }
        </div>
      </app-card>

      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">Słowniki</h2>
      @for (dict of dictTypes; track dict.type) {
      <app-card>
        <div class="p-4 mb-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {{ dict.label }}
          </h3>
          <div class="space-y-1">
            @for (item of dict.items(); track item.id) {
            <div class="flex items-center gap-2 text-sm">
              <span class="flex-1 text-gray-700 dark:text-gray-300">{{ item.name }}</span>
              <app-button
                variant="danger"
                size="sm"
                (clicked)="deleteDict(dict.type, item.id, dict.items)"
                ><app-icon name="trash" size="sm"></app-icon
              ></app-button>
            </div>
            }
          </div>
          <div class="flex gap-2 mt-2">
            <input
              [(ngModel)]="dict.newName"
              placeholder="Nowa pozycja"
              class="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            />
            <app-button variant="primary" size="sm" (clicked)="addDict(dict)"
              ><app-icon name="plus" size="sm"></app-icon
            ></app-button>
          </div>
        </div>
      </app-card>
      } }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);

  readonly settings = signal<Setting[]>([]);
  readonly loading = signal(true);

  readonly dictTypes: {
    type: string;
    label: string;
    items: ReturnType<typeof signal<DictionaryItem[]>>;
    newName: string;
  }[] = [
    { type: 'disciplines', label: 'Dyscypliny', items: signal<DictionaryItem[]>([]), newName: '' },
    { type: 'facilities', label: 'Obiekty', items: signal<DictionaryItem[]>([]), newName: '' },
    { type: 'levels', label: 'Poziomy', items: signal<DictionaryItem[]>([]), newName: '' },
  ];

  ngOnInit(): void {
    this.adminService.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.dictService.getDisciplines().subscribe((d) => this.dictTypes[0].items.set(d));
    this.dictService.getFacilities().subscribe((d) => this.dictTypes[1].items.set(d));
    this.dictService.getLevels().subscribe((d) => this.dictTypes[2].items.set(d));
  }

  saveSetting(s: Setting): void {
    this.adminService.updateSetting(s.key, s.value).subscribe({
      next: () => this.snackbar.success('Zapisano'),
      error: () => this.snackbar.error('Błąd'),
    });
  }

  addDict(dict: (typeof this.dictTypes)[0]): void {
    if (!dict.newName.trim()) return;
    const slug = dict.newName.trim().toLowerCase().replace(/\s+/g, '-');
    this.adminService.createDictionary(dict.type, { name: dict.newName.trim(), slug }).subscribe({
      next: (item) => {
        dict.items.update((prev) => [...prev, item]);
        dict.newName = '';
        this.snackbar.success('Dodano');
      },
      error: () => this.snackbar.error('Błąd'),
    });
  }

  deleteDict(type: string, id: string, items: ReturnType<typeof signal<DictionaryItem[]>>): void {
    this.adminService.deleteDictionary(type, id).subscribe({
      next: () => {
        items.update((prev) => prev.filter((i) => i.id !== id));
        this.snackbar.info('Usunięto');
      },
      error: () => this.snackbar.error('Błąd'),
    });
  }
}
