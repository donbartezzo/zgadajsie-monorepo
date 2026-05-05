# Serie wydarzeń - docelowy plan wdrożenia

> Plan operacyjny do wdrażania w iteracjach. Każdy krok jest osobnym checkboxem.
> Po wykonaniu kroku zmień `- [ ]` na `- [x]` oraz dopisz datę i krótką notatkę (commit / PR / decyzję).
>
> Dokumenty referencyjne:
>
> - `docs/tasks/series_of_events.md` - źródłowy zarys koncepcji (pojęcia, model, edge cases)
> - `docs/tasks/event-series-and-smart-cover.md` - propozycja smart-cover per instancja serii (kontekst)
> - `docs/styleguide-common.md`, `docs/styleguide-backend.md`, `docs/styleguide-frontend.md`
>
> **Założenie:** docelowy model jest zgodny z `series_of_events.md` (osobna tabela `EventSeries`,
> rolling buffer, cron, semantyka "edycja serii dotyczy tylko przyszłości"). Plan zakłada
> migrację z istniejącego, prowizorycznego modelu (`Event.parentEventId` / `recurringRule`)
> do nowego.

---

## 0. Stan obecny - punkt startowy (Q1 2026-05-05)

Co już istnieje w repo:

- Prisma `Event`: `isRecurring`, `recurringRule`, `parentEventId`, relacja `parentEvent` / `childEvents`.
- `EventsController`: `POST /events/series`, `PATCH /events/:id/series`.
- `EventsService.createSeries()` + `EventsService.updateSeries()` + prywatne `generateRecurringDates()` (52 instancje, hardkod, `+ days * MS_PER_HOUR` - **NIE** uwzględnia DST).
- Brak `EventSeries` jako osobnego bytu w DB.
- Brak crona generującego nowe wydarzenia w czasie - tworzymy wszystko od razu.
- Frontend nie eksponuje serii w formularzu (`event-form.component.ts`) ani w `EventService` (`POST /events` na sztywno).
- Smart-cover (`CoverImagesService.findSmartCoverForOrganizer`) gotowy dla pojedynczych eventów; brak przydziału per instancja w buforze.
- `@nestjs/schedule` jest dostępny i używany (`event-reminder.cron.ts`, `enrollment-lottery.cron.ts`, `approval-reminder.cron.ts`); `ScheduleModule.forRoot()` w `NotificationsModule`.
- Luxon utils dostępne: `toZonedDateTime`, `nowInZone`, `createDateInZone`, `formatDateLong`, `formatTime`, `fromLocalInputValue`, `toLocalInputValue` (`libs/src/lib/utils/date.utils.ts`). `APP_DEFAULT_TIMEZONE = 'Europe/Warsaw'`.

Co trzeba zmienić w skrócie:

1. Wprowadzić `EventSeries` jako osobny model (z `recurrenceType`, `intervalDays`, `daysOfWeek`, `time`, `timezone`, `nextGenerationAt`, `lastGeneratedAt`, `isActive`).
2. Przeksiążkować `Event` na `seriesId` zamiast `parentEventId`. Zachować historyczne dane.
3. Algorytm dat - przepisać na **Luxon + local time + timezone** (DST-safe).
4. Generowanie - zamiast tworzyć wszystkie 52 z góry, używać **rolling buffera 30 dni** + cron co 1h.
5. UNIQUE `(seriesId, startsAt)` - constraint + idempotentny insert (ON CONFLICT DO NOTHING / `skipDuplicates`).
6. Nowy moduł `EventSeriesModule` (controller, service) - oddzielny od `EventsModule`. `EventsModule` traci `createSeries` / `updateSeries`.
7. Frontend - dedykowany `recurrence-picker`, sekcja w `event-form`, podgląd 3-5 najbliższych dat.
8. Smart-cover - integracja z generatorem (każda instancja serii dostaje inny cover, jeśli `autoCoverImage = true`).

---

## 1. Decyzje architektoniczne (zapisane przed implementacją)

- [x] **DB:** osobna tabela `EventSeries`. `Event` zyskuje `seriesId` (nullable) - zastępuje `parentEventId` w nowym świecie.
  - Notatka: starych danych z `parentEventId` jeszcze nie ma w prodzie - tabela jest "fundamentem", którego frontend nie eksponował, ale w DEV / TEST mogą być rekordy. Decyzja: data-migration konwertuje `parentEvent` → `EventSeries` (best-effort) albo zostawia jako "osierocone" eventy bez `seriesId` (jeśli nie da się odtworzyć configu). **Przed migracją potwierdzić z BK.**
