# Wydzielenie serii wydarzeń jako osobny etap

## Cel

Odseparować konfigurację serii od formularza tworzenia/edycji wydarzenia. Serię tworzy się
**z istniejącego wydarzenia** w osobnym widoku — albo zaraz po jego utworzeniu (jeśli organizator
zaznaczył intencję), albo później z poziomu wydarzenia. Jedno wydarzenie może być źródłem
**maksymalnie jednej** serii (twardy zamek na poziomie DB).

## Motywacja

- **Rozdzielenie odpowiedzialności** — „utwórz wydarzenie" vs „uczyń je cyklicznym" to dwie różne
  operacje, dziś sklejone w `event-form` przez gałęzie `if (seriesEnabled)`.
- **Eliminacja duplikacji** — znika `seriesForm` z `event-form` oraz przepisywanie ~20 pól szablonu;
  `templateSnapshot` budowany jest z gotowego wydarzenia.
- **Mniej miejsc na rozjazd** — spójne walidatory, jedno źródło konfiguracji powtarzania
  (`app-recurrence-picker`).

## Stan obecny (źródła prawdy)

- `backend/src/modules/event-series/event-series.service.ts` — `createSeries()` przyjmuje pełny
  szablon + recurrence, buduje `templateSnapshot`, woła generator.
- `backend/src/modules/event-series/event-series.generator.ts` — generuje instancje `Event`
  z `seriesId`; ma dedup po `startsAt` (`existingTimestamps`).
- `backend/src/modules/event-series/dto/create-event-series.dto.ts` — pełny DTO (recurrence + szablon).
- `backend/prisma/schema.prisma` — `EventSeries` (brak powiązania ze źródłowym wydarzeniem),
  `Event.seriesId` + relacja `SeriesEvents`.
- `frontend/.../event-form/event-form.component.ts` — `seriesForm`, `seriesEnabled`,
  `toggleSeriesEnabled()`, gałąź serii w `onSubmit()`.
- `frontend/.../series-details/series-details.component.ts` — edycja istniejącej serii.
- `frontend/src/app/app.routes.ts` — `series/:id`, `o/s/:seriesId/edit-template`, `o/w/new`, `o/w/:id/edit`.

## Decyzje projektowe

> Decyzje rozstrzygnięte z organizatorem produktu — gotowe do implementacji.

1. **Zamek 1:1** — nowe pole `sourceEventId String? @unique` na `EventSeries`. Zapobiega tworzeniu
   wielu serii z tego samego wydarzenia także przy równoległych żądaniach (DB unique).
2. **Kotwica = pierwsza instancja** — wydarzenie źródłowe staje się **pierwszą instancją** serii
   (`event.seriesId = series.id`). `startDate`/`time`/`durationMinutes` serii wyprowadzane z
   wydarzenia źródłowego; generator pomija duplikat kotwicy dzięki istniejącemu dedup po `startsAt`.
   Kolejne terminy generują się od wzorca powtarzania.
   - **Nota (przypadek brzegowy):** kotwica może nie pasować do wybranego wzorca (np. wydarzenie w
     środę, a wzorzec WEEKLY = poniedziałki). Jest wtedy legalnym członkiem serii „poza rytmem";
     generator i tak wytworzy kolejne instancje zgodnie ze wzorcem. To zachowanie akceptowane.
