# Wieloraka obsługa miast — kontekst miasta i wyszukiwarka

## 1. Cel i motywacja

Aplikacja ma być otwarta na wydarzenia w miastach innych niż jedyne wiodące dziś (Zielona Góra). Trzeba:

- dać użytkownikowi możliwość świadomego wyboru miasta już na stronie głównej,
- utrzymać aktualny kontekst miasta widocznie w UI (split bottom nav),
- zbierać sygnał popytu z miast jeszcze nieobsługiwanych (subskrypcja),
- usunąć hardcode `zielona-gora` rozproszony w kodzie i potraktować ją jak jedno z wielu miast.

## 2. Decyzje projektowe (ustalone)

| #   | Decyzja                            | Wybór                                                                                                                 |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Umiejscowienie selectora poza home | **Lewa strona bottom-nav** (split: kontekst po lewej, akcje po prawej)                                                |
| 2   | Tryb inputu miasta                 | **Autocomplete aktywnych miast + subskrypcja**, gdy user wpisuje miasto nieobsługiwane                                |
| 3   | Hierarchia źródeł kontekstu        | **Tylko URL + explicit wybór z `localStorage`**. Brak gadania, brak geolokalizacji, brak fallbacku do "zielonej góry" |
| 4   | Hardcode `zielona-gora`            | **Usuwamy w ramach tego planu** (NavigationService, home.component.html, ewentualne inne miejsca)                     |

Co świadomie odpuszczamy w tej iteracji:

- geolokalizacja użytkownika,
- free-text geocoding (Nominatim/Mapbox),
- "wydarzenia w okolicy 50 km" (multi-city w jednym widoku),
- wybór miasta jako preferencja w profilu (po stronie BE), zalogowanego — pozostajemy przy localStorage; sync z profilem może być osobnym tasku.

## 3. Architektura — kluczowe komponenty

### 3.1 `CityContextService` (frontend, `core/services`)

Signal-based serwis z aktualnym kontekstem miasta. Model: **jedno źródło prawdy — `currentCity` (persisted w `localStorage`)**.

Reguły aktualizacji:

1. **URL implicit persist** — przy każdym `NavigationEnd` serwis traversuje `Router.routerState.snapshot.root` w głąb (po `firstChild`) szukając `citySlug`. Gdy znajdzie inny slug niż bieżący — zapisuje go jako nowe bieżące miasto i persistuje do `localStorage`. Tym samym wejście na `/w/wroclaw` lub `/w/wroclaw/abc` automatycznie czyni Wrocław miastem bieżącym, również po wyjściu z tej ścieżki.
2. **Explicit selection** — `selectCity(...)` z searchera zapisuje slug+name do `localStorage`.
3. **Brak kontekstu** — `null` po `clearCity()` lub przy pierwszym otwarciu aplikacji bez `localStorage` ani URL z `citySlug`. UI w tym stanie pokazuje wyszukiwarkę zamiast listy.

Uwaga: ścieżki bez `citySlug` (np. `/`, `/profile`) **nie czyszczą** bieżącego miasta — kontekst przeżywa nawigację poza obszar miasta. Nazwa miasta zapisana z URL może być pusta, jeśli słownik miast jeszcze się nie załadował — `cityName` computed dopełnia ją z `DictionaryService.getCities()` zaraz po załadowaniu cache.

Publiczne API:

```ts
readonly citySlug = computed<string | null>(...);   // bieżący kontekst (URL > explicit > null)
readonly cityName = computed<string | null>(...);   // ładna nazwa do wyświetlenia (z cache City)
selectCity(city: { slug: string; name: string }): void;  // explicit wybór, zapis do localStorage
clearCity(): void;                                  // reset (np. wylogowanie)
```

### 3.2 `CitySearchComponent` (shared, `shared/city-search/`)

Reużywalny combobox z autocomplete. Jedno źródło dla home i bottom-sheet, zgodnie z DRY.

- Input z debounce ~150 ms.
- Sugestie z `DictionaryService.getCities()` (cache w pamięci, lista jest mała i stabilna).
- Filtrowanie locale-aware (`.localeCompare` z opcją `sensitivity: 'base'`), żeby "zielona" matchowało "Zielona Góra".
- A11y: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, obsługa ArrowUp/ArrowDown/Enter/Escape.
- Stan "brak dopasowań" → propozycja `Powiadom mnie gdy uruchomimy w „<wpis>"` z CTA otwierającym mini-formularz subskrypcji (e-mail dla niezalogowanych, od razu zapis dla zalogowanych).
- Emit `(citySelected) = { slug, name }` przy wyborze aktywnego miasta.