- [x] **Generowanie:** cron `@nestjs/schedule` co 30 min; per seria `nextGenerationAt`; bufor 30 dni do przodu.
- [x] **Pierwsze wydarzenia:** w trakcie `POST /event-series` generowany jest pierwszy slot wydarzenia natychmiast + cały bufor 30 dni (synchronicznie w transakcji).
- [x] **DST:** używamy Luxon (`DateTime.fromObject({hour, minute}, { zone })`) i operujemy na local time. `+ {days: 7}` zamiast `+ ms`.
- [x] **Czas trwania:** `EventSeries` przechowuje `time` (HH:mm) i `durationMinutes` - oba pola; `endsAt` instancji = `startsAt + durationMinutes`.
- [x] **Edycja serii:** wpływa **tylko** na przyszłe wydarzenia bez przypisanych zapisów (lub: i tak nie istniejące). Istniejące eventy (już z zapisami) nie są modyfikowane przez edycję serii. Edycja pojedynczego eventu działa standardowym `PATCH /events/:id`.
- [x] **Usunięcie serii:** `DELETE /event-series/:id` ustawia `isActive = false` i kasuje przyszłe **wygenerowane jeszcze niezacaczynające się** eventy bez zapisów; eventy z zapisami pozostają. (Reguła do potwierdzenia z BK).
- [x] **Idempotentność:** UNIQUE `(series_id, starts_at)` + `prisma.event.createMany({ skipDuplicates: true })`.
- [x] **Smart cover dla serii:** włączane flagą `autoCoverImage`; w generatorze przekazujemy `excludeIds` z poprzednich coverów wybranych w obrębie tej serii (cache w pamięci podczas batcha).
- [x] **Feature flag:** `enableEventSeries` w `libs/src/lib/config/feature-flags.ts` - można wyłączyć całość bez deploya kodu.
- [x] **Endpointy nowego modułu:**
  - `POST /event-series` - utworzenie serii + bufora.
  - `GET /event-series/:id` - szczegóły serii + lista nadchodzących wydarzeń.
  - `PATCH /event-series/:id` - edycja config + regeneracja przyszłości.
  - `DELETE /event-series/:id` - dezaktywacja.
  - `GET /event-series/mine` - serie zalogowanego organizatora.

> Każdą decyzję wpisz w notatce do PR. Jeśli któraś decyzja zostanie zmieniona w trakcie wdrożenia - zaktualizuj ten plik.

---

## 2. Schema i migracja DB

### 2.1 Schema Prisma

Plik: `backend/prisma/schema.prisma`.

- [ ] Dodać `enum EventSeriesRecurrenceType { INTERVAL WEEKLY }`.
- [ ] Dodać model `EventSeries` z polami:
  - `id String @id @default(uuid())`
  - `organizerId String`
  - `organizer User @relation(...)` - dodać przeciwną stronę w `User`.
  - `name String`
  - `recurrenceType EventSeriesRecurrenceType`
  - `intervalDays Int?`
  - `daysOfWeek Int[]` (Postgres array; default `[]`)
  - `time String` (`"HH:mm"`)
  - `timezone String` (`"Europe/Warsaw"` default w aplikacji)
  - `durationMinutes Int`
  - `startDate DateTime`
  - `endDate DateTime?`
  - `nextGenerationAt DateTime`
  - `lastGeneratedAt DateTime?`
  - `bufferDays Int @default(30)`
  - `autoCoverImage Boolean @default(false)`
  - `templateSnapshot Json` - "DTO" wydarzenia używany do generowania (wszystkie pola wspólne: `disciplineSlug`, `facilitySlug`, `levelSlug`, `citySlug`, `address`, `lat`, `lng`, `costPerPerson`, `minParticipants`, `maxParticipants`, `ageMin`, `ageMax`, `gender`, `visibility`, `coverImageId`, `rules`, `roleConfig`, `facilityReserved`, `description`, `title`).
  - `isActive Boolean @default(true)`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
  - Relacja `events Event[]` (`@relation("SeriesEvents")`).
  - Indeksy: `@@index([organizerId])`, `@@index([isActive, nextGenerationAt])`.
- [ ] W modelu `Event`:
  - Dodać `seriesId String?` + relacja `series EventSeries? @relation("SeriesEvents", fields: [seriesId], references: [id])`.
  - Dodać `@@unique([seriesId, startsAt])` (gdy `seriesId` nie jest null - Postgres unique pozwala wiele NULL).
  - Pola `isRecurring`, `recurringRule`, `parentEventId` zostawić tymczasowo (etap 2.3 deprecate).
- [ ] W modelu `User`: dodać `eventSeries EventSeries[]` (po stronie organizera).

### 2.2 Migracja Prisma

- [ ] Wygenerować migrację: `pnpm --filter backend exec prisma migrate dev --name add_event_series` (lokalnie - sprawdzić, że SQL zawiera `CREATE UNIQUE INDEX` dla `(series_id, starts_at)` z klauzulą `WHERE series_id IS NOT NULL`).
- [ ] Zweryfikować nazwy kolumn (snake_case vs camelCase) względem reszty schematu - Prisma używa tych nazw co w modelu, chyba że jest `@map` (sprawdzić istniejące migracje).
- [ ] Migracja nie modyfikuje istniejących danych (data-migration osobno - 2.3).
- [ ] Uruchomić `pnpm --filter backend exec prisma generate` i upewnić się, że klient ma typy `EventSeries` i `Event.seriesId`.

### 2.3 Data-migration starych danych (jednorazowo)

> Krok wykonywany raz; pomija dane prod jeśli puste.

