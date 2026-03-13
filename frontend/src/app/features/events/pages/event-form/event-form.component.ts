import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { MapComponent } from '../../../../shared/ui/map/map.component';
import { RulesEditorComponent } from '../../../../shared/ui/rules-editor/rules-editor.component';
import { EventService } from '../../../../core/services/event.service';
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { DictionaryItem, City, Event, CoverImage } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';

@Component({
  selector: 'app-event-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    MapComponent,
    RulesEditorComponent,
  ],
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold text-neutral-900 mb-4">
        {{ isEdit() ? 'Edytuj wydarzenie' : 'Nowe wydarzenie' }}
      </h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-card>
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Tytuł</label>
              <input
                formControlName="title"
                class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Nazwa wydarzenia"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Opis</label>
              <textarea
                formControlName="description"
                rows="4"
                class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Opis wydarzenia..."
              ></textarea>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Szczegóły</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Dyscyplina</label>
                <select
                  formControlName="disciplineId"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">Wybierz...</option>
                  @for (d of disciplines(); track d.id) {
                  <option [value]="d.id">{{ d.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Obiekt</label>
                <select
                  formControlName="facilityId"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">Wybierz...</option>
                  @for (f of facilities(); track f.id) {
                  <option [value]="f.id">{{ f.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Poziom</label>
                <select
                  formControlName="levelId"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">Wybierz...</option>
                  @for (l of levels(); track l.id) {
                  <option [value]="l.id">{{ l.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Miasto</label>
                <select
                  formControlName="cityId"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">Wybierz...</option>
                  @for (c of cities(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Termin i uczestnicy</h3>

            <!-- Daty -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Początek</label>
                <input
                  type="datetime-local"
                  formControlName="startsAt"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Koniec</label>
                <input
                  type="datetime-local"
                  formControlName="endsAt"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                />
              </div>
            </div>

            <!-- Liczba uczestników -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1"
                  >Min. uczestników</label
                >
                <input
                  type="number"
                  formControlName="minParticipants"
                  min="2"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1"
                  >Maks. uczestników</label
                >
                <input
                  type="number"
                  formControlName="maxParticipants"
                  min="2"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                />
              </div>
            </div>

            <!-- Przedział wiekowy -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1"
                  >Wiek min (opcjonalnie)</label
                >
                <input
                  type="number"
                  formControlName="ageMin"
                  min="1"
                  max="100"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                  placeholder="np. 18"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1"
                  >Wiek max (opcjonalnie)</label
                >
                <input
                  type="number"
                  formControlName="ageMax"
                  min="1"
                  max="100"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                  placeholder="np. 65"
                />
              </div>
            </div>

            <!-- Kryteria -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Płeć</label>
                <select
                  formControlName="gender"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="ANY">Dowolna</option>
                  <option value="MALE">Mężczyźni</option>
                  <option value="FEMALE">Kobiety</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Widoczność</label>
                <select
                  formControlName="visibility"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="PUBLIC">Publiczne</option>
                  <option value="PRIVATE">Prywatne</option>
                </select>
              </div>
            </div>

            <!-- Koszt i akceptacja -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1"
                  >Koszt/os. (zł)</label
                >
                <input
                  type="number"
                  formControlName="costPerPerson"
                  min="0"
                  step="0.01"
                  class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                />
              </div>
              <div class="flex items-center gap-3">
                <label class="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" formControlName="autoAccept" class="peer sr-only" />
                  <div
                    class="h-6 w-11 rounded-full bg-neutral-200 peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-400 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
                  ></div>
                </label>
                <span class="text-sm text-neutral-700">Automatyczne akceptowanie</span>
              </div>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Lokalizacja</h3>
            <div>
              <label class="block text-xs font-medium text-neutral-600 mb-1">Adres</label>
              <input
                formControlName="address"
                class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ulica, numer, miasto"
              />
            </div>
            <app-map
              [lat]="mapLat()"
              [lng]="mapLng()"
              [interactive]="true"
              [height]="250"
              (markerMoved)="onMarkerMoved($event)"
            ></app-map>
          </div>
        </app-card>

        <app-card>
          <div class="p-4">
            <app-rules-editor [rules]="eventRules()" (rulesChange)="onRulesChange($event)" />
          </div>
        </app-card>

        <!-- Cover image gallery -->
        <app-card>
          <div class="p-4 space-y-3">
            <h3 class="text-sm font-semibold text-neutral-900">Grafika wydarzenia</h3>
            @if (!form.get('disciplineId')?.value) {
            <p class="text-xs text-neutral-400">
              Najpierw wybierz dyscyplinę, aby zobaczyć dostępne grafiki.
            </p>
            } @else if (coverImagesLoading()) {
            <div class="flex items-center justify-center py-6">
              <div
                class="h-6 w-6 animate-spin rounded-full border-2 border-highlight border-t-transparent"
              ></div>
            </div>
            } @else if (coverImages().length === 0) {
            <p class="text-xs text-neutral-400">Brak dostępnych grafik dla wybranej dyscypliny.</p>
            } @else {
            <div class="grid grid-cols-2 gap-2">
              @for (cover of coverImages(); track cover.id) {
              <button
                type="button"
                [class]="
                  'relative overflow-hidden rounded-xl border-2 transition-all ' +
                  (selectedCoverImageId() === cover.id
                    ? 'border-highlight ring-2 ring-primary-500/30'
                    : 'border-neutral-200 hover:border-neutral-400')
                "
                (click)="selectCoverImage(cover)"
              >
                <img
                  [src]="coverUrl(cover)"
                  [alt]="cover.originalName"
                  class="w-full aspect-[700/250] object-cover"
                />
                @if (selectedCoverImageId() === cover.id) {
                <div class="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                  <div class="rounded-full bg-primary-500 p-1">
                    <app-icon name="check" size="sm" class="text-white" />
                  </div>
                </div>
                }
              </button>
              }
            </div>
            }
          </div>
        </app-card>

        <div>
          <app-button
            type="submit"
            variant="primary"
            [fullWidth]="true"
            [loading]="submitting()"
            [disabled]="form.invalid"
          >
            <app-icon name="check" size="sm"></app-icon>
            {{ isEdit() ? 'Zapisz zmiany' : 'Utwórz wydarzenie' }}
          </app-button>
        </div>
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
  private readonly coverImageService = inject(CoverImageService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);
  private readonly breadcrumb = inject(BreadcrumbService);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly mapLat = signal(51.935);
  readonly mapLng = signal(15.506);

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly facilities = signal<DictionaryItem[]>([]);
  readonly levels = signal<DictionaryItem[]>([]);
  readonly cities = signal<City[]>([]);
  readonly eventRules = signal<any[]>([]);
  readonly coverImages = signal<CoverImage[]>([]);
  readonly coverImagesLoading = signal(false);
  readonly selectedCoverImageId = signal<string | null>(null);

  private eventId: string | null = null;

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    disciplineId: ['', Validators.required],
    facilityId: ['', Validators.required],
    levelId: ['', Validators.required],
    cityId: ['', Validators.required],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
    costPerPerson: [0],
    minParticipants: [2],
    maxParticipants: [10],
    ageMin: [undefined],
    ageMax: [undefined],
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

    // Watch discipline changes to load cover images
    this.form.get('disciplineId')?.valueChanges.subscribe((disciplineId) => {
      if (disciplineId) {
        this.loadCoverImages(disciplineId);
      } else {
        this.coverImages.set([]);
        this.selectedCoverImageId.set(null);
      }
    });

    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEdit.set(true);
      this.eventService.getEvent(this.eventId).subscribe((e) => {
        if (e.city?.slug) {
          this.breadcrumb.setContext({ citySlug: e.city.slug });
        }
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
          minParticipants: e.minParticipants || 2,
          maxParticipants: e.maxParticipants || 10,
          gender: e.gender,
          visibility: e.visibility,
          autoAccept: e.autoAccept,
          address: e.address,
          lat: e.lat,
          lng: e.lng,
        });

        // Set age fields separately to avoid type issues
        (this.form.patchValue as any)({
          ageMin: e.ageMin,
          ageMax: e.ageMax,
        });
        this.eventRules.set(this.parseRules(e.rules));
        this.mapLat.set(e.lat);
        this.mapLng.set(e.lng);

        if (e.coverImageId) {
          this.selectedCoverImageId.set(e.coverImageId);
        }
      });
    }
  }

  coverUrl(cover: CoverImage): string {
    return coverImageUrl(cover.filename);
  }

  selectCoverImage(cover: CoverImage): void {
    this.selectedCoverImageId.set(cover.id);
  }

  onMarkerMoved(pos: { lat: number; lng: number }): void {
    this.form.patchValue({ lat: pos.lat, lng: pos.lng });
    this.mapLat.set(pos.lat);
    this.mapLng.set(pos.lng);
  }

  onRulesChange(rules: any[]): void {
    this.eventRules.set(rules);
  }

  formatRules(rules: any[]): string {
    return rules
      .filter((rule) => rule.text.trim())
      .map((rule) => `${' '.repeat(rule.indent)}${rule.text}`)
      .join('\n');
  }

  parseRules(rulesString?: string): any[] {
    if (!rulesString) return [];

    return rulesString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => ({
        id: crypto.randomUUID(),
        text: line.trim(),
        indent: (line.length - line.trimStart().length) / 2,
      }));
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);

    const val = this.form.getRawValue();
    const payload: Partial<Event> = {
      title: val.title || undefined,
      description: val.description || undefined,
      disciplineId: val.disciplineId || undefined,
      facilityId: val.facilityId || undefined,
      levelId: val.levelId || undefined,
      cityId: val.cityId || undefined,
      startsAt: val.startsAt ? new Date(val.startsAt).toISOString() : undefined,
      endsAt: val.endsAt ? new Date(val.endsAt).toISOString() : undefined,
      costPerPerson: val.costPerPerson || undefined,
      minParticipants: val.minParticipants || undefined,
      maxParticipants: val.maxParticipants || undefined,
      ageMin: val.ageMin || undefined,
      ageMax: val.ageMax || undefined,
      gender: val.gender || undefined,
      visibility: val.visibility || undefined,
      autoAccept: val.autoAccept || undefined,
      address: val.address || undefined,
      lat: val.lat || undefined,
      lng: val.lng || undefined,
      rules: this.formatRules(this.eventRules()),
      coverImageId: this.selectedCoverImageId() || undefined,
    };

    const req$ = this.eventId
      ? this.eventService.updateEvent(this.eventId, payload)
      : this.eventService.createEvent(payload);

    req$.subscribe({
      next: (created) => {
        this.snackbar.success(this.isEdit() ? 'Wydarzenie zaktualizowane' : 'Wydarzenie utworzone');
        this.router.navigate(['/w', created.city?.slug, created.id]);
        this.submitting.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się zapisać');
        this.submitting.set(false);
      },
    });
  }

  private loadCoverImages(disciplineId: string): void {
    this.coverImagesLoading.set(true);
    this.coverImageService.getAll(disciplineId).subscribe({
      next: (images) => {
        this.coverImages.set(images);
        this.coverImagesLoading.set(false);

        // Auto-select random if nothing selected and images available
        if (!this.selectedCoverImageId() && images.length > 0) {
          const randomIdx = Math.floor(Math.random() * images.length);
          this.selectedCoverImageId.set(images[randomIdx].id);
        }
      },
      error: () => {
        this.coverImages.set([]);
        this.coverImagesLoading.set(false);
      },
    });
  }
}
