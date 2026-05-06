import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { MapComponent } from '../../../../shared/event-form/ui/map/map.component';
import { RulesEditorComponent } from '../../../../shared/event-form/ui/rules-editor/rules-editor.component';
import { DateTimeInputComponent } from '../../../../shared/ui/date-time-input/date-time-input.component';
import { FormControlErrorDirective } from '../../../../shared/ui/form-control-error/form-control-error.directive';
import { EventService } from '../../../../core/services/event.service';
import { EventSeriesService } from '../../../../core/services/event-series.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { GeocodeService } from '../../../../core/services/geocode.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { DictionaryItem, City, Event, CoverImage, EventRoleConfig } from '../../../../shared/types';
import { coverImageUrl } from '../../../../shared/types/cover-image.interface';
import {
  EventStatus,
  DisciplineParticipantRoles,
  DisciplineRole,
  DisciplineSchema,
  nowInZone,
  createDateInZone,
  toLocalInputValue,
  fromLocalInputValue,
  EventSeriesRecurrenceType,
} from '@zgadajsie/shared';
import { isEventJoinable } from '../../../../shared/utils/event-time-status.util';
import { EventValidators } from '../../validators/event.validators';
import { TranslocoPipe } from '@jsverse/transloco';
import { RecurrencePickerComponent } from '../../../../shared/event-form/ui/recurrence-picker/recurrence-picker.component';
import { environment } from '../../../../../environments/environment';

interface DuplicateQueryParams {
  duplicateId?: string;
  seriesMode?: string;
}