- [ ] Skrypt `backend/prisma/data-migrations/20YYYYMMDD_event_series_backfill.ts` (uruchamiany ręcznie / przez admin command):
  - Dla każdego `Event` z `parentEventId IS NULL AND isRecurring = true` (czyli "rodzic starej serii"):
    - Wnioskuj `recurrenceType` z pola `recurringRule` (`DAILY|WEEKLY|BIWEEKLY|MONTHLY` → mapa na `INTERVAL` z `intervalDays` 1/7/14/30).
    - Utwórz `EventSeries` z `templateSnapshot` zbudowanym z parent.
    - Wszystkim `Event` z tym `parentEventId` (oraz parentowi) ustaw `seriesId`.
  - Dla `Event` z `parentEventId NOT NULL` ale bez parenta (osierocone) - log + zostaw `seriesId = NULL`.
- [ ] Test: na DB z seedem (`pnpm --filter backend exec prisma db seed`) odpalić skrypt i zweryfikować, że nie tworzy duplikatów.
- [ ] Po backfillu (etap finalny - patrz 11.3) zaplanować usunięcie pól `Event.isRecurring`, `recurringRule`, `parentEventId`.

---

## 3. Shared (`libs`) - typy i utils

### 3.1 Enumy i typy domenowe

- [ ] `libs/src/lib/enums/event-series-recurrence-type.enum.ts`:
  ```ts
  export enum EventSeriesRecurrenceType {
    INTERVAL = 'INTERVAL',
    WEEKLY = 'WEEKLY',
  }
  ```

  - Wyeksportować z `libs/src/lib/enums/index.ts`.
- [ ] `libs/src/lib/types/event-series.types.ts`:
  - `interface EventSeriesBase` (kontrakt wspólny: `id`, `organizerId`, `name`, `recurrenceType`, `intervalDays?`, `daysOfWeek?`, `time`, `timezone`, `durationMinutes`, `startDate`, `endDate?`, `isActive`).
  - `type RecurrenceConfig = { type: 'INTERVAL'; intervalDays: number } | { type: 'WEEKLY'; daysOfWeek: number[] }`.
  - DOW konwencja: `0 = niedziela ... 6 = sobota` (zgodnie z Luxon `weekday` 1-7? **Decyzja:** użyć Luxon - 1 (poniedziałek) ... 7 (niedziela), aby uniknąć dwuznaczności; udokumentować przy typie).
- [ ] DTO i kontrakty payloadu (request/response) w `libs/src/lib/types/event-series.types.ts`:
  - `CreateEventSeriesPayload`
  - `UpdateEventSeriesPayload`
  - `EventSeriesPreviewItem` (`{ start: string; end: string }` - ISO UTC).
- [ ] Constanty: `libs/src/lib/constants/event-series.constants.ts`:
  - `EVENT_SERIES_BUFFER_DAYS_DEFAULT = 30`
  - `EVENT_SERIES_INTERVAL_DAYS_MIN = 1`
  - `EVENT_SERIES_INTERVAL_DAYS_MAX = 90`
  - `EVENT_SERIES_PREVIEW_COUNT = 5`

### 3.2 Utils dat (timezone-safe)

Plik: `libs/src/lib/utils/event-series.utils.ts`.

- [ ] `computeNextDates(config: RecurrenceConfig, anchor: { time: string; timezone: string; from: Date; until: Date }): Date[]` - zwraca wszystkie kolejne `startsAt` (UTC `Date`) w przedziale `(from, until]`, używając Luxon `DateTime`. **Niezależna od backendu/frontendu** - testowalna unit-testem. Algorytm:
  - INTERVAL: ustaw `cursor = from` w `timezone`, ustaw `time`; iteruj `cursor.plus({ days: intervalDays })` aż `> until`.
  - WEEKLY: dla każdej iteracji znajdź najbliższy dzień tygodnia z `daysOfWeek > cursor`; emituj wszystkie dni z `daysOfWeek` w obrębie tygodnia, dopóki nie przekroczymy `until`.
  - Dla obu: skip jeśli `cursor < from`.
- [ ] `previewSeriesDates(config: RecurrenceConfig, anchor: { time: string; timezone: string; startDate: Date; durationMinutes: number }, count: number): EventSeriesPreviewItem[]` - na potrzeby UI (frontend i preview w backendzie).
- [ ] Reeksport z `libs/src/index.ts`.
- [ ] Testy jednostkowe (`event-series.utils.spec.ts`) - minimum:
  - INTERVAL co 7 dni z Europe/Warsaw przekraczający DST (np. `2026-03-26 → 2026-04-02 → 2026-04-09`) - godzina lokalna stała (`20:00`).
  - WEEKLY pon+czw, dwa pełne tygodnie.
  - `endDate` ucinający bufor.
  - Przejście godziny zimowo-letniej w PL (ostatnia niedziela marca i października).

---

## 4. Backend - moduł `event-series`

### 4.1 Struktura katalogu

`backend/src/modules/event-series/`:

