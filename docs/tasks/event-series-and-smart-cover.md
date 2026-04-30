# Propozycja: Serie wydarzeń + automatyczny dobór cover image

## Kontekst i stan obecny

Backend **już posiada** fundament dla serii:

- model `Event` ma pola `isRecurring`, `recurringRule`, `parentEventId`, relacje `parentEvent` / `childEvents`
- endpoint `POST /events/series` w `events.controller.ts` wywołuje `createSeries()`
- `generateRecurringDates()` obsługuje reguły: `DAILY`, `WEEKLY` (default), `BIWEEKLY`, `MONTHLY`, max 52 instancje
- istnieje też `PATCH /events/:id/series` do aktualizacji całej serii

Frontend **nie eksponuje żadnej z tych możliwości** — formularz zawsze wysyła do `POST /events`.

Cover image jest wybierany **losowo** (`findRandomByDiscipline`) gdy organizator nie wskaże konkretnego.

---

## TASK 1 — UI i ulepszenia serii wydarzeń

### Cel

Dać organizatorowi możliwość zaznaczenia w formularzu, że tworzy serię (np. "co poniedziałek"), wybrania rytmu i liczby powtórzeń oraz obejrzenia podglądu dat przed zapisem.

### Projekt rozwiązania

#### 1.1 Backend — `CreateEventDto` + `generateRecurringDates`

Obecny kod zawsze tworzy **wszystkie 52 instancje**, bo `maxInstances = 52` jest hardkodowane.
Trzeba dodać parametr `seriesCount`:

```ts
// CreateEventDto — nowe pole:
@IsOptional()
@IsInt()
@Min(2)
@Max(52)
seriesCount?: number;   // ile instancji (wliczając pierwszą)
```

`generateRecurringDates` powinna przyjmować `count` i respektować go zamiast `maxInstances`.

Ponadto child events pomijają pole `rules` — należy je skopiować z parenta (bug istniejący w kodzie).

#### 1.2 Frontend — sekcja „Seria wydarzeń" w formularzu

Nowa, zwijana sekcja `<app-card>` pod sekcją dat, widoczna zawsze:

```
[ ] Powtarzaj wydarzenie (seria)
```

Po zaznaczeniu:

```
Rytm:      [co tydzień ▾]   co 2 tygodnie | co miesiąc
Powtórzeń: [  4  ] (2–52)

Podgląd dat:
  ✓ pn 05.05.2025  20:00–22:00  (ta instancja)
  · pn 12.05.2025  20:00–22:00
  · pn 19.05.2025  20:00–22:00
  · pn 26.05.2025  20:00–22:00
```

Podgląd oblicza się **lokalnie w komponencie** na podstawie `startsAt`, `endsAt`, rytmu i liczby powtórzeń — bez wywołania API.

Gdy seria jest aktywna, przycisk submit wysyła `POST /events/series` zamiast `POST /events`.

#### 1.3 Edycja serii

Przy edycji wydarzenia z serii (`isRecurring = true` i `parentEventId != null`) wyświetlić banner z pytaniem:

```
To jest wydarzenie z serii. Czy edytować tylko tę instancję czy całą serię?
[ Tylko tę ]  [ Całą serię ]
```

„Całą serię" wywołuje `PATCH /events/:parentId/series`.
„Tylko tę" wywołuje dotychczasowe `PATCH /events/:id`.

### Checklist — TASK 1

#### Backend

- [ ] `CreateEventDto`: dodać `seriesCount?: number` (opcjonalne, 2–52)
- [ ] `generateRecurringDates()`: przyjmować `count` jako parametr, nie hardkodować 52
- [ ] `createSeries()`: przekazać `count` do `generateRecurringDates`
- [ ] `createSeries()`: skopiować pole `rules` do child events (bug fix)
- [ ] Testy: sprawdzić że `seriesCount = 3` tworzy 3 wydarzenia (parent + 2 child)

#### Frontend

