# Przewodnik dla Asystenta AI: migracja szablonu Bootstrap → Angular + Tailwind + Angular Material

Ten dokument opisuje **konkretne zasady i procedurę** dla Asystenta AI, który ma wdrażać ekrany/komponenty na podstawie szablonów HTML z `.ignored/themplates/sticky-mobile-template/code/*` (Bootstrap 5, mobile/PWA) do projektu `zgadajsie` opartego o:

- Angular 20+ (standalone, signals, OnPush)
- Tailwind CSS (JEDYNE źródło layoutu i wyglądu)
- Angular Material / CDK (TYLKO zachowanie i a11y)
- IconComponent + inline SVG (bez Bootstrapa, bez `mat-icon`)

---

## 1. Ogólne założenia migracji

1. **Źródło**: pliki `.html` z katalogu `.ignored/themplates/sticky-mobile-template/code/` (Bootstrap 5, mobile-first).
2. **Cel**: komponenty i strony w katalogu `frontend/src/app` zgodnie ze strukturą z `docs/project-structure.md`.
3. **Technologie docelowe**:
   - layout, spacing, kolorystyka, typografia, responsywność → **Tailwind CSS**;
   - formularze, focus, dialogi, overlay, a11y → **Angular Material/CDK**, BEZ styli Material;
   - ikony → **inline SVG przez `IconComponent` z `core/icons`**.
4. **Zakaz**:
   - NIE używaj Bootstrapa (klas `row`, `col-*`, `btn-*`, `d-flex`, itp.).
   - NIE kopiuj `<link>`/`<script>` Bootstrapa do Angulara.
   - NIE używaj `mat-icon`, font icons ani `<i class="bi ...">`.
   - NIE polegaj na klasach `mat-*` jako źródle wyglądu.

---

## 2. Lokacja kodu w projekcie

Przy zadaniach typu:

- „Stwórz stronę główną w oparciu o plik szablonu: `.ignored/themplates/sticky-mobile-template/code/home.html`”
- „Stwórz komponent z listą wydarzeń opierający się na liniach 20–100 z pliku: `.ignored/themplates/sticky-mobile-template/code/events.html`”

**Zawsze** umieszczaj wynikowy kod we właściwym miejscu frontendu:

- Strony / widoki domenowe:
  - `frontend/src/app/features/home/` – np. `home.component.ts/html/css`.
  - `frontend/src/app/features/events/` – np. `events.component.ts/html/css`.
- Wspólne komponenty layoutu: `frontend/src/app/layout/*`.
- Komponenty wielokrotnego użytku (przyciski, inputy, listy, karty): `frontend/src/app/shared/ui/*`.
- Ikony: zawsze przez `IconComponent` z `frontend/src/app/core/icons`.

Jeśli fragment szablonu wygląda na **uniwersalny** (np. przycisk, karta wydarzenia, bottom nav), wyodrębnij go do `shared/ui` i użyj w feature.

---

## 3. Strategia migracji pojedynczego pliku HTML

Dla zadania „oprzyj się na pliku X.html” stosuj **zawsze tę samą sekwencję kroków**:

1. **Analiza struktury**

   - Zidentyfikuj sekcje: nagłówek, lista, formularz, bottom nav, itd.
   - Zmapuj sekcje na komponenty Angulara (feature + ewentualne `shared/ui`).

2. **Usunięcie zależności od Bootstrapa**

   - Zignoruj `<link ... bootstrap.css>` i `<script ... bootstrap.js>`.
   - W HTML usuń wszystkie klasy Bootstrap (`container`, `row`, `col-*`, `btn`, `btn-*`, `d-flex`, `text-*`, `mt-*`, `mb-*`, itd.).

3. **Przepisanie layoutu na Tailwind**

   - Mapuj typowe wzorce Bootstrapa na Tailwind (szczegóły w sekcji 4).
   - Dodaj klasy Tailwind **bezpośrednio** do elementów HTML.

4. **Ikony**

   - Zamień `<i class="bi bi-..."></i>` lub inne font icons na użycie `IconComponent`:
     - Ustal semantyczną nazwę ikony (`"home"`, `"calendar"`, `"user"` itp.).
     - Użyj: `<app-icon name="home" class="w-6 h-6 text-zinc-700" />` lub odpowiedniego aliasu `IconComponent`.