- [ ] `event-series.module.ts`
- [ ] `event-series.controller.ts`
- [ ] `event-series.service.ts`
- [ ] `event-series.generator.ts` - czysta logika wybierania dat (deleguje do `libs/event-series.utils`).
- [ ] `event-series.cron.ts` - rolling buffer.
- [ ] `dto/create-event-series.dto.ts`
- [ ] `dto/update-event-series.dto.ts`
- [ ] `dto/event-series-preview.dto.ts`
- [ ] `event-series.service.spec.ts`
- [ ] `event-series.generator.spec.ts`
- [ ] `event-series.cron.spec.ts`

### 4.2 DTO

- [ ] `CreateEventSeriesDto`:
  - Wszystkie pola wspólne z `CreateEventDto` (re-use przez `extends` lub kompozycję - ale `startsAt`/`endsAt` zastępujemy przez `startDate`/`time`/`durationMinutes`/`endDate`).
  - `name: string` (`@IsString` + `@MaxLength(120)`)
  - `recurrenceType: EventSeriesRecurrenceType` (`@IsEnum`).
  - `intervalDays?: number` (`@ValidateIf(o => o.recurrenceType === 'INTERVAL')` `@IsInt @Min(1) @Max(90)`).
  - `daysOfWeek?: number[]` (`@ValidateIf(... === 'WEEKLY')` `@IsArray @ArrayUnique @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })`).
  - `time: string` (regex `^\d{2}:\d{2}$`).
  - `timezone?: string` (default w serwisie: `APP_DEFAULT_TIMEZONE`).
  - `durationMinutes: number` (`@IsInt @Min(15) @Max(60*24*7)`).
  - `startDate: string` (ISO).
  - `endDate?: string` (ISO; opcjonalne).
  - `bufferDays?: number` (`@Min(7) @Max(90)`).
  - `autoCoverImage?: boolean`.
  - Pola wspólne: `disciplineSlug`, `facilitySlug`, `levelSlug`, `citySlug`, `address`, `lat`, `lng`, `costPerPerson`, `minParticipants`, `maxParticipants`, `ageMin`, `ageMax`, `gender`, `visibility`, `coverImageId`, `rules`, `roleConfig`, `facilityReserved`, `description`, `title`.
- [ ] `UpdateEventSeriesDto extends PartialType(CreateEventSeriesDto)` z dodatkowym `isActive?: boolean`.
- [ ] `PreviewEventSeriesDto` - sub-DTO do endpointu podglądu (przyjmuje minimalny config bez tworzenia w DB).

### 4.3 Service - logika biznesowa

`event-series.service.ts`. Konstruktor: `PrismaService`, `EventsService` (nadal używany do `slotService.createSlotsForEvent`, `notifyCitySubscribers` itp. - patrz 5), `CoverImagesService`.

- [ ] `createSeries(organizerId, dto)`:
  1. Walidacja: jeśli `recurrenceType === 'WEEKLY'` to `daysOfWeek` musi być niepuste; jeśli `INTERVAL` - `intervalDays` ustawione.
  2. Zbudowanie `templateSnapshot` (czysty obiekt, bez `id`).
  3. Walidacja `roleConfig` (re-use `EventsService.validateRoleConfig`).
  4. Wyliczenie pierwszego `nextGenerationAt = now`.
  5. **Transakcja Prisma**:
     - `prisma.eventSeries.create(...)`.
     - Wygeneruj listę dat `until = startDate + bufferDays`.
     - Utwórz pierwsze N eventów `prisma.event.createMany({ data, skipDuplicates: true })` z `seriesId`.
     - Wszystkim utworzonym eventom utwórz sloty (`slotService.createSlotsForEvent`) - **pętla po nowych ID** (slotService nie wspiera batch create).
     - Update `lastGeneratedAt = until`, `nextGenerationAt = until - 1 day` (heurystyka: cron przypilnuje).
  6. Notyfikacje subskrybentów miasta dla pierwszego wydarzenia (re-use logiki z `EventsService.create`).
  7. (Opcjonalnie) jeśli `autoCoverImage` i więcej niż 1 instancja - dla każdej kolejnej wybierz cover przez `findSmartCoverForOrganizer(disciplineSlug, organizerId, citySlug, excludeIds)` i nadpisz w insertach.
- [ ] `findOne(id, userId?)` - serial + lista nadchodzących wydarzeń.
- [ ] `findMyseries(organizerId)` - lista serii organizatora.
- [ ] `update(id, user, dto)`:
  - Tylko organizator (lub override account).
  - Update `EventSeries`, regeneracja "future":
    - `await prisma.event.deleteMany({ where: { seriesId: id, startsAt: { gt: now }, status: 'ACTIVE', enrollments: { none: {} } } })` - **uwaga**: usuwamy tylko bez zapisów; eventy z zapisami zostawiamy nietknięte (decyzja architektoniczna).
    - Wygenerowanie nowych dat dla `(now, now + bufferDays]`.
    - `createMany` z `skipDuplicates`.
- [ ] `deactivate(id, user)`:
  - Set `isActive = false`.
  - Usunięcie przyszłych pustych eventów (analogicznie do update).
  - Zwrócić podsumowanie (ile usunięto, ile zostało z zapisami).
- [ ] `previewDates(dto)` - prosty wrapper na `previewSeriesDates` z `libs`. Endpoint pomaga frontendowi zweryfikować rachunek dat (opcjonalnie - frontend liczy lokalnie).

