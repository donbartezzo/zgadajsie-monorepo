import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
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
import { DictionaryItem, City, Event, CoverImage, EventRoleConfig } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';
import { EventStatus, getDisciplineSchema, DisciplineParticipantRoles } from '@zgadajsie/shared';
import { isEventJoinable } from '../../../../shared/utils/event-time-status.util';

interface RoleSlotConfig {
  key: string;
  title: string;
  desc: string;
  slots: number;
  isDefault: boolean;
}

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
            </div>
          </div>
        </app-card>

        @if (rolesEnabled()) {
        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Role uczestników</h3>
            <p class="text-xs text-neutral-500">
              Określ liczbę miejsc dla każdej roli. Suma musi być równa maksymalnej liczbie
              uczestników ({{ form.get('maxParticipants')?.value }}).
            </p>

            <div class="space-y-3">
              @for (role of roleSlots(); track role.key) {
              <div
                class="flex items-center justify-between p-3 rounded-xl border"
                [ngClass]="
                  role.isDefault
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white'
                "
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-neutral-900">{{ role.title }}</span>
                    @if (role.isDefault) {
                    <span class="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700"
                      >domyślna</span
                    >
                    }
                  </div>
                  <p class="text-xs text-neutral-500 mt-0.5">{{ role.desc }}</p>
                </div>
                <div class="flex items-center gap-2 ml-4">
                  @if (role.isDefault) {
                  <span class="text-sm font-medium text-neutral-700 w-12 text-center">{{
                    role.slots
                  }}</span>
                  } @else {
                  <input
                    type="number"
                    [value]="role.slots"
                    min="0"
                    [max]="form.get('maxParticipants')?.value"
                    (change)="updateRoleSlots(role.key, +$any($event.target).value)"
                    class="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm text-center text-neutral-900"
                  />
                  }
                </div>
              </div>
              }
            </div>

            @if (roleSlotsSum() !== form.get('maxParticipants')?.value) {
            <div class="text-xs text-danger-600 flex items-center gap-1">
              <app-icon name="alert-triangle" size="xs" />
              Suma slotów ({{ roleSlotsSum() }}) nie zgadza się z liczbą uczestników ({{
                form.get('maxParticipants')?.value
              }})
            </div>
            }
          </div>
        </app-card>
        }

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
            appearance="soft"
            color="primary"
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

  readonly disciplineRoles = signal<DisciplineParticipantRoles | null>(null);
  readonly roleSlots = signal<RoleSlotConfig[]>([]);
  readonly rolesEnabled = signal(false);

  readonly roleSlotsSum = computed(() => this.roleSlots().reduce((sum, r) => sum + r.slots, 0));

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

    // Watch discipline changes to load cover images and role schema
    this.form.get('disciplineId')?.valueChanges.subscribe((disciplineId) => {
      if (disciplineId) {
        this.loadCoverImages(disciplineId);
        this.loadDisciplineRoles(disciplineId);
      } else {
        this.coverImages.set([]);
        this.selectedCoverImageId.set(null);
        this.disciplineRoles.set(null);
        this.roleSlots.set([]);
        this.rolesEnabled.set(false);
      }
    });

    // Watch maxParticipants changes to adjust default role slots
    this.form.get('maxParticipants')?.valueChanges.subscribe(() => {
      this.recalculateDefaultRoleSlots();
    });

    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEdit.set(true);
      this.eventService.getEvent(this.eventId).subscribe((e) => {
        if (!isEventJoinable(e.startsAt, e.status)) {
          const reason =
            e.status === EventStatus.CANCELLED
              ? 'Nie można edytować odwołanego wydarzenia.'
              : 'Edycja jest możliwa tylko przed rozpoczęciem wydarzenia.';
          this.snackbar.info(reason);
          this.router.navigate(['/w', e.city?.slug, e.id]);
          return;
        }
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
    const payload: Partial<Event> & { roleConfig?: EventRoleConfig } = {
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
      address: val.address || undefined,
      lat: val.lat || undefined,
      lng: val.lng || undefined,
      rules: this.formatRules(this.eventRules()),
      coverImageId: this.selectedCoverImageId() || undefined,
      roleConfig: this.buildRoleConfig(),
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

  private loadDisciplineRoles(disciplineId: string): void {
    const discipline = this.disciplines().find((d) => d.id === disciplineId);
    if (!discipline?.slug) {
      this.disciplineRoles.set(null);
      this.roleSlots.set([]);
      this.rolesEnabled.set(false);
      return;
    }

    const schema = getDisciplineSchema(discipline.slug);
    if (!schema?.participantRoles) {
      this.disciplineRoles.set(null);
      this.roleSlots.set([]);
      this.rolesEnabled.set(false);
      return;
    }

    this.disciplineRoles.set(schema.participantRoles);
    this.initializeRoleSlots(schema.participantRoles);
  }

  private initializeRoleSlots(roles: DisciplineParticipantRoles): void {
    const maxParticipants = this.form.get('maxParticipants')?.value || 10;
    const specialSlotsSum = roles.special.reduce((sum, r) => sum + (r.slots || 0), 0);
    const defaultSlots = Math.max(0, maxParticipants - specialSlotsSum);

    const slots: RoleSlotConfig[] = [
      {
        key: roles.default.key,
        title: roles.default.title,
        desc: roles.default.desc,
        slots: defaultSlots,
        isDefault: true,
      },
      ...roles.special.map((r) => ({
        key: r.key,
        title: r.title,
        desc: r.desc,
        slots: r.slots || 0,
        isDefault: false,
      })),
    ];

    this.roleSlots.set(slots);
    this.rolesEnabled.set(true);
  }

  private recalculateDefaultRoleSlots(): void {
    if (!this.rolesEnabled()) return;

    const maxParticipants = this.form.get('maxParticipants')?.value || 10;
    const currentSlots = this.roleSlots();
    const specialSlotsSum = currentSlots
      .filter((r) => !r.isDefault)
      .reduce((sum, r) => sum + r.slots, 0);
    const defaultSlots = Math.max(0, maxParticipants - specialSlotsSum);

    this.roleSlots.update((slots) =>
      slots.map((s) => (s.isDefault ? { ...s, slots: defaultSlots } : s)),
    );
  }

  updateRoleSlots(roleKey: string, newSlots: number): void {
    const maxParticipants = this.form.get('maxParticipants')?.value || 10;

    this.roleSlots.update((slots) => {
      const updated = slots.map((s) => (s.key === roleKey ? { ...s, slots: newSlots } : s));
      const specialSum = updated.filter((r) => !r.isDefault).reduce((sum, r) => sum + r.slots, 0);
      const defaultSlots = Math.max(0, maxParticipants - specialSum);
      return updated.map((s) => (s.isDefault ? { ...s, slots: defaultSlots } : s));
    });
  }

  private buildRoleConfig(): EventRoleConfig | undefined {
    if (!this.rolesEnabled() || this.roleSlots().length === 0) {
      return undefined;
    }

    const discipline = this.disciplines().find(
      (d) => d.id === this.form.get('disciplineId')?.value,
    );
    if (!discipline?.slug) return undefined;

    return {
      disciplineSlug: discipline.slug,
      roles: this.roleSlots().map((r) => ({
        key: r.key,
        title: r.title,
        desc: r.desc,
        slots: r.slots,
        isDefault: r.isDefault,
      })),
    };
  }
}