- [ ] `event-form.component.ts`: dodać pola formularza `isRecurring: false`, `recurringRule: 'WEEKLY'`, `seriesCount: 4`
- [ ] Dodać sekcję „Seria wydarzeń" z checkboxem, select rytmu, inputem liczby powtórzeń
- [ ] Dodać computed `seriesPreviewDates` — lista dat wyliczana lokalnie
- [ ] Wyświetlić podgląd dat w sekcji (tylko gdy `isRecurring = true`)
- [ ] `onSubmit()`: gdy `isRecurring`, wywołać `eventService.createSeries()` zamiast `createEvent()`
- [ ] `EventService`: dodać metodę `createSeries(payload)` → `POST /events/series`
- [ ] Sekcja edycji serii: banner + wybór „tylko ta instancja / cała seria"

---

## TASK 2 — Automatyczny dobór cover image

### Cel

Dodać opcjonalny checkbox w formularzu, który uruchamia algorytm wybierający cover image minimalizujący powtórzenia wśród ostatnich wydarzeń organizatora, z dodatkowym uwzględnieniem wydarzeń w tym samym mieście.

### Projekt rozwiązania

#### 2.1 Algorytm — logika serwisu

Nowa metoda w `CoverImagesService`:

```ts
findSmartCoverForOrganizer(
  disciplineSlug: string,
  organizerId: string,
  citySlug: string,
  excludeIds?: string[],   // do serii: już przypisane w tej sesji
): Promise<CoverImage | null>
```

Kolejność priorytetów przy wyborze:

1. **Wyklucz** `excludeIds` (przypisane wcześniej w tej samej serii)
2. Pobierz ostatnie N wydarzeń organizatora dla danej dyscypliny (proponowane N = 20), wyciągnij ich `coverImageId`
3. **Priorytet 1:** wybierz cover który **nie był użyty** przez organizatora w tych N wydarzeniach
4. Jeśli każdy był użyty przez organizatora (mała pula coverów) — wybierz ten **najdawniej użyty** przez organizatora
5. **Priorytet 2 (tie-breaker):** wśród remisantów preferuj cover nieużywany w ostatnich M wydarzeniach w tym mieście (proponowane M = 30)
6. Wśród remisantów po priorytecie 2 — losowy wybór

Implementacja przez scorowanie:

```
score(cover) = organizer_penalty * 10 + city_penalty * 1
  organizer_penalty = pozycja w historii organizatora (0 = nieużywany, 1 = najdawniejszy, 20 = najnowszy)
  city_penalty = pozycja w historii miasta (analogicznie)
```

Wybieramy cover z najniższym score. Przy równym score — losowo.

#### 2.2 Backend — endpoint sugestii

```
GET /cover-images/suggest?disciplineSlug=&citySlug=
  Authorization: Bearer ...   (organizerId z JWT)
  → { coverImageId: string, cover: CoverImage }
```

Endpoint używa zalogowanego użytkownika jako `organizerId`. Przydatny dla podglądu w UI przed submitem.

Alternatywnie: backend obsługuje `autoCoverImage: true` w DTO i sam przydziela cover w `create()` / `createSeries()`. Oba podejścia można łączyć.

**Rekomendacja:** endpoint `GET /suggest` dla podglądu + flaga `autoCoverImage` w DTO dla pewności (frontend może wysłać już resolved `coverImageId` lub zostawić to backendowi).

#### 2.3 Cover image dla serii

Gdy `isRecurring = true` i `autoCoverImage = true`:

- Każda instancja serii dostaje **inny** cover image
- `createSeries()` wywołuje `findSmartCoverForOrganizer()` dla każdej instancji, przekazując `excludeIds` z poprzednich instancji tej serii
- Jeśli dostępnych coverów jest mniej niż instancji — po wyczerpaniu puli ponownie wybierane są te najdawniej użyte

#### 2.4 Frontend — UX sekcji cover image

Obecny stan: galeria thumbnail z zaznaczeniem aktywnego.