interface EventRule {
  id: string;
  text: string;
  indent: number;
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
    DateTimeInputComponent,
    FormControlErrorDirective,
    TranslocoPipe,
    RecurrencePickerComponent,
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
                id="title"
                formControlName="title"
                appFormControlError
                placeholder="Nazwa wydarzenia"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Opis</label>
              <textarea
                formControlName="description"
                rows="4"
                appFormControlError
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
                <select formControlName="disciplineSlug" appFormControlError>
                  <option value="">Wybierz...</option>
                  @for (d of disciplines(); track d.slug) {
                    <option [value]="d.slug">{{ 'dict.discipline.' + d.slug | transloco }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Poziom</label>
                <select formControlName="levelSlug" appFormControlError>
                  <option value="">Wybierz...</option>
                  @for (l of levels(); track l.slug) {
                    <option [value]="l.slug">{{ 'dict.level.' + l.slug | transloco }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Obiekt</label>
                <select formControlName="facilitySlug" appFormControlError>
                  <option value="">Wybierz...</option>
                  @for (f of facilities(); track f.slug) {
                    <option [value]="f.slug">{{ 'dict.facility.' + f.slug | transloco }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Rezerwacja obiektu -->
            <div
              [class]="
                'rounded-xl border p-3 transition-colors ' +
                (form.get('facilityReserved')?.value
                  ? 'border-success-200 bg-success-50'
                  : 'border-warning-300 bg-warning-50')
              "
            >
              <label class="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  formControlName="facilityReserved"
                  class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-highlight"
                />
                <div>
                  <span
                    [class]="
                      'block text-sm font-semibold ' +
                      (form.get('facilityReserved')?.value
                        ? 'text-success-700'
                        : 'text-warning-700')
                    "
                  >
                    {{
                      form.get('facilityReserved')?.value
                        ? 'Obiekt jest zarezerwowany przez organizatora'
                        : 'Obiekt ogólnodostępny - brak własnej rezerwacji'
                    }}
                  </span>
                  <span
                    [class]="
                      'mt-0.5 block text-xs ' +
                      (form.get('facilityReserved')?.value
                        ? 'text-success-600'
                        : 'text-warning-600')
                    "
                  >
                    {{
                      form.get('facilityReserved')?.value
                        ? 'Organizator zapewnił rezerwację obiektu na czas tego wydarzenia.'
                        : 'Obiekt jest publiczny i dostępny dla wszystkich. Nawet przy komplecie uczestników ktoś może go zajmować w tym terminie - wydarzenie może się nie odbyć.'
                    }}
                  </span>
                </div>
              </label>
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
                <app-date-time-input formControlName="startsAt" />
              </div>
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Koniec</label>
                <app-date-time-input formControlName="endsAt" />
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
                        <span class="text-sm font-medium text-neutral-900">
                          {{ 'dict.participant-role.' + role.key + '.title' | transloco }}
                        </span>
                        @if (role.isDefault) {
                          <span
                            class="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700"
                            >domyślna</span
                          >
                        }
                      </div>
                      <p class="text-xs text-neutral-500 mt-0.5">
                        {{ 'dict.participant-role.' + role.key + '.desc' | transloco }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                      @if (role.isDefault) {
                        <span class="text-sm font-medium text-neutral-700 w-12 text-center">{{
                          role.slots || 0
                        }}</span>
                      } @else {
                        <input
                          type="number"
                          [value]="role.slots || 0"
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

              @if (rolesEnabled() && roleSlotsSum() !== form.get('maxParticipants')?.value) {
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

            <!-- Miasto -->
            <div>
              <label class="block text-xs font-medium text-neutral-600 mb-1">Miasto</label>
              <select formControlName="citySlug" appFormControlError>
                <option value="">Wybierz...</option>
                @for (c of cities(); track c.slug) {
                  <option [value]="c.slug">{{ c.name }}</option>
                }
              </select>
            </div>

            @if (form.get('citySlug')?.value) {
              <!-- Adres i mapa dostępne tylko po wybraniu miasta -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1">Adres</label>
                <div class="flex gap-2">
                  <input
                    formControlName="address"
                    (blur)="onAddressChange()"
                    appFormControlError
                    placeholder="Ulica, numer"
                  />
                  <app-button
                    type="button"
                    size="sm"
                    [disabled]="geocoding()"
                    (click)="onAddressChange()"
                    class="whitespace-nowrap"
                  >
                    @if (geocoding()) {
                      <app-icon name="loader" class="animate-spin" size="sm" />
                    } @else {
                      <app-icon name="search" size="sm" />
                    }
                    Znajdź
                  </app-button>
                </div>
              </div>

              <div class="h-[250px] overflow-hidden rounded-xl">
                <app-map
                  #mapComponent
                  [lat]="mapLat()"
                  [lng]="mapLng()"
                  [interactive]="true"
                  (markerMoved)="onMarkerMoved($event)"
                ></app-map>
              </div>
            } @else {
              <!-- Informacja o konieczności wybrania miasta -->
              <div class="text-center py-8 px-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <app-icon name="map-pin" size="lg" class="text-neutral-400 mb-2" />
                <p class="text-sm text-neutral-600">
                  Wybierz miasto, aby ustawić lokalizację wydarzenia
                </p>
              </div>
            }
          </div>
        </app-card>

        <app-card>
          <div class="p-4">
            <app-rules-editor [rules]="eventRules()" (rulesChange)="onRulesChange($event)" />
          </div>
        </app-card>

        <!-- Cover image - pokazuj tylko po wybraniu dyscypliny i gdy są dostępne cover images -->
        @if (form.get('disciplineSlug')?.value && coverImages().length > 0) {
          <app-card>
            <div class="p-4 space-y-3">
              <h3 class="text-sm font-semibold text-neutral-900">Grafika wydarzenia</h3>

              <!-- Przełącznik trybu auto -->
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  [checked]="autoCoverImage()"
                  (change)="toggleAutoCoverImage($any($event.target).checked)"
                  class="h-4 w-4 shrink-0 cursor-pointer rounded accent-highlight"
                />
                <span class="text-sm text-neutral-700">Automatyczny dobór grafiki</span>
              </label>

              @if (autoCoverImage()) {
                <!-- Tryb automatyczny -->
                @if (suggestLoading()) {
                  <div class="flex items-center justify-center py-6">
                    <div
                      class="h-6 w-6 animate-spin rounded-full border-2 border-highlight border-t-transparent"
                    ></div>
                  </div>
                } @else if (suggestedCover(); as cover) {
                  <div class="space-y-2">
                    <div
                      class="relative overflow-hidden rounded-xl border-2 border-primary-300 ring-2 ring-primary-300/30"
                    >
                      <img
                        [src]="coverUrl(cover)"
                        [alt]="cover.filename"
                        class="w-full aspect-[700/250] object-cover"
                      />
                      <div
                        class="absolute inset-0 bg-primary-500/10 flex items-end justify-end p-2"
                      >
                        <span
                          class="rounded-lg bg-primary-600 px-2 py-0.5 text-xs font-medium text-white"
                        >
                          auto
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800"
                      (click)="fetchSuggestedCover()"
                    >
                      <app-icon name="refresh-cw" size="xs" />
                      Losuj inną
                    </button>
                  </div>
                } @else if (!form.get('citySlug')?.value) {
                  <p class="text-xs text-neutral-500">
                    Wybierz miasto, aby zobaczyć sugestię grafiki.
                  </p>
                }
              } @else {
                <!-- Tryb ręczny - galeria -->
                @if (coverImagesLoading()) {
                  <div class="flex items-center justify-center py-6">
                    <div
                      class="h-6 w-6 animate-spin rounded-full border-2 border-highlight border-t-transparent"
                    ></div>
                  </div>
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
                          [alt]="cover.filename"
                          class="w-full aspect-[700/250] object-cover"
                        />
                        @if (selectedCoverImageId() === cover.id) {
                          <div
                            class="absolute inset-0 bg-primary-500/20 flex items-center justify-center"
                          >
                            <div class="rounded-full bg-primary-500 p-1">
                              <app-icon name="check" size="sm" class="text-white" />
                            </div>
                          </div>
                        }
                      </button>
                    }
                  </div>
                }
              }
            </div>
          </app-card>
        }

        @if (seriesAvailable && isEdit() && editEventSeriesId()) {
          <app-card>
            <div class="p-4 flex items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <app-icon name="repeat" size="sm" class="text-primary-500 mt-0.5 shrink-0" />
                <div>
                  <p class="text-sm font-medium text-neutral-900">To wydarzenie należy do serii</p>
                  <p class="text-xs text-neutral-500 mt-0.5">
                    Edytujesz pojedyncze wydarzenie. Zmiany nie wpłyną na pozostałe zdarzenia w
                    serii.
                  </p>
                </div>
              </div>

              <app-button
                type="button"
                appearance="soft"
                color="primary"
                size="sm"
                (clicked)="openSeriesSettings()"
              >
                Ustawienia serii
              </app-button>
            </div>
          </app-card>
        }

        @if (seriesAvailable && !isEdit()) {
          <app-card>
            <div class="p-4 space-y-4">
              <h3 class="text-sm font-semibold text-neutral-900">Seria wydarzeń</h3>

              <label class="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  [checked]="seriesEnabled()"
                  (change)="toggleSeriesEnabled($any($event.target).checked)"
                  class="h-4 w-4 shrink-0 cursor-pointer rounded accent-highlight"
                />
                <span class="text-sm text-neutral-700">Powtarzaj wydarzenie (seria)</span>
              </label>

              @if (seriesEnabled()) {
                <div>
                  <label class="block text-sm font-medium text-neutral-700 mb-1">Nazwa serii</label>
                  <input
                    [formControl]="$any(seriesForm.get('name'))"
                    placeholder="np. Trening środowy"
                    class="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                  />
                </div>

                <app-recurrence-picker [formGroup]="seriesForm" timezone="Europe/Warsaw" />

                @if (autoCoverImage()) {
                  <div
                    class="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700"
                  >
                    <app-icon name="image" size="xs" class="shrink-0" />
                    Każde wydarzenie z serii otrzyma inną grafikę automatycznie.
                  </div>
                }
              }
            </div>
          </app-card>
        }

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
            {{
              isEdit() ? 'Zapisz zmiany' : seriesEnabled() ? 'Utwórz serię' : 'Utwórz wydarzenie'
            }}
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
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly coverImageService = inject(CoverImageService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);
  private readonly breadcrumb = inject(BreadcrumbService);

  readonly seriesAvailable = environment.enableEventSeries;

  readonly isEdit = signal(false);
  readonly seriesEnabled = signal(false);
  readonly editEventSeriesId = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly geocoding = signal(false);
  readonly mapLat = signal(51.935);
  readonly mapLng = signal(15.506);

  private readonly geocodeService = inject(GeocodeService);

  readonly mapComponent = viewChild.required<MapComponent>('mapComponent');

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly facilities = signal<DictionaryItem[]>([]);
  readonly levels = signal<DictionaryItem[]>([]);
  readonly cities = signal<City[]>([]);
  readonly eventRules = signal<EventRule[]>([]);
  readonly coverImages = signal<CoverImage[]>([]);
  readonly coverImagesLoading = signal(false);
  readonly selectedCoverImageId = signal<string | null>(null);
  readonly autoCoverImage = signal(false);
  readonly suggestLoading = signal(false);
  readonly suggestedCover = signal<CoverImage | null>(null);

  readonly disciplineRoles = signal<DisciplineParticipantRoles | null>(null);
  readonly roleSlots = signal<DisciplineRole[]>([]);
  readonly rolesEnabled = signal(false);

  readonly roleSlotsSum = computed(() =>
    this.roleSlots().reduce((sum, r) => sum + (r.slots || 0), 0),
  );

  private eventId: string | null = null;

  readonly seriesForm = this.fb.group({
    name: ['', Validators.required],
    recurrenceType: [
      EventSeriesRecurrenceType.INTERVAL as EventSeriesRecurrenceType,
      Validators.required,
    ],
    intervalDays: [7],
    daysOfWeek: [[] as number[]],
    time: ['19:00', Validators.required],
    durationMinutes: [120, [Validators.required, Validators.min(15)]],
    startDate: ['', Validators.required],
    endDate: [''],
  });

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    disciplineSlug: ['', Validators.required],
    facilitySlug: ['', Validators.required],
    levelSlug: ['', Validators.required],
    citySlug: ['', Validators.required],
    startsAt: ['', [Validators.required, EventValidators.startDateInFuture]],
    endsAt: ['', [Validators.required, EventValidators.endDateAfterStart]],
    costPerPerson: [0],
    minParticipants: [2],
    maxParticipants: [10],
    ageMin: [undefined as number | undefined],
    ageMax: [undefined as number | undefined],
    gender: ['ANY'],
    visibility: ['PUBLIC'],
    facilityReserved: [true],
    address: ['', Validators.required],
    lat: [51.935],
    lng: [15.506],
  });

  constructor() {
    // Ustaw domyślne wartości po utworzeniu formularza
    this.setDefaultValues();
  }

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

      // Ustaw domyślny poziom na "Mieszany (open)"
      if (levels.length > 0 && !this.form.get('levelSlug')?.value) {
        const defaultLevel = levels.find((l) => l.slug === 'mixed-open') ?? levels[0];
        this.form.patchValue({ levelSlug: defaultLevel.slug });
      }

      // Po załadowaniu słowników, sprawdzamy czy to duplikacja
      this.handleDuplicateIfPresent();
    });

    // Watch discipline changes to load cover images and role schema
    this.form.get('disciplineSlug')?.valueChanges.subscribe((disciplineSlug) => {
      if (disciplineSlug) {
        this.loadCoverImages(disciplineSlug);
        this.loadDisciplineRoles(disciplineSlug);
      } else {
        this.coverImages.set([]);
        this.selectedCoverImageId.set(null);
        this.autoCoverImage.set(false);
        this.suggestedCover.set(null);
        this.disciplineRoles.set(null);
        this.roleSlots.set([]);
        this.rolesEnabled.set(false);
      }
    });

    // Watch maxParticipants changes to adjust default role slots
    this.form.get('maxParticipants')?.valueChanges.subscribe(() => {
      this.recalculateDefaultRoleSlots();
    });

    // Re-fetch suggestion when city changes while auto mode is on
    this.form.get('citySlug')?.valueChanges.subscribe(() => {
      if (this.autoCoverImage()) {
        this.fetchSuggestedCover();
      }
    });

    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEdit.set(true);
      this.eventService.getEvent(this.eventId).subscribe((e) => {
        if (!this.auth.isAdmin() && !isEventJoinable(e.startsAt, e.status)) {
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
          disciplineSlug: e.disciplineSlug,
          facilitySlug: e.facilitySlug,
          levelSlug: e.levelSlug,
          citySlug: e.citySlug,
          startsAt: e.startsAt.substring(0, 16),
          endsAt: e.endsAt.substring(0, 16),
          costPerPerson: e.costPerPerson,
          minParticipants: e.minParticipants || 2,
          maxParticipants: e.maxParticipants || 10,
          gender: e.gender,
          visibility: e.visibility,
          facilityReserved: e.facilityReserved ?? true,
          address: e.address,
          lat: e.lat,
          lng: e.lng,
        });

        this.form.get('ageMin')?.setValue(e.ageMin);
        this.form.get('ageMax')?.setValue(e.ageMax);
        this.eventRules.set(this.parseRules(e.rules));
        this.mapLat.set(e.lat);
        this.mapLng.set(e.lng);

        if (e.coverImageId) {
          this.selectedCoverImageId.set(e.coverImageId);
        }

        if (e.seriesId) {
          this.editEventSeriesId.set(e.seriesId);
        }
      });
    } else if (this.route.snapshot.queryParamMap.get('seriesMode') === 'true') {
      this.toggleSeriesEnabled(true);
    }
  }

  coverUrl(cover: CoverImage): string {
    return coverImageUrl(cover.disciplineSlug, cover.filename);
  }

  selectCoverImage(cover: CoverImage): void {
    this.selectedCoverImageId.set(cover.id);
  }

  openSeriesSettings(): void {
    const seriesId = this.editEventSeriesId();
    if (!seriesId) {
      return;
    }

    void this.router.navigate(['/series', seriesId]);
  }

  onMarkerMoved(pos: { lat: number; lng: number }): void {
    this.form.patchValue({ lat: pos.lat, lng: pos.lng });
    this.mapLat.set(pos.lat);
    this.mapLng.set(pos.lng);
  }

  async onAddressChange(): Promise<void> {
    const address = this.form.get('address')?.value;
    const citySlug = this.form.get('citySlug')?.value;

    if (!address || address.trim().length < 3) {
      return;
    }

    this.geocoding.set(true);

    try {
      // Pobierz dane miasta jeśli jest wybrane
      let cityName = '';
      if (citySlug) {
        const city = this.cities().find((c) => c.slug === citySlug);
        cityName = city ? city.name : '';
      }

      // Połącz adres z miastem dla lepszych wyników
      const fullAddress = cityName ? `${address}, ${cityName}` : address;

      const result = await this.geocodeService.geocodeAddress(fullAddress);

      if (result) {
        this.form.patchValue({ lat: result.lat, lng: result.lng });
        this.mapLat.set(result.lat);
        this.mapLng.set(result.lng);

        // Bezpośrednie wywołanie aktualizacji mapy
        const mapComponent = this.mapComponent();
        if (mapComponent) {
          mapComponent.updatePosition(result.lat, result.lng);
        }

        this.snackbar.success('Znaleziono lokalizację dla podanego adresu');
      } else {
        this.snackbar.warning('Nie znaleziono lokalizacji dla podanego adresu');
      }
    } catch {
      this.snackbar.error('Błąd podczas wyszukiwania adresu');
    } finally {
      this.geocoding.set(false);
    }
  }

  onRulesChange(rules: EventRule[]): void {
    this.eventRules.set(rules);
  }

  formatRules(rules: EventRule[]): string {
    return rules
      .filter((rule) => rule.text.trim())
      .map((rule) => `${' '.repeat(rule.indent)}${rule.text}`)
      .join('\n');
  }

  parseRules(rulesString?: string): EventRule[] {
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
    if (this.form.invalid) {
      // Zaznacz pola z błędami
      this.markFormGroupTouched(this.form);
      this.snackbar.error('Formularz zawiera błędy. Popraw wszystkie wymagane pola.');
      return;
    }

    // Dodatkowa walidacja kompletności danych
    const val = this.form.getRawValue();

    // Sprawdź podstawowe dane
    if (!val.title?.trim()) {
      this.snackbar.error('Tytuł jest wymagany.');
      return;
    }

    if (!val.disciplineSlug) {
      this.snackbar.error('Dyscyplina jest wymagana.');
      return;
    }

    if (!val.facilitySlug) {
      this.snackbar.error('Obiekt jest wymagany.');
      return;
    }

    if (!val.levelSlug) {
      this.snackbar.error('Poziom jest wymagany.');
      return;
    }

    if (!val.citySlug) {
      this.snackbar.error('Miasto jest wymagane.');
      return;
    }

    if (!val.address?.trim()) {
      this.snackbar.error('Adres jest wymagany.');
      return;
    }

    // Sprawdź daty
    if (!val.startsAt) {
      this.snackbar.error('Data rozpoczęcia jest wymagana.');
      return;
    }

    if (!val.endsAt) {
      this.snackbar.error('Data zakończenia jest wymagana.');
      return;
    }

    const startUtc = fromLocalInputValue(val.startsAt);
    const endUtc = fromLocalInputValue(val.endsAt);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nowUtc = nowInZone().toISO()!;

    if (startUtc <= nowUtc) {
      this.snackbar.error('Data rozpoczęcia musi być w przyszłości.');
      return;
    }

    if (endUtc <= startUtc) {
      this.snackbar.error('Data zakończenia musi być późniejsza niż data rozpoczęcia.');
      return;
    }

    // Sprawdź liczbę uczestników
    if (val.maxParticipants && val.minParticipants && val.maxParticipants < val.minParticipants) {
      this.snackbar.error('Maksymalna liczba uczestników musi być większa lub równa minimalnej.');
      return;
    }

    // Sprawdź przedział wiekowy
    if (val.ageMin && val.ageMax && val.ageMax < val.ageMin) {
      this.snackbar.error('Maksymalny wiek musi być większy lub równy minimalnemu wiekowi.');
      return;
    }

    this.submitting.set(true);

    const payload: Partial<Event> & { roleConfig?: EventRoleConfig } = {
      title: val.title || undefined,
      description: val.description || undefined,
      disciplineSlug: val.disciplineSlug || undefined,
      facilitySlug: val.facilitySlug || undefined,
      levelSlug: val.levelSlug || undefined,
      citySlug: val.citySlug || undefined,
      startsAt: val.startsAt ? fromLocalInputValue(val.startsAt) : undefined,
      endsAt: val.endsAt ? fromLocalInputValue(val.endsAt) : undefined,
      costPerPerson: val.costPerPerson || undefined,
      minParticipants: val.minParticipants || undefined,
      maxParticipants: val.maxParticipants || undefined,
      ageMin: val.ageMin || undefined,
      ageMax: val.ageMax || undefined,
      gender: val.gender || undefined,
      visibility: val.visibility || undefined,
      facilityReserved: val.facilityReserved ?? true,
      address: val.address || undefined,
      lat: val.lat || undefined,
      lng: val.lng || undefined,
      rules: this.formatRules(this.eventRules()),
      coverImageId: this.selectedCoverImageId() || undefined,
      roleConfig: this.buildRoleConfig(),
    };

    if (this.seriesEnabled() && !this.isEdit()) {
      const sv = this.seriesForm.getRawValue();
      if (!sv.name?.trim()) {
        this.snackbar.error('Nazwa serii jest wymagana.');
        this.submitting.set(false);
        return;
      }
      if (!sv.startDate) {
        this.snackbar.error('Data rozpoczęcia serii jest wymagana.');
        this.submitting.set(false);
        return;
      }

      const seriesPayload = {
        name: sv.name,
        recurrenceType: sv.recurrenceType as EventSeriesRecurrenceType,
        intervalDays: sv.intervalDays ?? undefined,
        daysOfWeek: (sv.daysOfWeek as number[]) ?? undefined,
        time: sv.time ?? '19:00',
        timezone: 'Europe/Warsaw',
        durationMinutes: sv.durationMinutes ?? 120,
        startDate: sv.startDate,
        endDate: sv.endDate || undefined,
        title: val.title as string,
        description: val.description || undefined,
        disciplineSlug: val.disciplineSlug as string,
        facilitySlug: val.facilitySlug as string,
        levelSlug: val.levelSlug as string,
        citySlug: val.citySlug as string,
        address: val.address as string,
        lat: val.lat as number,
        lng: val.lng as number,
        costPerPerson: val.costPerPerson || undefined,
        minParticipants: val.minParticipants || undefined,
        maxParticipants: val.maxParticipants ?? 10,
        ageMin: val.ageMin || undefined,
        ageMax: val.ageMax || undefined,
        gender: val.gender || undefined,
        visibility: val.visibility || undefined,
        facilityReserved: val.facilityReserved ?? true,
        rules: this.formatRules(this.eventRules()) || undefined,
        coverImageId: this.selectedCoverImageId() || undefined,
        roleConfig: this.buildRoleConfig() ?? undefined,
      };

      this.eventSeriesService.createSeries(seriesPayload).subscribe({
        next: (series) => {
          this.snackbar.success('Seria wydarzeń utworzona');
          this.router.navigate(['/series', series.id]);
          this.submitting.set(false);
        },
        error: (err) => {
          this.snackbar.error(err?.error?.message || 'Nie udało się utworzyć serii');
          this.submitting.set(false);
        },
      });
      return;
    }

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

  toggleSeriesEnabled(checked: boolean): void {
    this.seriesEnabled.set(checked);
    if (checked) {
      const startsAt = this.form.get('startsAt')?.value;
      if (startsAt) {
        this.seriesForm.patchValue({ startDate: startsAt.substring(0, 10) });
      }
    }
  }

  toggleAutoCoverImage(checked: boolean): void {
    this.autoCoverImage.set(checked);
    if (checked) {
      this.fetchSuggestedCover();
    } else {
      this.suggestedCover.set(null);
    }
  }

  fetchSuggestedCover(): void {
    const disciplineSlug = this.form.get('disciplineSlug')?.value;
    const citySlug = this.form.get('citySlug')?.value;

    if (!disciplineSlug || !citySlug) {
      this.suggestedCover.set(null);
      return;
    }

    this.suggestLoading.set(true);
    this.coverImageService.suggest(disciplineSlug, citySlug).subscribe({
      next: (cover) => {
        this.suggestedCover.set(cover);
        this.selectedCoverImageId.set(cover?.id ?? null);
        this.suggestLoading.set(false);
      },
      error: () => {
        this.autoCoverImage.set(false);
        this.suggestedCover.set(null);
        this.suggestLoading.set(false);
        this.snackbar.error('Nie udało się pobrać sugestii grafiki');
      },
    });
  }

  private loadCoverImages(disciplineSlug: string): void {
    this.coverImagesLoading.set(true);
    this.coverImageService.getAll(disciplineSlug).subscribe({
      next: (images) => {
        this.coverImages.set(images);
        this.coverImagesLoading.set(false);

        // Auto-select random if nothing selected, images available, and not in auto mode
        if (!this.selectedCoverImageId() && images.length > 0 && !this.autoCoverImage()) {
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

  private loadDisciplineRoles(disciplineSlug: string): void {
    const discipline = this.disciplines().find((d) => d.slug === disciplineSlug);
    if (!discipline?.slug) {
      this.disciplineRoles.set(null);
      this.roleSlots.set([]);
      this.rolesEnabled.set(false);
      return;
    }

    this.dictService
      .getDisciplineSchema(discipline.slug)
      .subscribe((schema: DisciplineSchema | null) => {
        if (!schema?.participantRoles) {
          this.disciplineRoles.set(null);
          this.roleSlots.set([]);
          this.rolesEnabled.set(false);
          return;
        }

        this.disciplineRoles.set(schema.participantRoles);
        this.initializeRoleSlots(schema.participantRoles);
      });
  }

  private initializeRoleSlots(roles: DisciplineParticipantRoles): void {
    const maxParticipants = this.form.get('maxParticipants')?.value || 10;
    const specialSlotsSum = roles.special.reduce((sum, r) => sum + (r.slots || 0), 0);
    const defaultSlots = Math.max(0, maxParticipants - specialSlotsSum);

    const slots: DisciplineRole[] = [
      {
        key: roles.default.key,
        slots: defaultSlots,
        isDefault: true,
      },
      ...roles.special.map((r) => ({
        key: r.key,
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
      .reduce((sum, r) => sum + (r.slots || 0), 0);
    const defaultSlots = Math.max(0, maxParticipants - specialSlotsSum);

    this.roleSlots.update((slots) =>
      slots.map((s) => (s.isDefault ? { ...s, slots: defaultSlots } : s)),
    );
  }

  updateRoleSlots(roleKey: string, newSlots: number): void {
    const maxParticipants = this.form.get('maxParticipants')?.value || 10;

    this.roleSlots.update((slots) => {
      const updated = slots.map((s) => (s.key === roleKey ? { ...s, slots: newSlots } : s));
      const specialSum = updated
        .filter((r) => !r.isDefault)
        .reduce((sum, r) => sum + (r.slots || 0), 0);
      const defaultSlots = Math.max(0, maxParticipants - specialSum);
      return updated.map((s) => (s.isDefault ? { ...s, slots: defaultSlots } : s));
    });
  }

  private buildRoleConfig(): EventRoleConfig | undefined {
    if (!this.rolesEnabled() || this.roleSlots().length === 0) {
      return undefined;
    }

    const discipline = this.disciplines().find(
      (d) => d.slug === this.form.get('disciplineSlug')?.value,
    );
    if (!discipline?.slug) return undefined;

    return {
      disciplineSlug: discipline.slug,
      roles: this.roleSlots(),
    };
  }

  private handleDuplicateIfPresent(): void {
    const queryParams = this.route.snapshot.queryParams as DuplicateQueryParams;

    // Sprawdzamy czy to jest duplikacja
    if (queryParams.duplicateId) {
      // Pobierz dane wydarzenia do duplikacji z weryfikacją uprawnień
      this.eventService.getEventForDuplication(queryParams.duplicateId).subscribe({
        next: (event) => {
          // Wypełnij formularz danymi z pobranego wydarzenia
          this.populateFormFromEvent(event);
          this.snackbar.info('Formularz wypełniony danymi z duplikowanego wydarzenia');
        },
        error: (err) => {
          const notFound = 'Wydarzenie nie zostało znalezione lub nie masz do niego dostępu';

          if (err?.status === 403) {
            // Wydarzenie nie należy do tego użytkownika, więc nie może go duplikować
            this.snackbar.error(notFound);
            // Przekieruj do bezpiecznej strony bez duplicateId
            this.router.navigate(['/o/w/new']);
          } else if (err?.status === 404) {
            this.snackbar.error(notFound);
            this.router.navigate(['/o/w/new']);
          } else {
            this.snackbar.error('Nie udało się pobrać danych wydarzenia do duplikacji');
          }
        },
      });
    }
  }

  private populateFormFromEvent(event: Event): void {
    this.form.patchValue({
      title: event.title,
      description: event.description || '',
      disciplineSlug: event.disciplineSlug,
      facilitySlug: event.facilitySlug,
      levelSlug: event.levelSlug,
      citySlug: event.citySlug,
      startsAt: toLocalInputValue(event.startsAt),
      endsAt: toLocalInputValue(event.endsAt),
      costPerPerson: event.costPerPerson,
      minParticipants: event.minParticipants || 2,
      maxParticipants: event.maxParticipants || 10,
      gender: event.gender,
      visibility: event.visibility,
      facilityReserved: event.facilityReserved ?? true,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
    });
    this.form.get('ageMin')?.setValue(event.ageMin);
    this.form.get('ageMax')?.setValue(event.ageMax);

    // Ustaw reguły jeśli są
    if (event.rules) {
      this.eventRules.set(this.parseRules(event.rules));
    }

    // Ustaw mapę jeśli są współrzędne
    if (event.lat && event.lng) {
      this.mapLat.set(event.lat);
      this.mapLng.set(event.lng);
    }

    // Ustaw cover image jeśli jest
    if (event.coverImageId) {
      this.selectedCoverImageId.set(event.coverImageId);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control: AbstractControl) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private setDefaultValues(): void {
    // Ustaw domyślny poziom na "Zróżnicowany"
    // (zostanie zaktualizowany po załadowaniu słowników)

    // Ustaw domyślne czasy - jutro 19:00–21:00 w polskiej strefie
    const now = nowInZone();
    const tomorrow = now.plus({ days: 1 });
    const startsAt = createDateInZone(tomorrow.year, tomorrow.month, tomorrow.day, 19, 0);
    const endsAt = createDateInZone(tomorrow.year, tomorrow.month, tomorrow.day, 21, 0);

    this.form.patchValue({
      startsAt: startsAt.toFormat("yyyy-MM-dd'T'HH:mm"),
      endsAt: endsAt.toFormat("yyyy-MM-dd'T'HH:mm"),
    });
  }
}