### 3.3 `CityContextButtonComponent` (layout, sekcja lewa bottom-nav)

Wizualny element po lewej stronie bottom-nav prezentujący aktualne miasto. Klik otwiera bottom-sheet z `CitySearchComponent` (poprzez istniejący `BottomOverlaysService`, nowy klucz `'city'`).

Stany:

- aktualnie wybrane miasto → ikona pinezki + skrócona nazwa (np. "Zielona G.") + chevron,
- brak kontekstu (`citySlug === null`) → "Wybierz miasto" + ikona pinezki, ten sam click otwiera sheet.

### 3.4 Backend — rozszerzenie `CitySubscription`

Aktualny model wymaga relacji do istniejącego `City` (`@@unique([userId, citySlug])`). Żeby zbierać popyt z miast **jeszcze nieistniejących**, są dwie ścieżki:

- **Wariant A (rekomendowany):** seedować w bazie dla każdego nieaktywnego "kandydata" rekord `City { isActive: false }`. Plus: minimalna zmiana schematu (zero migracji), jeden endpoint, spójne FK. Minus: trzeba zaprezerwować przyszłe slug-i (kontrolowane przez admina lub on-demand utworzenie nieaktywnego miasta).
- **Wariant B:** osobna tabela `CityLead { email?, userId?, cityName, createdAt }` dla wolnotekstowych zgłoszeń. Plus: dowolna nazwa od użytkownika. Minus: duplikacja, deduplikacja po nazwach niedokładna.

**Decyzja domyślna:** Wariant A z drobnym rozszerzeniem — endpoint `POST /cities/lead { name }` po stronie backendu robi `City.upsert({ slug: kebab(name), name, isActive: false })`, a potem `CitySubscription.upsert(userId|email)`. Dodajemy w `CitySubscription` pole opcjonalne `email String?` (dla niezalogowanych) — wymaga migracji i poluźnienia `userId` na `String?`.

Endpointy:

- `POST /cities/lead` — body `{ name: string, email?: string }` (e-mail wymagany dla niezalogowanych); zwraca `{ citySlug, alreadySubscribed }`.
- Istniejące `POST /cities/:slug/subscribe` i `DELETE /cities/:slug/subscribe` zostają.

### 3.5 Empty state w `EventsComponent`

Gdy lista wydarzeń dla wybranego miasta jest pusta:

- jeśli miasto `isActive: true` → "Nie ma jeszcze wydarzeń w <miasto>. Zostań organizatorem" + CTA "Subskrybuj powiadomienia".
- jeśli miasto `isActive: false` (user trafił przez bezpośredni link) → "Jeszcze tu nie działamy. Daj nam znać, że chcesz tu grać" + CTA `POST /cities/:slug/subscribe`.

## 4. Hierarchia stanów wizualnych

```
URL = /w/:slug         → kontekst aktualizowany do slug z URL (persist w localStorage),
                         selector w bottom-nav zsynchronizowany
URL = / lub inne       → kontekst = ostatni zapisany (URL implicit lub explicit), inaczej null
kontekst = null        → home pokazuje pełną wyszukiwarkę zamiast skróconego CTA
                         bottom-nav po lewej pokazuje „Wybierz miasto"
                         próba wejścia na `/w/:slug` ustawia kontekst automatycznie
```

## 5. Etapy wdrożenia (checklista)

### Etap 0 — przygotowanie

- [x] Przeczytać `docs/styleguide-common.md`, `docs/styleguide-frontend.md`, `docs/styleguide-backend.md`, `docs/frontend-page-layout.md`, `docs/design-tokens.md` przed przejściem do implementacji.
- [x] Założyć branch `feat/multi-city-context`.
- [x] Uzupełnić ten dokument o ewentualne nowe ustalenia po code review architektury.

### Etap 1 — Backend: City leady i subskrypcja niezalogowanych

- [x] Migracja Prisma: `CitySubscription.userId` → opcjonalny, dodać `email String?`, `@@unique([email, citySlug])`, indeks na `email`.
- [x] Rozszerzyć `CitySubscriptionsService` o `subscribeAnyByName(name, identity)` (upsert City `isActive: false` + subskrypcja).
- [x] Nowy endpoint `POST /cities/lead` w `CitySubscriptionsController` (dla niezalog. wymaga `email`, dla zalog. ignoruje `email` i bierze `userId` z guarda).
- [x] Walidacja DTO (`@IsString`, `@IsEmail` warunkowy, normalizacja nazwy → slug przez wspólny util `kebab()`).
- [x] Testy jednostkowe service + integracyjny controllera.
- [x] Aktualizacja `docs/api-endpoints.md`.

### Etap 2 — Frontend: CityContextService