5. **Interakcje i logika**

   - Uprość czysty HTML do struktury komponentów Angulara.
   - Przenieś logikę (toggle, modale, dropdowny) na Angular + ewentualnie Angular Material/CDK.

6. **API komponentu**
   - Zdefiniuj wejścia/wyjścia (input(), output()) tylko tam, gdzie wymagane z perspektywy domeny (`events`, `home`).
   - Użyj sygnałów do stanu wewnętrznego.

---

## 4. Mapowanie klas Bootstrap → Tailwind (skrót dla AI)

Przy tłumaczeniu HTML z Bootstrapa NALEŻY:

### 4.1. Kontenery i szerokość

- `container`, `container-fluid` → np. `mx-auto max-w-md px-4` (dla mobilnego PWA)
- `row` → `flex flex-wrap -mx-2` (jeśli potrzebne kolumny)
- `col-12` → `w-full`
- `col-6` → `w-1/2`
- `col-4` → `w-1/3`
- `col-3` → `w-1/4`

Dobierz **max-w-\*** zgodnie z mobile-first (np. `max-w-md`, `max-w-lg`).

### 4.2. Flex / alignment

- `d-flex` → `flex`
- `flex-row`/`flex-column` Bootstrapa → odpowiednio `flex-row`, `flex-col`
- `justify-content-between` → `justify-between`
- `justify-content-center` → `justify-center`
- `align-items-center` → `items-center`

### 4.3. Spacing

Dopasuj przybliżone odległości:

- `mt-1`/`mb-1`/`pt-1`/`pb-1` → `mt-1`/`mb-1`/`pt-1`/`pb-1` (Tailwind ma podobną skalę)
- `mt-2` → `mt-2`, `mt-3` → `mt-3`, itd.
- `p-3` → `p-3`, `p-4` → `p-4`.

Gdy brak bezpośredniego odpowiednika, wybierz **najbliższą skalę Tailwind**.

### 4.4. Typografia i kolory

**Typografia:**
- `fw-bold` → `font-semibold` lub `font-bold`
- `small` → `text-xs` / `text-sm`

**Kolory — WYŁĄCZNIE z palety projektowej:**

Projekt posiada **centralną paletę kolorów** zdefiniowaną jako statyczne hex values w `frontend/tailwind.config.js`. Brak CSS custom properties kolorów. Brak dark mode.

**Źródło definicji:**
- **Jedyne źródło prawdy:** `frontend/tailwind.config.js` (`extend.colors`)
- **Pełna dokumentacja:** `docs/design-tokens.md`
- **Podgląd wizualny:** `/dev/design-system` (tylko dev mode)

**Zasada migracji Bootstrap → Tailwind:**
Przy migracji kolorów z Bootstrapa używaj **wyłącznie** palet z `tailwind.config.js`:

*Tekst i tła ogólne:*
- `text-dark` / `text-body` → `text-neutral-900` (tekst główny)
- `text-muted` / `text-secondary` → `text-neutral-500` (tekst drugorzędny)
- `bg-white` → `bg-white` (tło karty/komponentu)
- `bg-light` → `bg-neutral-50` (lekkie tło — Bootstrap `#f8f9fa` ≈ `neutral-50`)
- `border-*` → `border-neutral-200` (domyślne obramowanie)

*Brand:*
- `bg-primary` → `bg-primary-500` (brand/akcent)
- `text-primary` → `text-primary-500`

*Statusy — solid bg (badge, button):*
- `bg-danger` → `bg-danger-400 text-white`
- `bg-success` → `bg-success-400 text-white`
- `bg-warning` → `bg-warning-400 text-white`
- `bg-info` → `bg-info-400 text-white`

*Statusy — tekst na jasnym tle (czytelność):*
- `text-danger` → `text-danger-500`
- `text-success` → `text-success-600`
- `text-warning` → `text-warning-600`
- `text-info` → `text-info-600`

*Focus ring:*
- `:focus` / `.focus` → `focus:ring-2 focus:ring-primary-500 focus:outline-none`