### 4.4 Generator (rolling buffer)

`event-series.generator.ts`.

- [ ] `generateForSeries(seriesId, options?)` - publiczna metoda używana przez cron i przez `createSeries`/`update`:
  1. `series = prisma.eventSeries.findUniqueOrThrow({ id })`.
  2. Jeśli `!isActive` → return early.
  3. `windowEnd = now + bufferDays`.
  4. `lastDate = max(series.lastGeneratedAt ?? series.startDate, now)`.
  5. `dates = computeNextDates({ ... }, { from: lastDate, until: windowEnd })`.
  6. Dla każdej daty zbuduj rekord `Event` z `templateSnapshot` (ale: `coverImageId` z smart-cover jeśli `autoCoverImage`).
  7. `prisma.event.createMany({ data, skipDuplicates: true })` - UNIQUE constraint chroni przed duplikatami.
  8. Pobierz nowo utworzone (`findMany` po `seriesId` + `startsAt > lastDate`), utwórz sloty.
  9. Update `lastGeneratedAt = windowEnd`, `nextGenerationAt = windowEnd - 1 day` (lub jutro - mniejsze z dwóch).
- [ ] Pure-function helpers przeniesione do `libs` (`computeNextDates`).

### 4.5 Cron

`event-series.cron.ts`.

- [ ] `@Cron(CronExpression.EVERY_30_MINUTES) handle()`:
  - `series = prisma.eventSeries.findMany({ where: { isActive: true, nextGenerationAt: { lte: new Date() } } })`.
  - Pętla po seriach → `generator.generateForSeries(series.id)`.
  - Logging: liczba serii, liczba utworzonych eventów; błędy per seria łapane oddzielnie (jedna padnięta seria nie psuje pozostałych).
- [ ] `ScheduleModule.forRoot()` jest już w `NotificationsModule.imports`. Decyzja: dodać go również w `EventSeriesModule.imports` lub wyciągnąć do `AppModule`. Rekomendacja: zostawić tam, gdzie jest, ale upewnić się, że `EventSeriesModule` jest importowany do `AppModule` (Nest singletony).

### 4.6 Controller

`event-series.controller.ts`.

- [ ] `POST /event-series` (`JwtAuthGuard`, `IsActiveGuard`, `featureFlags.enableEventSeries` check podobnie jak w `EventsController.create`).
- [ ] `GET /event-series/mine` (auth).
- [ ] `GET /event-series/:id` (auth - tylko organizator + admin).
- [ ] `PATCH /event-series/:id` (auth).
- [ ] `DELETE /event-series/:id` (auth, soft - dezaktywacja).
- [ ] `POST /event-series/preview` - wymaga JWT, ale nic nie tworzy; zwraca preview (do podglądu w UI; alternatywnie liczone tylko po stronie klienta).

### 4.7 Refaktor `EventsModule`

- [ ] `EventsController`: usunąć `POST /events/series` i `PATCH /events/:id/series` po włączeniu nowego API (etap 11.3 - feature flag w fazie roll-outu).
- [ ] `EventsService`: usunąć metody `createSeries`, `updateSeries`, `generateRecurringDates` (tymczasowo zostawić jako `@deprecated` z logowaniem `warn`).
- [ ] `EventsService.update`: nadal działa per pojedynczy event - bez zmian.
- [ ] `EventsService.cancel`: bez zmian (cancel pojedynczego eventu jest niezależny od serii).
- [ ] Dodać metodę `EventsService.findEventsBySeries(seriesId)` (delegowana z `EventSeriesService`).

### 4.8 Aktualizacja `event.service` i `event-listing.util`

- [ ] `EventQueryDto` - dodać opcjonalny filtr `seriesId?: string`.
- [ ] `buildEventListingWhere` - obsłużyć filtr po `seriesId`.
- [ ] `EventsService.findOne` w response zwracać `series: { id, name }` (relacja, jeśli istnieje) - frontend potrzebuje do wyświetlenia bagdge'a "część serii".

### 4.9 Testy backend

- [ ] `event-series.generator.spec.ts`:
  - Tworzy w buforze poprawną liczbę dat dla INTERVAL i WEEKLY.
  - Idempotencja: drugie wywołanie tej samej serii nie tworzy duplikatów.
  - DST: 7-dniowy interval przed/po zmianie czasu w Europe/Warsaw daje stałą godzinę lokalną.
  - `endDate` przerywa generację.
- [ ] `event-series.service.spec.ts`:
  - Tylko organizator może edytować/usuwać.
  - Edycja nie usuwa eventów z zapisami.
  - Dezaktywacja nie kasuje eventów już utworzonych z zapisami.
  - `autoCoverImage` przekazuje `excludeIds` do `CoverImagesService`.
- [ ] `event-series.cron.spec.ts`:
  - Wybiera tylko `isActive = true` z `nextGenerationAt <= now`.
  - Błąd jednej serii nie blokuje kolejnych.
- [ ] E2E: `backend-e2e/src/event-series.spec.ts` - happy path tworzenia serii i odczytu listy nadchodzących eventów.

---

## 5. Backend - integracje boczne