- [x] Utworzyć `frontend/src/app/core/services/city-context.service.ts` z sygnałami i modelem URL implicit persist (jedno bieżące miasto).
- [x] Subskrypcja `Router.events` (filter `NavigationEnd`) z traversal `routerState.snapshot.root → firstChild` po `citySlug` (root `ActivatedRoute.paramMap` w `providedIn: 'root'` NIE zawiera child params — wcześniejsza wersja była buggy).
- [x] Persystencja `localStorage` pod kluczem `zs.city.selected` (schema `{ slug, name, savedAt }`). URL implicit i `selectCity()` używają tej samej ścieżki zapisu.
- [x] Inicjalizacja `cityName` z cache `DictionaryService.getCities()` (call raz przy starcie aplikacji); jeśli URL nadał slug przed załadowaniem słownika, nazwa jest uzupełniana po hydration.
- [x] Test jednostkowy: hydrate z URL, hydrate z localStorage, URL nadpisuje wcześniejszą selekcję, brak czyszczenia przy opuszczeniu /w/:slug, `clearCity()`.

### Etap 3 — Frontend: CitySearchComponent

- [x] Utworzyć `frontend/src/app/shared/city/city-search/city-search.component.{ts,html,scss}`.
- [x] Standalone, OnPush, signals, semantyczne kolory `primary`/`neutral` (zero `gray-*`, `blue-*` itd.).
- [x] Combobox WAI-ARIA (`role`, `aria-expanded`, klawiatura).
- [x] Filtrowanie locale-aware z debounce.
- [x] Stan "no match" + sekcja subskrypcji (e-mail dla niezalogowanych).
- [x] Output `(citySelected)` + `(leadSubscribed)`.
- [x] Testy: filtrowanie, klawiatura, wybór, subskrypcja zalogowanego, subskrypcja przez e-mail.
- [x] Dodać do `/dev/design-system` (sekcja "Wybór miasta") jako single source of truth.

### Etap 4 — Frontend: Home — wyszukiwarka zamiast CTA

- [x] W `home.component.html` zamienić sekcję "Obecnie działamy w Zielonej Górze – sprawdź" + przycisk "Zobacz wydarzenia" na osadzony `<app-city-search>`.
- [x] Wartość wstępna selectora = `CityContextService.cityName()` jeśli jest; w przeciwnym razie pusty input z placeholderem "Wpisz miasto…".
- [x] Po wyborze: `cityContext.selectCity(...)` → `router.navigate(['/w', slug])`.
- [x] Usunąć hardcoded `routerLink="/w/zielona-gora"`.
- [ ] Sprawdzić wizualnie w trybie mobile/desktop (overlay, kontrasty, focus ring).

### Etap 5 — Frontend: Bottom-nav split

- [x] Refaktor `bottom-nav.component.{ts,html}` — układ dwukolumnowy: lewa sekcja kontekstu, prawa sekcja akcji.
- [x] Utworzyć `CityContextButtonComponent` w lewej sekcji (lub osadzić w bottom-nav, w zależności od ilości logiki).
- [x] Usunąć przycisk "Wydarzenia" zgodnie z propozycją (rola przejęta przez selector + sam routing per miasto).
- [x] Po lewej: ikona pinezki + nazwa miasta lub "Wybierz miasto". Klik → `BottomOverlaysService.open('city')`.
- [x] Po prawej: "Udostępnij", "Ustawienia", "Profil"/"Zaloguj" (zachowane).
- [x] Dodać do `BottomOverlaysService` nowy overlay `'city'` renderujący `<app-city-search>` w bottom-sheet.
- [x] A11y: focus management (focus na input po otwarciu, Escape zamyka, focus wraca na trigger).
- [x] Testy: render, otwarcie/zamknięcie sheetu, selekcja zmienia kontekst i nawiguje.

### Etap 6 — Usunięcie hardcode'a `zielona-gora`

- [x] `NavigationService.navigateToHome()` — usunąć `['/w', 'zielona-gora']`. Po refaktorze metoda przekierowuje do `/` (home z wyszukiwarką), a osobne `navigateToCurrentCity()` używa `CityContextService.citySlug()` z fallbackiem na `/` (wcześniej odwoływało się do nieistniejącego pola `activatedRoute` — runtime error, naprawione).
- [x] Przejść `grep -r "zielona-gora" frontend/src` i wykorzenić pozostałe wystąpienia (poza testami i mockami).
- [x] Zaktualizować wywołujących `navigateToHome()` — jeśli intencją było "lista wydarzeń obecnego miasta", zamienić na `navigateToCurrentCity()`.
- [ ] Test integracyjny: użytkownik bez explicit selection klikający logo wraca na `/`, nie na `/w/zielona-gora`.