**ZABRONIONE:** domyślne kolory Tailwind (`gray-*`, `blue-*`, `slate-*`), arbitralne hexy (`bg-[#abc]`), prefixy `dark:`.

**Nigdy nie używaj** klas kolorów Bootstrapa. Zawsze dobieraj klasy z palety projektowej.

### 4.5. Przyciski

Nie używaj `btn`, `btn-primary`, `btn-outline-*` itp.

Dla przycisków mobilnych:

- Stwórz lub użyj istniejącego komponentu `Button` w `shared/ui` (np. `UiButtonComponent`).
- Wewnątrz nadaj klasy Tailwind, np.:
  - podstawowy: `inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50`;
  - wariant `outline`: `border border-neutral-200 bg-white text-neutral-900`.
- Eksponuj API: `[variant]`, `[size]`, `[disabled]`, `(clicked)`.

Przy migracjach używaj **zawsze** własnego przycisku z `shared/ui`, nie anonimowego `<button>` rozmnożonego po projekcie.

### 4.6. Karty, listy, bottom-nav

Jeśli Bootstrap używa `card`, `list-group`, `navbar`, `nav`:

- Twórz semantyczne struktury HTML z Tailwind:
  - karty: `rounded-2xl bg-white shadow-sm p-4 border border-neutral-200`;
  - listy: `divide-y divide-neutral-200` + elementy `py-3 flex items-center gap-3`;
  - bottom nav (sticky): `fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 backdrop-blur` + grid/flex.
- Dla wzorców powtarzalnych (np. **karta wydarzenia**) rozważ `EventCardComponent` w `shared/ui`.

### 4.7. Grid i breakpointy (mobile-first)

Bootstrapowe klasy responsywne tłumacz na **prefiksy Tailwind**:

- `d-none` → `hidden`
- `d-block` → `block`
- `d-flex` → `flex`
- `d-md-none` → `md:hidden`
- `d-none d-md-block` → `hidden md:block`
- `d-sm-flex` → `sm:flex`

Kolumny responsywne:

- `col-12 col-md-6` → `w-full md:w-1/2`
- `col-6 col-lg-3` → `w-1/2 lg:w-1/4`

Breakpointy:

- `sm` ~ viewport ≥ 640px
- `md` ~ viewport ≥ 768px
- `lg` ~ viewport ≥ 1024px

**Zasada dla AI**: projekt jest mobile-first, więc:

1. najpierw ustaw klasy **bez prefiksów** (zachowanie na mobile);
2. dopiero potem dodawaj `sm:`, `md:`, `lg:` dla większych ekranów;
3. jeżeli szablon bazowy jest mocno desktopowy, uprość go do czytelnej wersji mobile, a dopiero potem dodaj responsywność.

---

## 5. Angular Material — kiedy i jak używać przy migracji

Angular Material/CDK wolno używać **tylko dla zachowania i dostępności**, NIGDY jako gotowy wygląd:

### Dozwolone przypadki w kontekście szablonu

- formularze: `MatFormField`, `MatInput`, `MatSelect`, `MatCheckbox`, `MatRadio`, `MatDatepicker`, `MatError`;
- overlay/interakcje: `MatDialog`, `MatMenu`, `MatBottomSheet`, `MatSnackBar`, `MatTooltip`;
- CDK: `CdkOverlay`, `CdkPortal`, `CdkA11y`, `CdkFocusTrap`, `CdkScrollable`.

### Zasady

1. Komponent UI **nie może** eksponować Angular Material na zewnątrz (używamy go tylko wewnątrz headless komponentów w `shared/ui`).
2. stylowanie formularzy, przycisków, dialogów wykonujemy **wyłącznie Tailwindem**;
3. **nie kopiujemy** wyglądu Material, nie używamy Material Theme.

Przykład zastosowania: jeśli w szablonie Bootstrap jest **modal**:

- W Angularze utwórz headless komponent `UiDialog` w `shared/ui`, który **pod spodem** może używać `MatDialog` lub `CdkOverlay`;
- wygląd (`rounded-*`, `shadow-*`, `backdrop-blur`, itp.) zrealizuj Tailwindem;
- w feature (np. `home`) używaj tylko API `UiDialog`, nie bezpośrednio `MatDialog`.

