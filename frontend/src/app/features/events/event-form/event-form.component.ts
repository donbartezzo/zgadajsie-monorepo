import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FileUploadComponent } from '../../../shared/ui/file-upload/file-upload.component';
import { MapComponent } from '../../../shared/ui/map/map.component';
import { EventService } from '../../../core/services/event.service';
import { MediaService } from '../../../core/services/media.service';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { DictionaryItem, City } from '../../../shared/types';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IconComponent, ButtonComponent, CardComponent,
    FileUploadComponent, MapComponent,
  ],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ isEdit() ? 'Edytuj wydarzenie' : 'Nowe wydarzenie' }}</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-card>
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tytuł</label>
              <input formControlName="title" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight" placeholder="Nazwa wydarzenia" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opis</label>
              <textarea formControlName="description" rows="4" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight" placeholder="Opis wydarzenia..."></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grafika</label>
              <app-file-upload accept="image/*" [maxSizeMb]="5" (fileSelected)="onCoverSelected($event)"></app-file-upload>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Szczegóły</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dyscyplina</label>
                <select formControlName="disciplineId" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <option value="">Wybierz...</option>
                  @for (d of disciplines(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Obiekt</label>
                <select formControlName="facilityId" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <option value="">Wybierz...</option>
                  @for (f of facilities(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Poziom</label>
                <select formControlName="levelId" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <option value="">Wybierz...</option>
                  @for (l of levels(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Miasto</label>
                <select formControlName="cityId" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <option value="">Wybierz...</option>
                  @for (c of cities(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                </select>
              </div>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Termin i uczestnicy</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Początek</label>
                <input type="datetime-local" formControlName="startsAt" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Koniec</label>
                <input type="datetime-local" formControlName="endsAt" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Koszt/os. (zł)</label>
                <input type="number" formControlName="costPerPerson" min="0" step="0.01" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Maks. uczestników</label>
                <input type="number" formControlName="maxParticipants" min="2" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Płeć</label>
                <select formControlName="gender" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <option value="ANY">Dowolna</option>
                  <option value="MALE">Mężczyźni</option>
                  <option value="FEMALE">Kobiety</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Widoczność</label>
                <select formControlName="visibility" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  <option value="PUBLIC">Publiczne</option>
                  <option value="PRIVATE">Prywatne</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <label class="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" formControlName="autoAccept" class="peer sr-only" />
                <div class="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-highlight peer-focus:ring-2 peer-focus:ring-highlight-light dark:bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span class="text-sm text-gray-700 dark:text-gray-300">Automatyczne akceptowanie uczestników</span>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Lokalizacja</h3>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Adres</label>
              <input formControlName="address" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight" placeholder="Ulica, numer, miasto" />
            </div>
            <app-map [lat]="mapLat()" [lng]="mapLng()" [interactive]="true" [height]="250" (markerMoved)="onMarkerMoved($event)"></app-map>
          </div>
        </app-card>

        <app-button type="submit" variant="primary" [fullWidth]="true" [loading]="submitting()" [disabled]="form.invalid">
          <app-icon name="check" size="sm"></app-icon>
          {{ isEdit() ? 'Zapisz zmiany' : 'Utwórz wydarzenie' }}
        </app-button>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly mediaService = inject(MediaService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly mapLat = signal(51.935);
  readonly mapLng = signal(15.506);

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly facilities = signal<DictionaryItem[]>([]);
  readonly levels = signal<DictionaryItem[]>([]);
  readonly cities = signal<City[]>([]);

  private coverFile: File | null = null;
  private eventId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    disciplineId: ['', Validators.required],
    facilityId: ['', Validators.required],
    levelId: ['', Validators.required],
    cityId: ['', Validators.required],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
    costPerPerson: [0],
    maxParticipants: [10],
    gender: ['ANY'],
    visibility: ['PUBLIC'],
    autoAccept: [true],
    address: ['', Validators.required],
    lat: [51.935],
    lng: [15.506],
  });

  ngOnInit(): void {
    forkJoin({
      disciplines: this.dictService.getDisciplines(),
      facilities: this.dictService.getFacilities(),
      levels: this.dictService.getLevels(),
      cities: this.dictService.getCities(),
    }).subscribe(({ disciplines, facilities, levels, cities }) => {
      this.disciplines.set(disciplines);
      this.facilities.set(facilities);
      this.levels.set(levels);
      this.cities.set(cities);
    });

    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEdit.set(true);
      this.eventService.getEvent(this.eventId).subscribe(e => {
        this.form.patchValue({
          title: e.title,
          description: e.description || '',
          disciplineId: e.disciplineId,
          facilityId: e.facilityId,
          levelId: e.levelId,
          cityId: e.cityId,
          startsAt: e.startsAt.substring(0, 16),
          endsAt: e.endsAt.substring(0, 16),
          costPerPerson: e.costPerPerson,
          maxParticipants: e.maxParticipants || 10,
          gender: e.gender,
          visibility: e.visibility,
          autoAccept: e.autoAccept,
          address: e.address,
          lat: e.lat,
          lng: e.lng,
        });
        this.mapLat.set(e.lat);
        this.mapLng.set(e.lng);
      });
    }
  }

  onCoverSelected(file: File): void {
    this.coverFile = file;
  }

  onMarkerMoved(pos: { lat: number; lng: number }): void {
    this.form.patchValue({ lat: pos.lat, lng: pos.lng });
    this.mapLat.set(pos.lat);
    this.mapLng.set(pos.lng);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);

    const val = this.form.getRawValue();
    const payload = {
      ...val,
      startsAt: new Date(val.startsAt).toISOString(),
      endsAt: new Date(val.endsAt).toISOString(),
    };

    const req$ = this.eventId
      ? this.eventService.updateEvent(this.eventId, payload)
      : this.eventService.createEvent(payload);

    req$.subscribe({
      next: (created) => {
        if (this.coverFile) {
          this.mediaService.upload(this.coverFile).subscribe();
        }
        this.snackbar.success(this.isEdit() ? 'Wydarzenie zaktualizowane' : 'Wydarzenie utworzone');
        this.router.navigate(['/events', created.id]);
        this.submitting.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się zapisać');
        this.submitting.set(false);
      },
    });
  }
}