### 5.1 Notifications

- [ ] `EventReminderCron` - bez zmian (działa per event).
- [ ] Dodać notyfikację dla organizatora: "Wygenerowano X kolejnych wydarzeń serii Y" (opcjonalne; raz dziennie zbiorczo). Jeśli zostawiamy na potem - dopisać do V2 w komentarzu.

### 5.2 Realtime

- [ ] Po wygenerowaniu nowych eventów cron powinien rozesłać `eventRealtime.invalidateEvent` lub szerszy event "newEventsCreated" - **decyzja:** generacja w nocy nie potrzebuje natychmiastowej propagacji; można pominąć w v1.

### 5.3 Smart cover dla serii

Patrz `docs/tasks/event-series-and-smart-cover.md` Task 2 - krok 2.3.

- [ ] `EventSeriesService.createSeries` przy `autoCoverImage = true`:
  - Pętla per generowana instancja: `cover = coverImagesService.findSmartCoverForOrganizer(disciplineSlug, organizerId, citySlug, excludeIds)`; dopisz `cover.id` do `excludeIds`.
- [ ] `EventSeriesGenerator.generateForSeries` (cron) - analogicznie. Dla globalnego cache `excludeIds` używa historii dotychczas użytych coverów w tej serii (`prisma.event.findMany({ where: { seriesId }, select: { coverImageId: true } })`).
- [ ] Test: seria 8 instancji + 8 coverów dyscypliny → każdy event dostaje inny.

---

## 6. Frontend - shared, service, typy

### 6.1 Typy i serwis

- [ ] `frontend/src/app/shared/types/event-series.interface.ts` - re-eksportujemy / uzupełniamy o `EventSeries` z `libs/event-series.types` + lokalny `EventSeriesView` (z relacjami przygotowanymi pod UI).
- [ ] `frontend/src/app/shared/types/event.interface.ts`: dodać opcjonalny `seriesId?: string` i `series?: { id: string; name: string }`.
- [ ] `frontend/src/app/core/services/event-series.service.ts`:
  - `createSeries(payload)` → `POST /event-series`.
  - `getSeries(id)` → `GET /event-series/:id`.
  - `getMine()` → `GET /event-series/mine`.
  - `updateSeries(id, payload)` → `PATCH /event-series/:id`.
  - `deactivate(id)` → `DELETE /event-series/:id`.
  - `preview(payload)` → `POST /event-series/preview` (lub liczone lokalnie - patrz 6.3).

### 6.2 Routing

- [ ] Dodać trasę `/series/:id` (widok organizatora - lista wydarzeń serii) - opcjonalnie w v1; minimalnie podlinkować z banneru w event-form.
- [ ] Trasa `/events/new` przyjmuje query `?seriesMode=true` (opcjonalnie).

### 6.3 Komponent `recurrence-picker`

`frontend/src/app/shared/event-form/ui/recurrence-picker/recurrence-picker.component.ts`.

- [ ] Standalone Angular 20, `ChangeDetectionStrategy.OnPush`.
- [ ] Inputy:
  - `formGroup` (kontrolki `recurrenceType`, `intervalDays`, `daysOfWeek`, `time`, `durationMinutes`, `startDate`, `endDate`).
  - `timezone: string` (z formularza event-form).
  - `previewCount = 5`.
- [ ] UI:
  - Toggle trybu: `INTERVAL` / `WEEKLY` (radio buttons z semantycznymi klasami `primary`/`neutral`).
  - INTERVAL: input `co X dni` (`min=1`, `max=90`).
  - WEEKLY: 7 toggli (Pn-Nd) - tablica `daysOfWeek` (1-7 wg ISO/Luxon).
  - Pole `time` (type=time) i `durationMinutes` (z prefillem z `event-form`).
  - Sekcja "Następne terminy:" - lista 5 dat liczonych lokalnie przez `previewSeriesDates` z `libs`.
  - A11y: keyboard nav po dniach tygodnia (Angular CDK).
- [ ] Tailwind: tylko klasy semantyczne (`bg-primary-500`, `text-neutral-900` itd.). Brak `dark:`, brak custom hex.
- [ ] Test komponentu (happy path + WEEKLY + INTERVAL + zmiana trybu).

### 6.4 Integracja w `event-form`

- [ ] `event-form.component.ts`:
  - Dodać kontrolki `seriesEnabled`, plus `series` sub-FormGroup z polami z 6.3.
  - Sekcja `<app-card>` "Seria wydarzeń" pod sekcją dat, widoczna zawsze:
    - Checkbox "Powtarzaj wydarzenie (seria)" - przełącza widoczność `<app-recurrence-picker>`.
  - Walidacja:
    - Jeśli `seriesEnabled = true` to wszystkie pola serii wymagane.
    - Jeśli `seriesEnabled = false` to logika tworzenia bez zmian.
  - Submit:
    - `seriesEnabled` → `eventSeriesService.createSeries(payload)`.
    - inaczej → istniejące `eventService.createEvent`.
- [ ] Smart cover (jeśli `autoCoverImage = true` + `seriesEnabled`): pokazać badge "Każde wydarzenie z serii otrzyma inną grafikę" (re-use ze stylu z `event-series-and-smart-cover.md`).