---

## 6. Ikony: z Bootstrapa → IconComponent + SVG

W szablonie Bootstrap 5 ikony często pochodzą z `Bootstrap Icons` i są dodawane jako:

```html
<i class="bi bi-house"></i>
```

W projekcie docelowym:\*\*

- nie używaj font icons ani `i.bi`;
- **każda ikona** musi być zrealizowana przez `IconComponent` z `core/icons`.

### Procedura migracji ikony

1. Odczytaj znaczenie ikony z kontekstu (np. home, calendar, plus, user, search).
2. Wybierz nazwę ikony odpowiadającą semantyce (`"home"`, `"calendar"`, `"plus"`, `"user"`, `"search"`, ...).
3. W HTML zamiast `<i>` wstaw coś w rodzaju:

```html
<app-icon name="home" class="w-6 h-6 text-zinc-700" />
```

4. Rozmiar (`w-* h-*`) i kolor (`text-*`) kontroluj klasami Tailwind.
5. SVG zdefiniowane w `IconComponent` MUSZĄ używać `fill="currentColor"` / `stroke="currentColor"`.

Jeśli w zadaniu nie jest opisane skąd brać ikonę, **załóż użycie Heroicons** (outline/solid) z mapowaniem nazw na kontekst.

---

## 7. Angular – szczegółowe wytyczne implementacyjne

Przy tworzeniu komponentów na bazie szablonu **zawsze** stosuj zasady z `docs/styleguide-frontend.md`:

1. **Standalone components** – każdy nowy komponent jest standalone (domyślnie w Angular 20+).
2. **ChangeDetectionStrategy.OnPush** – ustawiaj, o ile nie jest już domyślne.
3. **Sygnały** – używaj `signal()`, `computed()`, `effect()` zamiast `BehaviorSubject`/`EventEmitter`, tam gdzie to ma sens.
4. **Nowa składnia szablonów** – przepisywanie list i warunków z szablonu na:
   - `@for (event of events(); track event.id)` zamiast `*ngFor`;
   - `@if (condition) { ... }` zamiast `*ngIf`.
5. **API komponentu**:
   - zdefiniuj wejścia przez `input()` / `input.required()`;
   - zdarzenia przez `output()` zamiast `EventEmitter`.

---

## 8. Konkretne scenariusze migracji

### 8.1. „Stwórz stronę główną z pliku home.html”

1. Odczytaj strukturę `home.html`:
   - główny kontener strony;
   - sekcje hero, lista nadchodzących wydarzeń, bottom navigation itd.
2. Utwórz/uzupełnij komponent w `frontend/src/app/features/home/` (np. `home.component.ts/html/css`).
3. Przenieś strukturę HTML, usuwając klasy Bootstrapa i dodając klasy Tailwind zgodne z mobile PWA (np. pełna wysokość ekranu, sticky bottom nav).
4. Jeśli występują złożone fragmenty powtarzalne (kartka wydarzenia, kafelki opcji) – przenieś je do `shared/ui` jako osobne komponenty.
5. Podłącz dane z backendu (np. lista wydarzeń) przez serwisy z `core/providers` lub `features/events` (zgodnie z istniejącą architekturą).

### 8.2. „Stwórz komponent z listą wydarzeń z linii 20–100 events.html”

1. Wyodrębnij tylko potrzebny fragment HTML (linia 20–100) – zwykle to `<ul>/<li>` lub zestaw `card`.
2. Zmapuj go na komponent w `frontend/src/app/features/events/` lub headless `EventListComponent` w `shared/ui` (jeśli ma być używany w wielu miejscach).
3. Zastąp klasy Bootstrapa Tailwindem (layout listy, spacing, typografia, kolory).
4. Zaprojektuj API komponentu, np. `input() events: EventDto[]` oraz event `output() eventSelected`.
5. Ikony statusu/czasu/lokalizacji zrealizuj przez `IconComponent`.

---

## 9. Czego asystent AI NIE MOŻE robić podczas migracji