3. **Blokada źródła** — wydarzenie, które już ma `seriesId != null`, nie może być źródłem nowej serii
   (komunikat: „To wydarzenie już należy do serii").
4. **Serie z wydarzeń z zapisami** — **dozwolone**. Zapisy dotyczą wyłącznie kotwicy; kolejne
   instancje generują się czysto, bez zapisów.
5. **Intencja przy tworzeniu** — checkbox „Cykliczne wydarzenie" w `event-form` to wyłącznie flaga
   (bez formularza). Po zapisie wydarzenia → redirect do widoku konfiguracji serii.
6. **Legacy `POST /event-series` (pełny szablon)** — **usuwany** wraz z migracją frontu (nie będzie
   nigdzie używany). Wszystkie nowe serie powstają wyłącznie przez „seria z wydarzenia".

## Ustalenia (rozstrzygnięte)

- Wydarzenie źródłowe = **pierwsza instancja** serii (z notą o przypadku brzegowym, p. wyżej).
- Tworzenie serii z wydarzeń **z istniejącymi zapisami** jest dozwolone.
- Legacy endpoint `POST /event-series` z pełnym szablonem zostaje **usunięty**.

---

## Checklista implementacji

### Etap 1 — Backend: model i zamek duplikatów

- [x] `schema.prisma`: dodać `sourceEventId String? @unique` na `EventSeries` + relację do `Event`
      (np. `sourceEvent Event? @relation("SeriesSourceEvent", ...)`).
- [x] `schema.prisma`: dodać odwrotną relację na `Event` (`sourceForSeries EventSeries?`).
- [x] Migracja Prisma (`add_source_event_to_series`).
- [x] `prisma generate` + weryfikacja typów.

### Etap 2 — Backend: endpoint „seria z wydarzenia"

- [x] Nowy DTO `CreateSeriesFromEventDto` — **tylko** konfiguracja powtarzania:
      `recurrenceType`, `intervalDays?`, `daysOfWeek?`, `time?`, `durationMinutes?`, `startDate?`,
      `endDate?`, `bufferDays?`, `autoCoverImage?`, `name`, fake users (`targetOccupancy?`,
      `cleanupHours?`, `minFreeSlotsBuffer?`). Pola szablonu **pomijane** (czytane z wydarzenia).
- [x] `EventSeriesService.createSeriesFromEvent(organizerId, eventId, dto)`:
  - [x] Pobierz wydarzenie; weryfikuj własność organizatora (`ForbiddenException`).
  - [x] Walidacja: `event.seriesId == null` (inaczej `BadRequestException` „już w serii").
  - [x] Zbuduj `templateSnapshot` z pól wydarzenia (title, description, disciplineSlug, facilitySlug,
        levelSlug, citySlug, address, lat, lng, costPerPerson, min/maxParticipants, age, gender,
        visibility, coverImageId, rules, facilityReserved, welcomeMessageEnabled, roleConfig).
  - [x] Wyprowadź `startDate`/`time`/`durationMinutes` z wydarzenia, jeśli nie podane w DTO.
  - [x] Utwórz `EventSeries` z `sourceEventId = eventId`.
  - [x] Przypisz `event.seriesId = series.id` (w transakcji z create serii).
  - [x] Wywołaj `generator.generateForSeries(series.id)`.
  - [x] Reuse istniejącej logiki `validateRecurrenceConfig` / `validateRoleConfig`.
- [x] `EventSeriesController`: `POST from-event/:eventId`
      z `JwtAuthGuard, IsActiveGuard` + feature flag `enableEventSeries` / `isOverrideAccount`.
- [x] Endpoint pomocniczy do sprawdzenia możliwości: rozszerzyć odpowiedź `GET events/:id`
      (lub manage) o `canCreateSeries: boolean` + `seriesId` (jeśli istnieje).
- [x] Testy jednostkowe `event-series.service.spec.ts`:
  - [x] tworzy serię z wydarzenia (snapshot + `seriesId` + `sourceEventId`),
  - [x] odrzuca, gdy wydarzenie już ma `seriesId`,
  - [x] odrzuca obcego organizatora,
  - [x] zamek unique przy próbie dwóch serii z tego samego wydarzenia.

### Etap 3 — Shared (libs)

- [x] `libs/src/lib/types/event-series.types.ts`: dodać `CreateSeriesFromEventPayload`
      (tylko recurrence + name + fake users, bez pól szablonu).
- [x] `EventSeriesBase`: dodać `sourceEventId?: string | null`.
- [x] Eksport w barrelu.

### Etap 4 — Frontend: serwis i typy

- [x] `core/services/event-series.service.ts`: `createFromEvent(eventId, payload)`.
- [x] `core/services/event.service.ts` / typy: uwzględnić `canCreateSeries` + `seriesId` w modelu
      wydarzenia (manage/detail).

### Etap 5 — Frontend: widok konfiguracji serii

- [x] Nowy komponent/route `o/w/:id/create-series` — formularz recurrence
      (reuse `app-recurrence-picker`) + nazwa + fake users; bez pól szablonu.
- [x] Guard: jeśli wydarzenie ma już `seriesId` → redirect do `series/:id` + snackbar.
- [x] Po sukcesie → `navigateToSeries(series.id)`.

### Etap 6 — Frontend: zmiany w event-form

- [x] Usunąć `seriesForm`, `seriesEnabled` logikę formularza serii oraz gałąź serii w `onSubmit()`.
- [x] Zostawić checkbox „Cykliczne wydarzenie" jako **flagę intencji**.
- [x] Po utworzeniu wydarzenia: jeśli flaga zaznaczona → redirect do widoku konfiguracji serii
      (`o/w/:newId/create-series`); inaczej standardowy redirect.
- [x] Usunąć obsługę `queryParam seriesMode` (zastąpiona flagą intencji).
      dodać test redirectu przy zaznaczonej fladze.

### Etap 7 — Frontend: punkty wejścia „Utwórz serię"

- [x] Przycisk „Utwórz serię" na widoku zarządzania wydarzeniem (`event-manage`) — widoczny tylko gdy
      `canCreateSeries`.

### Etap 8 — Sprzątanie i dokumentacja

- [x] **Usunąć** legacy `POST /event-series` (pełny szablon): endpoint w kontrolerze,
      `createSeries()` w service, oraz `createSeries()` po stronie frontu.
- [x] Zweryfikować, że żaden inny moduł/test nie woła usuwanego endpointu/metody.
- [x] Zaktualizować `docs/api-endpoints.md`: dodać `POST /event-series/from-event/:eventId`,
      usunąć stare `POST /event-series`.

### Etap 9 — Weryfikacja

- [x] `nx build backend` ✅
- [x] `nx build frontend` ✅
- [x] `nx lint backend` 0 errors (118 warnings pre-existing)
- [x] `nx lint frontend` 0 errors (80 warnings pre-existing)
- [x] `nx test backend` (event-series specs) ✅ — 497 passed
- [x] `nx test frontend` (event-form specs) ✅ — 307 passed

---

## Kolejność rekomendowana

Etap 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.
Etapy 1–2 (backend + zamek duplikatów) są fundamentem; bez nich front nie ma czego wołać.
