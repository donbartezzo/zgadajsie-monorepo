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
import { ActivatedRoute } from '@angular/router';
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
import { NavigationService } from '../../../../core/services/navigation.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { Event, CoverImage, EventRoleConfig } from '../../../../shared/types';
import { buildCoverImageUrl } from '../../../../shared/utils/cover-image.utils';
import {
  ImageCropperModalComponent,
  ImageCropperResult,
} from '../../../../shared/ui/image-cropper-modal';
import {
  EventStatus,
  DisciplineParticipantRoles,
  DisciplineRole,
  DisciplineSchema,
  nowInZone,
  createDateInZone,
  toLocalInputValue,
  fromLocalInputValue,
  UpdateEventSeriesPayload,
  DictionaryItem,
  City,
} from '@zgadajsie/shared';
import { isEventJoinable } from '../../../../shared/utils/event-time-status.util';
import { EventValidators } from '../../validators/event.validators';
import { TranslocoPipe } from '@jsverse/transloco';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { OrganizerNavRailComponent } from '../../../organizer/ui/organizer-nav-rail/organizer-nav-rail.component';
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
    ImageCropperModalComponent,
    LayoutSlotDirective,
    OrganizerNavRailComponent,
  ],
  template: `
    <!-- RWD-16: rail panelu organizatora w kolumnie aside (tryb 2-kol od lg) -->
    <ng-template appLayoutSlot="aside">
      <app-organizer-nav-rail />
    </ng-template>

    <!-- RWD-16: na desktopie (2-kol) inset zapewnia box (lg:p-3) — nie dublujemy paddingu widoku -->
    <div class="p-4 lg:p-0">
      <h1 class="text-xl font-bold text-neutral-900 mb-4">
        @if (seriesTemplateMode()) {
          Edytuj dane wydarzeń serii
        } @else if (isEdit()) {
          Edytuj wydarzenie
        } @else {
          Nowe wydarzenie
        }
      </h1>

      @if (seriesTemplateMode()) {
        @let affected = seriesTemplateAffected();
        <div class="mb-4 rounded-xl border border-info-200 bg-info-50 px-4 py-3 space-y-1">
          <p class="text-sm font-semibold text-info-700">Edycja szablonu serii</p>
          <p class="text-sm text-info-700">
            Zmiany zostaną zastosowane wyłącznie do przyszłych wydarzeń, w których nikt jeszcze się
            nie zapisał.
          </p>
          @if (affected.withoutEnrollments > 0) {
            <p class="text-sm text-info-600">
              Dotyczy: {{ affected.withoutEnrollments }}
              {{ affected.withoutEnrollments === 1 ? 'wydarzenia' : 'wydarzeń' }} bez zapisów.
            </p>
          }
          @if (affected.withEnrollments > 0) {
            <p class="text-sm text-info-500">
              {{ affected.withEnrollments }}
              {{ affected.withEnrollments === 1 ? 'wydarzenie' : 'wydarzeń' }} z zapisami pozostanie
              bez zmian.
            </p>
          }
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-card>
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Tytuł</label>
              <input
                id="title"
                formControlName="title"
                autocomplete="off"
                enterkeyhint="next"
                appFormControlError
                placeholder="Nazwa wydarzenia"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Opis</label>
              <textarea
                formControlName="description"
                rows="4"
                enterkeyhint="next"
                appFormControlError
                placeholder="Opis wydarzenia..."
              ></textarea>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Szczegóły</h3>
            <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
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

            <!-- Wiadomość powitalna -->
            <div class="rounded-xl border border-info-200 bg-info-50 p-3">
              <label class="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  formControlName="welcomeMessageEnabled"
                  class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-highlight"
                />
                <div>
                  <span class="block text-sm font-semibold text-info-700">
                    Wyślij auto-wiadomość powitalną do nowych uczestników
                  </span>
                  <span class="mt-0.5 block text-xs text-info-600">
                    Nowi uczestnicy otrzymają automatyczną wiadomość od Ciebie po zgłoszeniu się na
                    wydarzenie.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="p-4 space-y-4">
            <h3 class="text-sm font-semibold text-neutral-900">Termin i uczestnicy</h3>

            <!-- Daty (ukryte w trybie edycji szablonu serii) -->
            @if (!seriesTemplateMode()) {
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
            }

            <!-- Liczba uczestników -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-neutral-600 mb-1"
                  >Min. uczestników</label
                >
                <input
                  type="number"
                  formControlName="minParticipants"
                  inputmode="numeric"
                  enterkeyhint="next"
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
                  inputmode="numeric"
                  enterkeyhint="next"
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
                  inputmode="numeric"
                  enterkeyhint="next"
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
                  inputmode="numeric"
                  enterkeyhint="done"
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
                  inputmode="decimal"
                  enterkeyhint="done"
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
                          inputmode="numeric"
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
                    autocomplete="street-address"
                    enterkeyhint="done"
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

              <div class="h-[250px] overflow-hidden rounded-xl md:h-[350px] lg:h-[400px]">
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
        @if (
          form.get('disciplineSlug')?.value && (coverImages().length > 0 || myCovers().length > 0)
        ) {
          <app-card>
            <div class="p-4 space-y-3">
              <h3 class="text-sm font-semibold text-neutral-900">Grafika wydarzenia</h3>

              <!-- Zakładki -->
              <div class="flex gap-2 border-b border-neutral-200">
                <button
                  type="button"
                  [class]="
                    'px-3 py-2 text-sm font-medium border-b-2 transition-colors ' +
                    (coverTab() === 'public'
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-neutral-600 hover:text-neutral-900')
                  "
                  (click)="coverTab.set('public')"
                >
                  Galeria publiczna
                </button>
                <button
                  type="button"
                  [class]="
                    'px-3 py-2 text-sm font-medium border-b-2 transition-colors ' +
                    (coverTab() === 'my'
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-neutral-600 hover:text-neutral-900') +
                    (autoCoverImage() ? ' opacity-40 cursor-not-allowed' : '')
                  "
                  [disabled]="autoCoverImage()"
                  (click)="coverTab.set('my')"
                >
                  Galeria własna
                </button>
              </div>

              @if (coverTab() === 'public') {
                <!-- Galeria publiczna -->
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
                          decoding="async"
                          width="700"
                          height="250"
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
                  <!-- Tryb ręczny - galeria publiczna -->
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
                            loading="lazy"
                            decoding="async"
                            width="700"
                            height="250"
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
              } @else {
                <!-- Galeria własna -->
                @if (coverImagesLoading()) {
                  <div class="flex items-center justify-center py-6">
                    <div
                      class="h-6 w-6 animate-spin rounded-full border-2 border-highlight border-t-transparent"
                    ></div>
                  </div>
                } @else {
                  <div class="grid grid-cols-2 gap-2">
                    @for (cover of myCovers(); track cover.id) {
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
                          [alt]="cover.name || cover.filename"
                          class="w-full aspect-[700/250] object-cover"
                          loading="lazy"
                          decoding="async"
                          width="700"
                          height="250"
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
                  @if (myCovers().length < 5) {
                    <button
                      type="button"
                      class="mt-2 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800"
                      [disabled]="myUploadLoading()"
                      (click)="openMyUploadModal()"
                    >
                      <app-icon name="plus" size="xs" />
                      Dodaj nowe cover image
                    </button>
                  }
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

        @if (seriesAvailable && !isEdit() && !seriesTemplateMode()) {
          <app-card>
            <div class="p-4 space-y-3">
              <h3 class="text-sm font-semibold text-neutral-900">Seria wydarzeń</h3>

              <div
                [class]="
                  'rounded-xl border p-3 transition-colors ' +
                  (createSeriesIntent()
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-neutral-200 bg-white')
                "
              >
                <label class="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    [checked]="createSeriesIntent()"
                    (change)="createSeriesIntent.set($any($event.target).checked)"
                    class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-highlight"
                  />
                  <div>
                    <span
                      [class]="
                        'block text-sm font-semibold ' +
                        (createSeriesIntent() ? 'text-primary-700' : 'text-neutral-700')
                      "
                    >
                      Po utworzeniu wydarzenia przejdź do konfiguracji serii
                    </span>
                    <span class="mt-0.5 block text-xs text-neutral-500">
                      Wydarzenie zostanie utworzone jako pojedyncze, a następnie zostaniesz
                      przekierowany do konfiguracji serii z jego użyciem.
                    </span>
                  </div>
                </label>
              </div>
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
            [disabled]="form.invalid && !isAdmin()"
          >
            <app-icon name="check" size="sm"></app-icon>
            @if (seriesTemplateMode()) {
              Zaktualizuj dane wydarzeń
            } @else if (isEdit()) {
              Zapisz zmiany
            } @else {
              Utwórz wydarzenie
            }
          </app-button>
        </div>
      </form>

      <!-- Inline modal: upload własnego cover image w zakładce "Galeria własna" -->
      @if (myUploadModalVisible() && !myUploadCroppedFile()) {
        <app-image-cropper-modal
          [imageFile]="myUploadFile()"
          imageType="cover-image"
          (confirmed)="onMyUploadConfirmed($event)"
          (cancelled)="onMyUploadClosed()"
        />
      }

      @if (myUploadModalVisible() && myUploadCroppedFile()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 class="text-lg font-semibold text-neutral-900">Nazwa cover image</h3>
            <input
              type="text"
              [value]="myUploadName()"
              (input)="myUploadName.set($any($event.target).value)"
              class="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Wpisz nazwę (min 3 znaki)"
            />
            <div class="flex gap-3 justify-end">
              <app-button appearance="soft" color="neutral" (clicked)="onMyUploadClosed()">
                Anuluj
              </app-button>
              <app-button
                appearance="solid"
                color="primary"
                [disabled]="myUploadName().length < 3"
                (clicked)="onMyUploadSave()"
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
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly navigation = inject(NavigationService);
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly eventSeriesService = inject(EventSeriesService);
  private readonly coverImageService = inject(CoverImageService);
  private readonly dictService = inject(DictionaryService);
  private readonly snackbar = inject(SnackbarService);
  private readonly breadcrumb = inject(BreadcrumbService);
  private readonly confirmModal = inject(ConfirmModalService);

  readonly seriesAvailable = environment.enableEventSeries;

  readonly isEdit = signal(false);
  readonly createSeriesIntent = signal(false);
  readonly editEventSeriesId = signal<string | null>(null);
  readonly seriesTemplateMode = signal(false);
  readonly seriesTemplateId = signal<string | null>(null);
  readonly seriesTemplateAffected = signal<{ withoutEnrollments: number; withEnrollments: number }>(
    { withoutEnrollments: 0, withEnrollments: 0 },
  );
  readonly submitting = signal(false);
  readonly geocoding = signal(false);
  readonly mapLat = signal(51.935);
  readonly mapLng = signal(15.506);
  readonly isAdmin = computed(() => this.auth.isAdmin());

  private readonly geocodeService = inject(GeocodeService);

  readonly mapComponent = viewChild.required<MapComponent>('mapComponent');

  readonly disciplines = signal<DictionaryItem[]>([]);
  readonly facilities = signal<DictionaryItem[]>([]);
  readonly levels = signal<DictionaryItem[]>([]);
  readonly cities = signal<City[]>([]);
  readonly eventRules = signal<EventRule[]>([]);
  readonly coverImages = signal<CoverImage[]>([]);
  readonly myCovers = signal<CoverImage[]>([]);
  readonly coverImagesLoading = signal(false);
  readonly selectedCoverImageId = signal<string | null>(null);
  readonly autoCoverImage = signal(false);
  readonly suggestLoading = signal(false);
  readonly suggestedCover = signal<CoverImage | null>(null);
  readonly coverTab = signal<'public' | 'my'>('public');

  readonly myUploadModalVisible = signal(false);
  readonly myUploadFile = signal<File | null>(null);
  readonly myUploadCroppedFile = signal<File | null>(null);
  readonly myUploadName = signal('');
  readonly myUploadLoading = signal(false);

  readonly disciplineRoles = signal<DisciplineParticipantRoles | null>(null);
  readonly roleSlots = signal<DisciplineRole[]>([]);
  readonly rolesEnabled = signal(false);

  readonly roleSlotsSum = computed(() =>
    this.roleSlots().reduce((sum, r) => sum + (r.slots || 0), 0),
  );

  private eventId: string | null = null;

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
    welcomeMessageEnabled: [true],
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
          this.navigation.navigateToEventDetail(e.id, e.city?.slug ?? '');
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

        if (e.coverImage?.id) {
          this.selectedCoverImageId.set(e.coverImage.id);
        }

        if (e.seriesId) {
          this.editEventSeriesId.set(e.seriesId);
        }
      });
    } else {
      const seriesId = this.route.snapshot.paramMap.get('seriesId');
      if (seriesId) {
        this.seriesTemplateMode.set(true);
        this.seriesTemplateId.set(seriesId);
        this.loadSeriesTemplate(seriesId);
      }
    }
  }

  private loadSeriesTemplate(seriesId: string): void {
    this.eventSeriesService.getSeries(seriesId).subscribe((series) => {
      const snap = series.templateSnapshot;
      if (snap) {
        this.form.patchValue({
          title: (snap['title'] as string) ?? '',
          description: (snap['description'] as string) ?? '',
          disciplineSlug: (snap['disciplineSlug'] as string) ?? '',
          facilitySlug: (snap['facilitySlug'] as string) ?? '',
          levelSlug: (snap['levelSlug'] as string) ?? '',
          citySlug: (snap['citySlug'] as string) ?? '',
          costPerPerson: (snap['costPerPerson'] as number) ?? 0,
          minParticipants: (snap['minParticipants'] as number) ?? 2,
          maxParticipants: (snap['maxParticipants'] as number) ?? 10,
          gender: (snap['gender'] as string) ?? 'ANY',
          visibility: (snap['visibility'] as string) ?? 'PUBLIC',
          facilityReserved: (snap['facilityReserved'] as boolean) ?? true,
          address: (snap['address'] as string) ?? '',
          lat: (snap['lat'] as number) ?? 51.935,
          lng: (snap['lng'] as number) ?? 15.506,
        });
        this.form.get('ageMin')?.setValue(snap['ageMin'] as number | undefined);
        this.form.get('ageMax')?.setValue(snap['ageMax'] as number | undefined);

        if (snap['lat']) {
          this.mapLat.set(snap['lat'] as number);
        }
        if (snap['lng']) {
          this.mapLng.set(snap['lng'] as number);
        }
        if (snap['rules']) {
          this.eventRules.set(this.parseRules(snap['rules'] as string));
        }
        if (snap['coverImageId']) {
          this.selectedCoverImageId.set(snap['coverImageId'] as string);
        }
      }

      this.form.get('startsAt')?.clearValidators();
      this.form.get('startsAt')?.updateValueAndValidity();
      this.form.get('endsAt')?.clearValidators();
      this.form.get('endsAt')?.updateValueAndValidity();

      const now = new Date();
      const future = series.events.filter((e) => new Date(e.startsAt) > now);
      const withoutEnrollments = future.filter((e) => (e._count?.enrollments ?? 0) === 0).length;
      const withEnrollments = future.filter((e) => (e._count?.enrollments ?? 0) > 0).length;
      this.seriesTemplateAffected.set({ withoutEnrollments, withEnrollments });
    });
  }

  coverUrl(cover: CoverImage): string {
    return buildCoverImageUrl(cover);
  }

  selectCoverImage(cover: CoverImage): void {
    this.selectedCoverImageId.set(cover.id);
  }

  openMyUploadModal(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.myUploadFile.set(file);
        this.myUploadModalVisible.set(true);
      }
    };
    input.click();
  }

  onMyUploadClosed(): void {
    this.myUploadModalVisible.set(false);
    this.myUploadFile.set(null);
    this.myUploadCroppedFile.set(null);
    this.myUploadName.set('');
  }

  onMyUploadConfirmed(result: ImageCropperResult): void {
    this.myUploadCroppedFile.set(result.file);
  }

  onMyUploadSave(): void {
    const croppedFile = this.myUploadCroppedFile();
    const name = this.myUploadName();
    if (!croppedFile || name.length < 3) {
      return;
    }

    this.myUploadLoading.set(true);
    this.myUploadModalVisible.set(false);

    this.coverImageService.createMy(croppedFile, name).subscribe({
      next: (newCover) => {
        this.myCovers.update((covers) => [newCover, ...covers]);
        this.myUploadLoading.set(false);
        this.myUploadFile.set(null);
        this.myUploadCroppedFile.set(null);
        this.myUploadName.set('');
        this.snackbar.success('Cover image dodany');
      },
      error: () => {
        this.myUploadLoading.set(false);
        this.myUploadModalVisible.set(true);
        this.snackbar.error('Nie udało się dodać cover image');
      },
    });
  }

  openSeriesSettings(): void {
    const seriesId = this.editEventSeriesId();
    if (!seriesId) {
      return;
    }

    void this.navigation.navigateToSeries(seriesId);
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

  async onSubmit(): Promise<void> {
    const isAdmin = this.isAdmin();
    const val = this.form.getRawValue();

    if (this.seriesTemplateMode()) {
      await this.submitSeriesTemplate(val);
      return;
    }

    // Jeśli formularz jest niezwalidowany
    if (this.form.invalid) {
      if (isAdmin) {
        // Administrator może pominąć walidację po potwierdzeniu
        const errors = this.getValidationErrors();
        const errorMessage =
          errors.length > 0
            ? `Formularz zawiera błędy:\n\n${errors.map((e) => `• ${e}`).join('\n')}`
            : 'Formularz zawiera błędy walidacji.';

        const confirmed = await this.confirmModal.confirm({
          title: 'Pomiń walidację?',
          message: `Jesteś administratorem. Czy na pewno chcesz zapisać wydarzenie z pominięciem walidacji?\n\n${errorMessage}`,
          confirmLabel: 'Zapisz mimo to',
          cancelLabel: 'Anuluj',
          color: 'warning',
        });

        if (!confirmed) {
          return;
        }
      } else {
        // Zwykły użytkownik - zaznacz pola z błędami
        this.markFormGroupTouched(this.form);
        this.snackbar.error('Formularz zawiera błędy. Popraw wszystkie wymagane pola.');
        return;
      }
    }

    // Dodatkowa walidacja kompletności danych (tylko dla nie-adminów)
    if (!isAdmin) {
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
    }

    this.submitting.set(true);

    // coverImageId to pole zapisu (ustawiamy FK); model odczytu Event niesie cover w obiekcie coverImage.
    const payload: Partial<Event> & { coverImageId?: string; roleConfig?: EventRoleConfig } = {
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
      welcomeMessageEnabled: val.welcomeMessageEnabled ?? true,
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
        if (this.isEdit()) {
          this.snackbar.success('Wydarzenie zaktualizowane');
          this.navigation.navigateToEventDetail(created.id, created.city?.slug ?? '');
        } else if (this.createSeriesIntent()) {
          this.snackbar.success('Wydarzenie utworzone');
          this.navigation.navigateToUrl(`/o/w/${created.id}/create-series`);
        } else {
          this.snackbar.success('Wydarzenie utworzone');
          this.navigation.navigateToEventDetail(created.id, created.city?.slug ?? '');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się zapisać');
        this.submitting.set(false);
      },
    });
  }

  private async submitSeriesTemplate(val: ReturnType<typeof this.form.getRawValue>): Promise<void> {
    const seriesId = this.seriesTemplateId()!;

    if (!val.title?.trim()) {
      this.snackbar.error('Tytuł jest wymagany.');
      return;
    }

    const affected = this.seriesTemplateAffected();
    const withoutMsg =
      affected.withoutEnrollments > 0
        ? `${affected.withoutEnrollments} wydarzeń bez zapisów zostanie zaktualizowanych.`
        : 'Brak przyszłych wydarzeń bez zapisów.';
    const withMsg =
      affected.withEnrollments > 0
        ? ` ${affected.withEnrollments} wydarzeń z zapisami pozostanie bez zmian.`
        : '';

    const confirmed = await this.confirmModal.confirm({
      title: 'Zaktualizuj dane wydarzeń serii',
      message: withoutMsg + withMsg,
      confirmLabel: 'Zaktualizuj',
      cancelLabel: 'Anuluj',
      color: 'warning',
    });

    if (!confirmed) {
      return;
    }

    this.submitting.set(true);

    const payload: UpdateEventSeriesPayload = {
      title: val.title || undefined,
      description: val.description || undefined,
      disciplineSlug: val.disciplineSlug || undefined,
      facilitySlug: val.facilitySlug || undefined,
      levelSlug: val.levelSlug || undefined,
      citySlug: val.citySlug || undefined,
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
      rules: this.formatRules(this.eventRules()) || undefined,
      coverImageId: this.selectedCoverImageId() || undefined,
      roleConfig: this.buildRoleConfig() ?? undefined,
    };

    this.eventSeriesService.updateSeries(seriesId, payload).subscribe({
      next: () => {
        this.snackbar.success('Dane wydarzeń serii zaktualizowane.');
        this.navigation.navigateToSeries(seriesId);
        this.submitting.set(false);
      },
      error: (err) => {
        this.snackbar.error(err?.error?.message || 'Nie udało się zaktualizować danych serii.');
        this.submitting.set(false);
      },
    });
  }

  toggleAutoCoverImage(checked: boolean): void {
    this.autoCoverImage.set(checked);
    if (checked) {
      this.coverTab.set('public');
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
    forkJoin({
      public: this.coverImageService.getAll(disciplineSlug),
      my: this.coverImageService.getMy(),
    }).subscribe({
      next: ({ public: publicImages, my: myImages }) => {
        this.coverImages.set(publicImages);
        this.myCovers.set(myImages);
        this.coverImagesLoading.set(false);

        // Set default tab based on availability
        const defaultTab = myImages.length > 0 || publicImages.length === 0 ? 'my' : 'public';
        this.coverTab.set(defaultTab);
      },
      error: () => {
        this.coverImages.set([]);
        this.myCovers.set([]);
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
            this.navigation.navigateToEventCreation();
          } else if (err?.status === 404) {
            this.snackbar.error(notFound);
            this.navigation.navigateToEventCreation();
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
      welcomeMessageEnabled: event.welcomeMessageEnabled ?? true,
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
    if (event.coverImage?.id) {
      this.selectedCoverImageId.set(event.coverImage.id);
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

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    const val = this.form.getRawValue();

    // Sprawdź pola wymagane
    if (!val.title?.trim()) errors.push('Brak tytułu');
    if (!val.disciplineSlug) errors.push('Brak dyscypliny');
    if (!val.facilitySlug) errors.push('Brak obiektu');
    if (!val.levelSlug) errors.push('Brak poziomu');
    if (!val.citySlug) errors.push('Brak miasta');
    if (!val.address?.trim()) errors.push('Brak adresu');
    if (!val.startsAt) errors.push('Brak daty rozpoczęcia');
    if (!val.endsAt) errors.push('Brak daty zakończenia');

    // Sprawdź daty
    if (val.startsAt && val.endsAt) {
      const startUtc = fromLocalInputValue(val.startsAt);
      const endUtc = fromLocalInputValue(val.endsAt);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const nowUtc = nowInZone().toISO()!;

      if (startUtc <= nowUtc) errors.push('Data rozpoczęcia jest w przeszłości');
      if (endUtc <= startUtc)
        errors.push('Data zakończenia jest wcześniejsza lub równa dacie rozpoczęcia');
    }

    // Sprawdź liczbę uczestników
    if (val.maxParticipants && val.minParticipants && val.maxParticipants < val.minParticipants) {
      errors.push('Maksymalna liczba uczestników jest mniejsza niż minimalna');
    }

    // Sprawdź przedział wiekowy
    if (val.ageMin && val.ageMax && val.ageMax < val.ageMin) {
      errors.push('Maksymalny wiek jest mniejszy niż minimalny');
    }

    // Sprawdź sumę slotów ról
    if (this.rolesEnabled() && this.roleSlotsSum() !== this.form.get('maxParticipants')?.value) {
      errors.push('Suma slotów ról nie zgadza się z liczbą uczestników');
    }

    return errors;
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