1. **Nie wolno**:
   - kopiować ani sugerować użycia Bootstrapa w kodzie Angulara;
   - używać `mat-icon` ani żadnych klas ikon fontowych (`bi`, `fa`, itp.);
   - opierać się na klasach `mat-*` jako źródle wyglądu;
   - definiować Material Theme jako systemu kolorów.
2. **Nie generuj** globalnych override’ów styli Material w `styles.css`.
3. **Nie mieszaj** dwóch systemów designu – cały wygląd musi pochodzić z Tailwind (plus ewentualne własne SCSS, jeśli projekt dopuszcza, ale bez Bootstrapa).

---

## 10. Podsumowanie – skrót procedury dla AI

Dla każdego zadania typu: „Stwórz stronę/komponent na podstawie pliku szablonu Bootstrap”:

1. Odczytaj HTML z `.ignored/themplates/sticky-mobile-template/code/...`.
2. Zdecyduj, gdzie w strukturze `frontend/src/app` powinien trafić komponent (feature vs shared/ui vs layout).
3. Usuń wszystkie klasy i zależności Bootstrapa.
4. Zbuduj layout, spacing, typografię i kolory za pomocą klas Tailwind.
5. Zamień wszystkie ikony na `IconComponent` + inline SVG (Heroicons, `currentColor`).
6. W razie potrzeby użyj Angular Material/CDK **tylko** dla zachowania i a11y, nie designu.
7. Zastosuj zasady Angular z `docs/styleguide-frontend.md` (standalone, sygnały, OnPush, nowa składnia szablonów).
8. Tam, gdzie widzisz powtarzalne UI, wydziel headless komponent w `shared/ui`.

Traktuj szablon Bootstrap **wyłącznie jako referencję struktury i UX**, a nie jako źródło kodu CSS/JS. Wszystkie decyzje o layoutcie i stylach podejmuj w oparciu o Tailwind i istniejące zasady projektu.

---

## 11. Przykład mikro-migracji: karta wydarzenia (Bootstrap → Angular + Tailwind)

### 11.1. Fragment z szablonu Bootstrap (źródło referencyjne)

Załóżmy, że w pliku `.ignored/themplates/sticky-mobile-template/code/events.html` znajduje się taki fragment (PRZYKŁAD, nie kopiuj go 1:1):

```html
<div class="card mb-3">
  <div class="card-body d-flex justify-content-between align-items-center">
    <div>
      <h5 class="card-title mb-1">Koncert jazzowy</h5>
      <p class="card-text mb-1 text-muted">
        <i class="bi bi-calendar-event me-1"></i> 24.01.2026, 19:00
      </p>
      <p class="card-text mb-0 text-muted"><i class="bi bi-geo-alt me-1"></i> Klub Muzyczny XYZ</p>
    </div>
    <button class="btn btn-primary btn-sm">Szczegóły</button>
  </div>
</div>
```

### 11.2. Decyzje projektowe

Asystent AI powinien podjąć następujące decyzje:

1. To jest **powtarzalny wzorzec UI** → warto utworzyć headless komponent, np. `EventCardComponent` w `frontend/src/app/shared/ui/event-card/`.
2. Wejście komponentu: `input.required<EventDto>() event`, gdzie `EventDto` pochodzi z `libs/src/lib/shared-types.ts` (lub innego wspólnego typu domenowego).
3. Wyjście komponentu: `output<void>() detailsClicked` po kliknięciu przycisku.
4. Ikony kalendarza i lokalizacji → użycie `IconComponent` (`name="calendar"`, `name="location"`).
5. Layout i wygląd → Tailwind (`flex`, `gap`, `text-*`, `bg-*`, `rounded-*`, `shadow-*`).

### 11.3. Struktura komponentu (koncepcyjnie)

`event-card.component.ts` (koncepcja, bez pełnego kodu):

- standalone component z OnPush;
- importuje `IconComponent` z `core/icons` i wewnętrzny przycisk `UiButtonComponent` z `shared/ui`;
- definiuje:
  - `event = input.required<EventDto>();`
  - `detailsClicked = output<void>();`

`event-card.component.html` (Tailwind zamiast Bootstrapa, schematycznie):