### 6.5 Edycja serii w istniejącym wydarzeniu

- [ ] Jeśli wczytany event ma `seriesId`, w `event-form` w trybie edycji pokazać banner:
  ```
  To wydarzenie należy do serii "{name}".
  Edytujesz tylko tę instancję. Aby zmienić całą serię, otwórz: [Ustawienia serii].
  ```
- [ ] Link `[Ustawienia serii]` prowadzi do `/series/:id` (jeśli zaimplementowano w 6.2) albo do prostego dialogu / modal przewidzianego w `event-form` (alternatywa minimum: button "Edytuj serię" otwierający osobny formularz w trybie edycji `event-series`).

### 6.6 Listing / kafelki - oznaczenie serii

- [ ] `enrollment-grid-item.component.ts` (lub odpowiednik kafelka eventu w listingu) - pokazać ikonę `repeat` przy wydarzeniu z `seriesId != null`.
- [ ] Tooltip / aria-label: `"Wydarzenie z serii"`.

### 6.7 Testy frontend

- [ ] Spec dla `recurrence-picker`: zmiana trybu, dodawanie/usuwanie dni tygodnia, podgląd 5 dat.
- [ ] Spec dla `event-form` w trybie serii: poprawny payload do `eventSeriesService.createSeries`.
- [ ] E2E (`frontend-e2e`): scenariusz "stwórz serię WEEKLY pon+czw → na liście są 4 nadchodzące eventy".

---

## 7. Design system / dokumentacja

- [ ] Dodać do `docs/design-tokens.md` opis ikony `repeat` (jeśli jeszcze nie ma) oraz badge'a "seria".
- [ ] Zaktualizować stronę `/dev/design-system`:
  - Sekcja "Recurrence picker" - przykład komponentu w obu trybach.
  - Sekcja "Event tile" - wariant z badge'em serii.
- [ ] `docs/api-endpoints.md` - dopisać 5 nowych endpointów `/event-series/*`.
- [ ] `docs/project-structure.md` - dopisać moduł `event-series` w drzewie backendu i komponent `recurrence-picker` we frontendzie.
- [ ] `docs/tasks/series_of_events.md` - po zakończeniu wdrożenia oznaczyć status "Wdrożono - 2026-XX-XX" i dodać link do tego dokumentu.

---

## 8. Feature flag i roll-out

- [ ] `libs/src/lib/config/feature-flags.ts`: dodać `enableEventSeries: boolean` (default `false`).
- [ ] Backend: `EventSeriesController` - sprawdza flagę przed `create` (jak w `EventsController.create`); endpointy odczytu mogą działać bez flagi (do wglądu istniejących serii).
- [ ] Frontend: ukryj sekcję "Seria wydarzeń" w `event-form` jeśli flaga wyłączona.
- [ ] **Plan roll-outu:**
  1. PR z migracją schematu + nowy moduł + cron + endpointy + testy. Flaga `false`. Wdrożenie na DEV.
  2. PR z frontem (recurrence-picker + integracja) za flagą. Wdrożenie na DEV; manualne testy.
  3. Włączenie flagi na PROD po pozytywnym QA.
  4. Po 2 tygodniach stabilnej pracy: PR usuwający `Event.isRecurring`, `recurringRule`, `parentEventId`, czyszczący `EventsService.createSeries/updateSeries/generateRecurringDates`, kasujący endpointy `POST /events/series` i `PATCH /events/:id/series`.

---

## 9. QA / akceptacja (manualne)

- [ ] Tworzenie serii INTERVAL co 7 dni z 30-dniowym buforem - widoczne 4-5 wydarzeń na liście organizatora.
- [ ] Tworzenie serii WEEKLY pon+czw - widoczne odpowiednio 8-9 wydarzeń.
- [ ] Po manualnym uruchomieniu crona (`pnpm --filter backend exec node dist/...` lub stub w teście integracyjnym) - liczba wydarzeń rośnie aż do `endDate` (jeśli ustawione) lub w nieskończoność.
- [ ] Edycja serii (np. zmiana godziny) - przyszłe puste eventy regenerowane, eventy z zapisami niezmienione.
- [ ] DST (test manualny ze zmianą daty systemu lub przez pre-seedowane dane): godzina lokalna stała.
- [ ] `autoCoverImage` na serii 8 wydarzeń - 8 różnych coverów (lub powtórzenia, jeśli pula < 8, ale rozłożone).
- [ ] Bez logowania `GET /event-series/:id` zwraca 401.
- [ ] Inny użytkownik próbujący `PATCH /event-series/:id` dostaje 403.

---

## 10. Otwarte pytania do potwierdzenia z BK przed startem

> Każde pytanie zaznacz jako rozstrzygnięte (`✔`) wraz z decyzją.