### Etap 7 — Empty state z subskrypcją

- [x] W `EventsComponent` (lista wydarzeń per miasto) dodać empty state.
- [x] Wariant aktywny / nieaktywny — patrz sekcja 3.5.
- [x] CTA "Subskrybuj powiadomienia" → wywołanie `CitySubscriptionService` (dla zalog.) lub modal e-mail (dla niezalog.).
- [x] Confirm UI po subskrypcji (toast + ukrycie CTA).

### Etap 8 — Telemetria (opcjonalne, jeśli mamy event tracking)

- [ ] `city_search_opened`, `city_selected { slug, source: 'home'|'bottom-nav' }`, `city_subscribed_lead { from: 'search'|'empty-state' }`.

### Etap 9 — Dokumentacja i design system

- [x] Wpis w `docs/design-tokens.md` o nowych elementach (pill kontekstu w bottom-nav, jeśli wprowadza nowe tokeny). Brak nowych tokenów — używa wyłącznie istniejących semantycznych.
- [x] Strona `/dev/design-system` — sekcja "City search" + "City context button".
- [x] Krótka notka w `docs/frontend-page-layout.md` o split bottom-nav (lewa kontekst / prawa akcje).
- [x] Po zakończeniu — odznaczyć wszystkie checkboxy w tym pliku.

## 6. Edge cases i ryzyka

- **User wchodzi przez deep link do nieaktywnego miasta** (`/w/krakow` gdy `isActive: false`) — backend powinien wciąż zwrócić listę (pustą), żeby empty state z subskrypcją mógł się pokazać. Sprawdzić, czy `EventsService` filtruje po `City.isActive`; jeśli tak — poluźnić filtr na poziomie listy publicznej.
- **Slug kolizje przy `POST /cities/lead`** — `kebab("Łódź")` musi dać deterministyczny ASCII slug; użyć istniejącego utila do slugifikacji (jeśli jest) lub dodać z `slugify`.
- **Bottom-nav na bardzo wąskich ekranach** — split na 5 elementów (1 lewy + 3 prawe + avatar) może być ciasny przy 320 px. Wymagany test wizualny; ewentualnie skracać nazwę miasta do 3 znaków + "…".
- **Race condition URL → explicit** — przy `router.navigate(['/w', slug])` po wyborze: najpierw `selectCity()`, dopiero potem `navigate`, żeby `citySlug` w sygnale nie migotało.
- **`localStorage` niedostępny (SSR, Safari private)** — owinąć `try/catch`, w SSR `isPlatformBrowser` guard. Brak persystencji nie powinien crashować appki.
- **Cache miast** — `DictionaryService.getCities()` jest dziś bez cache. Dodać prosty `shareReplay(1)` w serwisie, żeby nie strzelać przy każdym otwarciu sheetu.

## 7. Pytania otwarte (do potwierdzenia w trakcie wdrożenia)

- Czy chcemy słownie potwierdzić w UI "Aktualnie aktywne miasta: <lista>" jako pomoc przy pustym inpucie? (Brak — można zostawić listę wszystkich aktywnych jako "default suggestion" po otwarciu comboboxa, bez wpisania znaku.)
- Czy "Subskrybuj nowe miasto" wymaga double opt-in (e-mail potwierdzający)? Dla niezalogowanych prawie na pewno tak, żeby uniknąć spamu cudzymi adresami. **Wstępna odpowiedź:** tak, ale to można zrobić w osobnym tasku — w MVP wystarczy proste zapisanie leada bez wysyłki.
- Czy interesuje nas zliczanie leadów per miasto na widoku admina? (np. "Top 10 miast oczekujących") — przyszły task.

## 8. Definition of Done

- [x] Wszystkie checkboxy w sekcji 5 zaznaczone (poza opcjonalnym Etapem 8 i kilkoma pozostałymi do weryfikacji wizualnej/testów integracyjnych).
- [x] `pnpm exec nx run-many --target=test --projects=frontend,backend` przechodzi.
- [x] `pnpm exec nx run-many --target=lint --projects=frontend,backend` bez błędów.
- [ ] Manualny smoke test: otwarcie home bez `localStorage` → wyszukiwarka, wybór "Zielona Góra" → `/w/zielona-gora`, otwarcie bottom-nav-sheet z innej strony → zmiana na inne aktywne miasto → URL i UI zsynchronizowane.
- [ ] Code review co najmniej jeden +1, design tokens i semantyczne kolory zweryfikowane.
- [ ] PR powiązany z tym dokumentem (link do `docs/tasks/multi-city-context.md`).