```html
<article
  class="rounded-2xl bg-white shadow-sm border border-neutral-200 p-4 flex items-start justify-between gap-4"
>
  <div class="space-y-1 text-sm">
    <h2 class="text-base font-semibold text-neutral-900">{{ event().title }}</h2>

    <p class="flex items-center gap-1 text-xs text-neutral-500">
      <app-icon name="calendar" class="w-4 h-4 text-neutral-400" />
      <span>{{ event().date | date: 'dd.MM.yyyy, HH:mm' }}</span>
    </p>

    <p class="flex items-center gap-1 text-xs text-neutral-500">
      <app-icon name="location" class="w-4 h-4 text-neutral-400" />
      <span>{{ event().location }}</span>
    </p>
  </div>

  <app-ui-button variant="primary" size="sm" class="shrink-0" (clicked)="detailsClicked.emit()">
    Szczegóły
  </app-ui-button>
</article>
```

**Uwagi dla AI:**

- Klas `card`, `btn`, `text-muted`, `bi-*` nie wolno przenosić; zastępuj je odpowiednimi klasami Tailwind i `IconComponent`.
- Upewnij się, że całość wygląda dobrze na mobile (niewielki padding, czytelne fonty, brak przeładowania treścią).

---

## 12. Przykład mikro-migracji: sticky bottom navigation (Bootstrap → Tailwind)

### 12.1. Fragment z szablonu Bootstrap (źródło referencyjne)

Załóżmy, że w `.ignored/themplates/sticky-mobile-template/code/home.html` jest coś w tym stylu:

```html
<nav class="navbar navbar-light bg-light fixed-bottom border-top">
  <div class="container-fluid justify-content-around">
    <a href="#" class="text-center text-muted">
      <i class="bi bi-house"></i>
      <div class="small">Start</div>
    </a>
    <a href="#" class="text-center text-muted">
      <i class="bi bi-calendar-event"></i>
      <div class="small">Wydarzenia</div>
    </a>
    <a href="#" class="text-center text-muted">
      <i class="bi bi-person"></i>
      <div class="small">Profil</div>
    </a>
  </div>
</nav>
```

### 12.2. Docelowy komponent

AI powinien utworzyć komponent layoutu, np. `BottomNavComponent` w `frontend/src/app/layout/footer/` lub `frontend/src/app/layout/` (w zależności od przyjętej organizacji):

- komponent nie wie nic o Bootstrapi;
- przyjmuje listę pozycji nawigacji (np. `NavItem[]` z ikoną, ścieżką i labelką);
- wykorzystuje `RouterLink` i `RouterLinkActive` Angulara;
- ikony obsługuje `IconComponent`.

### 12.3. Struktura Tailwind (koncepcja)

```html
<nav
  class="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 backdrop-blur"
>
  <div class="mx-auto max-w-md px-4">
    <ul class="flex items-stretch justify-between py-2">
      @for (item of items(); track item.path) {
      <li class="flex-1">
        <a
          [routerLink]="item.path"
          routerLinkActive="text-primary-500"
          class="flex flex-col items-center justify-center gap-0.5 py-1 text-xs text-neutral-500"
        >
          <app-icon [name]="item.icon" class="w-5 h-5" />
          <span>{{ item.label }}</span>
        </a>
      </li>
      }
    </ul>
  </div>
</nav>
```

**Uwagi dla AI:**

- `fixed-bottom`, `navbar`, `container-fluid`, `text-muted`, `small` → zastąpione Tailwindem (`fixed inset-x-0 bottom-0`, `mx-auto max-w-md`, `text-neutral-500`, `text-xs`).
- Użyj nowej składni `@for` do renderowania elementów menu.
- Zadbaj o to, by bottom-nav nie nachodził na główną treść – w layoucie strony uwzględnij dodatkowy dolny padding (`pb-16` itp.).

---

## 13. Dalsze zalecenia dla AI przy rozbudowie przewodnika

Jeśli podczas migracji natrafisz na powtarzający się wzorzec Bootstrapa (np. badge’e, alerty, toasty, paski postępu):