Proponowana zmiana:

```
[ ] Automatyczny dobór grafiki
```

Gdy zaznaczone:

- Ukryj galerię ręcznego wyboru
- Pokaż placeholder z informacją "Grafika zostanie dobrana automatycznie przy zapisie"
- Opcjonalnie: przycisk „Podejrzyj sugestię" → wywołuje `GET /suggest` i pokazuje miniaturę

Gdy odznaczone → standardowa galeria (jak dotychczas).

Dla serii + auto cover: dodatkowa informacja "Każde wydarzenie z serii otrzyma inną grafikę".

### Checklist — TASK 2 (pojedyncze wydarzenie — ZREALIZOWANE)

#### Backend

- [x] `CoverImagesService`: nowa metoda `findSmartCoverForOrganizer(disciplineSlug, organizerId, citySlug)`
- [x] Zapytanie do bazy: historia ostatnich 20 wydarzeń organizatora w dyscyplinie
- [x] Zapytanie do bazy: historia ostatnich 30 wydarzeń w mieście
- [x] Logika scorowania: orgScore \* 10 + cityScore, min score wygrywa, remisy losowo
- [x] `CoverImagesController`: nowy endpoint `GET /cover-images/suggest?disciplineSlug=&citySlug=` (wymaga JWT)
- [x] `events.service.ts` → `resolveCoverImageId()`: smart algorytm jako domyślny fallback (bez `coverImageId`)
- [ ] Testy jednostkowe algorytmu scorowania
- [ ] `events.service.ts` → `createSeries()`: dla auto cover przydzielaj kolejnym instancjom różne covery (TASK 1)

#### Frontend

- [x] `event-form.component.ts`: sygnały `autoCoverImage`, `suggestLoading`, `suggestedCover`
- [x] Checkbox „Automatyczny dobór grafiki" w sekcji cover image
- [x] Tryb auto: ukrywa galerię, pokazuje podgląd sugestii z badgem „auto"
- [x] Przycisk „Losuj inną" → ponowne wywołanie `GET /suggest`
- [x] Zmiana miasta przy aktywnym auto → automatyczny re-fetch sugestii
- [x] Zmiana dyscypliny → reset stanu auto
- [x] `CoverImageService`: metoda `suggest(disciplineSlug, citySlug)`
- [x] `IconComponent`: dodana ikona `refresh-cw`
- [ ] Dla serii z auto cover: osobne covery per instancja (TASK 1)

---

## Powiązania między taskami

Serie + smart cover działają niezależnie, ale naturalnie się łączą:

- Użytkownik tworzy serię 8 wydarzeń z auto cover → każde z 8 dostaje unikatową grafikę
- To jest główny use case który uzasadnia task 2

## Kolejność implementacji

Rekomendowana kolejność:

1. **Backend Task 1** — fix `seriesCount`, fix kopiowania `rules` (małe zmiany)
2. **Backend Task 2** — smart cover algorithm + endpoint suggest
3. **Frontend Task 1** — sekcja serii w formularzu (nie wymaga Task 2)
4. **Frontend Task 2** — checkbox auto cover (nie wymaga Task 1, ale dobrze je połączyć)

## Otwarte pytania

1. **Liczba powtórzeń vs data końca serii**: zaproponowano liczbę instancji (prostsze UX). Alternatywa to pole „Powtarzaj do dnia [...]". Które wygodniejsze?
2. **Podgląd sugestii cover image w UI**: czy przycisk „Podejrzyj" jest potrzebny, czy wystarczy informacja że zostanie dobrana automatycznie?
3. **Edycja cover image w serii**: jeśli organizator edytuje jedną instancję i zmienia cover ręcznie — czy wyłącza to auto cover dla tej instancji? (Rekomendacja: tak, per-instance override)
4. **N i M dla algorytmu** (historia 20/30 wydarzeń): czy te wartości są odpowiednie dla skali projektu?