- [ ] Czy w fazie 1 zostawiamy (kasujemy) pola `Event.isRecurring`, `recurringRule`, `parentEventId` razem z migracją czy w PR finalnym po roll-outcie? (Sugerowane: po roll-outcie - punkt 8.)
- [ ] Czy seria może być "wieczna" (`endDate = null`)? (Plan zakłada tak.)
- [ ] Czy edycja serii ma respektować zapis "tylko ta instancja" / "cała seria" / "ta i przyszłe" (model 3 scope'ów jak w Google Calendar)? Czy v1 obsługuje tylko "cała seria, wpływa tylko na puste wydarzenia"?
- [ ] Bufor 30 dni - akceptowalny? (Plan: tak; konfigurowalny per seria w `bufferDays`.)
- [ ] Czy preview dat liczymy lokalnie w UI bez wywołania API (`POST /event-series/preview` nie potrzebny)? Sugerowane: **tak** - preview lokalny, endpoint tylko jako opcja debugowa.
- [ ] Strategia `autoCoverImage` przy roll-overze (gdy pula < liczba instancji): **najmniej ostatnio użyty** (zgodne z istniejącą strategią smart-cover).
- [ ] Konwencja `daysOfWeek`: 1-7 ISO (Luxon) czy 0-6 JS? **Sugerowane: 1-7 ISO.** Frontend tłumaczy na etykiety Pn-Nd.

---

## 11. Definition of Done (całe wdrożenie)

- [ ] Wszystkie checkboxy z sekcji 2-9 zaznaczone.
- [ ] Testy jednostkowe i e2e przechodzą lokalnie i w CI (`pnpm test`, `pnpm e2e`).
- [ ] Lint + Prettier bez błędów (`pnpm lint`, `pnpm format:check`).
- [ ] Schema Prisma w prod i dev synchroniczna (brak `prisma migrate diff` różnic).
- [ ] Strona `/dev/design-system` pokazuje nowy `recurrence-picker` i badge serii.
- [ ] Dokumentacja zaktualizowana (`api-endpoints.md`, `project-structure.md`, `design-tokens.md`, `tasks/series_of_events.md`).
- [ ] Cron działa na środowisku staging przez >7 dni bez błędów (logi + monitoring).
- [ ] Feature flag włączony na produkcji bez incydentu.
- [ ] PR finalny usuwający stare pola `Event.parentEventId`/`isRecurring`/`recurringRule` zmergowany.

---

## Załącznik A - mapa zmian per moduł

| Obszar   | Plik                                                                                      | Charakter zmiany                                                                |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| DB       | `backend/prisma/schema.prisma`                                                            | Nowy model `EventSeries`, enum, indeksy, FK na `Event.seriesId`.                |
| DB       | `backend/prisma/migrations/<timestamp>_add_event_series/migration.sql`                    | Nowa migracja.                                                                  |
| Shared   | `libs/src/lib/enums/event-series-recurrence-type.enum.ts`                                 | Nowy plik.                                                                      |
| Shared   | `libs/src/lib/types/event-series.types.ts`                                                | Nowy plik.                                                                      |
| Shared   | `libs/src/lib/utils/event-series.utils.ts`                                                | Nowy plik (pure functions).                                                     |
| Shared   | `libs/src/lib/constants/event-series.constants.ts`                                        | Nowy plik.                                                                      |
| Shared   | `libs/src/lib/config/feature-flags.ts`                                                    | Dodanie `enableEventSeries`.                                                    |
| Backend  | `backend/src/modules/event-series/*`                                                      | Nowy moduł (controller, service, generator, cron, DTO, testy).                  |
| Backend  | `backend/src/app/app.module.ts`                                                           | Import `EventSeriesModule`.                                                     |
| Backend  | `backend/src/modules/events/events.controller.ts`                                         | Usunięcie `POST /events/series`, `PATCH /events/:id/series` (faza 4 roll-outu). |
| Backend  | `backend/src/modules/events/events.service.ts`                                            | Usunięcie `createSeries`, `updateSeries`, `generateRecurringDates`.             |
| Backend  | `backend/src/modules/events/dto/event-query.dto.ts`                                       | Filtr `seriesId`.                                                               |
| Backend  | `backend/src/common/utils/event-listing.util.ts`                                          | Obsługa filtra `seriesId`.                                                      |
| Frontend | `frontend/src/app/core/services/event-series.service.ts`                                  | Nowy serwis.                                                                    |
| Frontend | `frontend/src/app/shared/event-form/ui/recurrence-picker/*`                               | Nowy komponent + spec.                                                          |
| Frontend | `frontend/src/app/features/events/pages/event-form/event-form.component.ts`               | Integracja sekcji serii.                                                        |
| Frontend | `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item.component.ts` | Badge serii.                                                                    |
| Frontend | `frontend/src/app/shared/types/event.interface.ts`                                        | `seriesId?`, `series?`.                                                         |
| Frontend | `frontend/src/app/features/dev/pages/design-system/design-system.component.*`             | Sekcja recurrence-picker + badge serii.                                         |
| Docs     | `docs/api-endpoints.md`                                                                   | Nowe endpointy.                                                                 |
| Docs     | `docs/project-structure.md`                                                               | Nowy moduł.                                                                     |
| Docs     | `docs/design-tokens.md`                                                                   | Badge / ikona serii.                                                            |
| Docs     | `docs/tasks/series_of_events.md`                                                          | Status wdrożenia + link do tego dokumentu.                                      |