1. Zidentyfikuj, czy to kandydat na headless komponent w `shared/ui`.
2. Zaprojektuj minimalne, ale rozsądne API (`[variant]`, `[size]`, `[intent]`, itp.).
3. Udokumentuj w kodzie (komentarz krótki + nazwa pliku/komponentu), że komponent jest odpowiednikiem konkretnego wzorca z szablonu.
4. **Nie próbuj** odwzorowywać 1:1 dokładnego wyglądu Bootstrapa – ważniejsza jest spójność z resztą designu Tailwind w projekcie niż wierność szablonowi.

---

## 14. Klasy CSS: zakaz przenoszenia "martwych" i bootstrapowych klas

Podczas migracji **NIE WOLNO** bezrefleksyjnie kopiować klas z pliku szablonu HTML (`.ignored/themplates/...`), jeśli:

- są to klasy Bootstrapa (`container`, `row`, `col-*`, `btn`, `btn-*`, `navbar`, `card`, `text-*`, `mt-*`, `mb-*`, itp.);
- są to klasy specyficzne dla szablonu (np. `header`, `header-logo-center`, `header-clear-small`, `footer-bar-1`, `spinner-border`, `color-highlight`, itp.), które **nie mają** odpowiednika / definicji w docelowym projekcie (`styles.scss`, lokalne `.scss`).

Zamiast tego **zawsze**:

1. **Używaj Tailwinda jako pierwszego wyboru**

   - layout, spacing, kolory, typografia, animacje – realizuj klasami Tailwind (`flex`, `grid`, `rounded-*`, `shadow-*`, `text-*`, `bg-*`, `animate-*`, itp.);
   - jeśli w szablonie występuje np. `class="header header-fixed header-logo-center"`, w Angularze zastąp to np. `class="fixed inset-x-0 top-0 z-50 bg-white/95 shadow-sm"`.

2. **Customowe klasy tylko wtedy, gdy są uzasadnione**

   - dopuszczalne jest wprowadzenie customowej klasy (np. `.app-shell`, `.page-content-shell`) **tylko wtedy**, gdy:
     - ma ona konkretną definicję w powiązanym pliku `.scss` danego komponentu **lub** w świadomie zarządzanym globalnym arkuszu (`styles.scss`), **i**
     - jest faktycznie używana w więcej niż jednym miejscu albo istotnie upraszcza kod;
   - nie wolno tworzyć klas, które nie mają żadnej definicji w CSS/SCSS – to są "martwe" klasy i należy je usunąć zamiast przenosić.

3. **Przy refaktorach istniejących komponentów**

   - jeżeli komponent posiada klasy pochodzące ze starego szablonu (np. `header-clear-small`, `footer-bar-1`, `spinner-border`), należy:
     - sprawdzić, czy mają definicję w CSS/SCSS;
     - jeżeli są powiązane tylko z oryginalnym szablonem i nie są potrzebne – przepisać zachowanie na Tailwind i klasę usunąć;
     - **nie dodawać nowych zależności** do tych starych klas.

4. **Priorytet: Tailwind → dopiero potem SCSS**
   - domyślnie całość wyglądu i layoutu budujemy Tailwindem w szablonie;
   - lokalny `.scss` używamy tylko dla:
     - złożonych przypadków nieosiągalnych wygodnie w Tailwind (np. specyficzne keyframes, niestandardowe maski, złożone transformacje),
     - globalnych helperów, które zostały zaakceptowane w projekcie;
   - jeśli jakaś klasa istnieje tylko po to, by trzymać prosty layout, powinna zostać zastąpiona Tailwindem i usunięta.

**Dla asystenta AI:** przy każdej migracji:

- nie kopiuj nazw klas ze szablonu "dla pewności";
- jeśli widzisz klasę, która nie jest Tailwindem, zadaj sobie pytanie:
  - _Czy ma definicję w naszym projekcie?_ Jeśli nie – **nie przenoś** jej;
  - _Czy rzeczywiście potrzebuję customowej klasy, czy wystarczy kilka klas Tailwind?_ – preferuj drugie;
- traktuj szablon jako referencję **wyglądu i struktury**, a nie jako źródło systemu klas.

---

```

```
