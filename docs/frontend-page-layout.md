# Frontend Page Layout

Ten dokument opisuje sposób działania globalnego layoutu stron na froncie, źródła konfiguracji oraz rekomendowany sposób użycia.

## Cel layoutu

`PageLayoutComponent` jest wspólnym kontenerem dla routowanych widoków i odpowiada za:

- renderowanie hero/headera strony
- renderowanie mini-baru po przewinięciu
- obsługę przycisku powrotu opartego o breadcrumb
- renderowanie opcjonalnych slotów layoutu
- zastosowanie wspólnego wrappera treści i stopki
- spójne sterowanie zachowaniem layoutu przez `route.data` oraz `LayoutConfigService`

Główne pliki źródłowe:

- `frontend/src/app/shared/layouts/page-layout/page-layout.component.ts`
- `frontend/src/app/shared/layouts/page-layout/page-layout.component.html`
- `frontend/src/app/shared/layouts/page-layout/layout-config.service.ts`
- `frontend/src/app/shared/layouts/page-layout/layout-slot.directive.ts`
- `frontend/src/app/app.routes.ts`

## Źródła prawdy i kolejność konfiguracji

Layout korzysta z dwóch kanałów konfiguracji.

### 1. `route.data`

To domyślny i preferowany sposób konfiguracji layoutu dla stron statycznych i prostych widoków.

Obsługiwane pola w `RouteLayoutData`:

- `showHeader?: boolean`
- `showFooter?: boolean`
- `showBorder?: boolean`
- `centerContent?: boolean`
- `fullscreenContent?: boolean`
- `contentClass?: string`
- `heroVariant?: 'compact' | 'extended' | 'only-mini-bar'`
- `title?: string`
- `subtitle?: string`
- `desktopLayout?: 'narrow' | 'wide' | 'two-column'` (RWD-15; domyślnie `narrow`)
- `asideSide?: 'left' | 'right'` (RWD-15; domyślnie `right`)

Przykład:

```ts
{
  path: 'faq',
  loadComponent: () =>
    import('./features/static/pages/faq/faq.component').then((m) => m.FaqComponent),
  data: {
    title: 'Baza Wiedzy',
    subtitle: 'Często zadawane pytania. Jeśli nie znajdziesz odpowiedzi, skontaktuj się z nami.',
    breadcrumb: BREADCRUMB_TO_HOME,
    showHeader: true,
  },
}
```

### 2. `LayoutConfigService`

To kanał dla konfiguracji dynamicznej i dla przypadków, których nie da się wygodnie opisać przez sam routing.

Serwis trzyma sygnały:

- `coverImageUrl`
- `heroVariant`
- `contentClass`
- `title`
- `subtitle`
- `subtitleTemplate`
- `stickyTemplate`
- `isReady`

Ten mechanizm jest używany np. wtedy, gdy:

- tytuł zależy od danych pobranych asynchronicznie
- hero ma dynamiczny cover image
- podtytuł ma być renderowany jako template, a nie zwykły string
- potrzebny jest dodatkowy slot sticky w headerze

## Jak działa przepływ danych

### Route data -> layout

`PageLayoutComponent` nasłuchuje zmian nawigacji i przy każdej zmianie aktywnej trasy:

- znajduje najgłębszą aktywną trasę
- scala jej `data` z wartościami domyślnymi `DEFAULT_ROUTE_DATA`
- synchronizuje część danych do `LayoutConfigService`

Obecnie synchronizowane z routingu są:

- `heroVariant`
- `title`
- `subtitle`

Dzięki temu proste strony nie muszą imperatywnie ustawiać layoutu w komponencie.

### Reset przy nawigacji

Przy `NavigationStart` layout wykonuje `layoutConfig.reset()`, aby nie przenosić stanu hero między stronami.

Reset czyści:

- cover image
- hero variant
- content class
- title
- subtitle
- subtitleTemplate
- stickyTemplate

Po zakończeniu nawigacji layout oznacza się jako gotowy przez `markReady()`.

## Warianty hero

Layout wspiera trzy warianty hero:

- `compact`
- `extended`
- `only-mini-bar`

### `compact`

Domyślny wariant.

Charakterystyka:

- prostszy header
- fallbackowe tło
- treść hero wyśrodkowana
- dobry dla stron statycznych, formularzy i widoków pomocniczych

### `extended`

Wariant rozszerzony.

Charakterystyka:

- może wyświetlać cover image
- nakłada gradient
- lepiej pasuje do ekranów wydarzeń i widoków z bardziej wizualnym hero

Jeśli obraz okładki nie istnieje lub nie załaduje się poprawnie, layout użyje fallbackowego tła.

### `only-mini-bar`

Wariant minimalny - tylko wąski pasek nawigacyjny na górze.

Charakterystyka:

- pomija pełny hero i sentinel
- content dostaje `margin-top: var(--hero-mini-bar-h)` aby nie nachodzić na fixed mini-bar
- stosowany głównie z `fullscreenContent: true` (mapa, czat)
- wyświetla skrócony tytuł i podtytuł

## Header, mini-bar i scroll

Jeśli `showHeader === true`, layout renderuje hero oraz obserwuje sentinel przez `IntersectionObserver`.

Zachowanie:

- gdy hero jest widoczne, pokazywany jest pełny header
- po przewinięciu hero poza próg, layout przełącza się na mini-bar
- mini-bar wyświetla skróconą wersję tytułu i podtytułu

To zachowanie jest zarządzane przez sygnał `heroHidden`.

## Kiedy renderowany jest tytuł i podtytuł

### Tytuł

Tytuł jest widoczny, gdy `layoutConfig.title()` nie jest pusty.

### Podtytuł

Podtytuł jest widoczny, gdy spełniony jest jeden z warunków:

- istnieje `layoutConfig.subtitleTemplate()`
- istnieje niepusty `layoutConfig.subtitle()`

Priorytet renderowania jest następujący:

1. `subtitleTemplate`
2. `subtitle`

Oznacza to, że template może nadpisać prosty tekst.

## Sloty layoutu

Layout wspiera trzy sloty definiowane przez `LayoutSlotDirective`.

### `appLayoutSlot="subtitleTemplate"`

Służy do renderowania bogatszej zawartości pod tytułem, np.:

- badge'y
- tagi dyscypliny i poziomu
- własny markup
- bardziej złożony układ niż zwykły tekst

Przykład:

```html
<ng-template appLayoutSlot="subtitleTemplate">
  <div class="flex flex-wrap gap-1.5">
    <span
      class="rounded-sm bg-primary-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
    >
      Piłka nożna
    </span>
    <span
      class="rounded-sm bg-warning-300 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
    >
      Średniozaawansowany
    </span>
  </div>
</ng-template>
```

### `appLayoutSlot="stickyTemplate"`

Służy do renderowania elementu przypiętego w prawym górnym rogu headera, np. badge'a daty wydarzenia.

Przykład:

```html
<ng-template appLayoutSlot="stickyTemplate">
  <app-date-badge [month]="eventMonth()" [day]="eventDay()" [time]="eventStartTime()" />
</ng-template>
```

### `appLayoutSlot="aside"`

Slot kolumny aside w trybie dwukolumnowym (RWD-15). Renderowany przez page-layout w kolumnie
aside, gdy aktywny widok ma `desktopLayout: 'two-column'`. Widoczny dopiero od `lg`.

Kluczowa właściwość: jak pozostałe sloty, `asideTemplate` **nie jest czyszczony** przez
`LayoutConfigService.reset()` — jest zarządzany przez cykl życia `LayoutSlotDirective`. Dzięki temu
shell-rodzic (np. `EventAreaComponent`), który przeżywa nawigację między trasami-dziećmi, może
zarejestrować trwały rail raz, a ten pozostaje spójny między podstronami strefy.

```html
<ng-template appLayoutSlot="aside">
  <app-event-nav-rail />
</ng-template>
```

## Kiedy używać `route.data`, a kiedy `LayoutConfigService`

### Użyj `route.data`, gdy

- strona ma statyczny tytuł
- strona ma prosty tekst pod tytułem
- wystarczy zadeklarować wariant hero i podstawowe flagi layoutu
- konfiguracja nie zależy od danych pobieranych w runtime

To jest preferowana ścieżka dla:

- stron statycznych
- prostych ekranów formularzy
- ekranów pomocniczych

### Użyj `LayoutConfigService`, gdy

- tytuł lub cover zależy od danych API / resolvera / inputów
- musisz ustawić layout po obliczeniach w komponencie
- potrzebujesz template podtytułu zamiast zwykłego stringa
- potrzebujesz slotu sticky

To jest preferowana ścieżka dla:

- ekranów wydarzeń
- dynamicznych widoków per miasto
- złożonych hero z dodatkowymi elementami UI

## Rekomendowane wzorce użycia

### 1. Prosta strona statyczna

Konfiguruj layout wyłącznie przez routing.

```ts
data: {
  title: 'Regulamin Serwisu',
  subtitle: 'Zasady korzystania z platformy. Poznaj swoje prawa i obowiązki.',
  showHeader: true,
  breadcrumb: BREADCRUMB_TO_HOME,
}
```

Komponent strony nie musi wtedy dotykać `LayoutConfigService`.

### 2. Dynamiczny tytuł i cover image

Gdy dane pochodzą z modelu lub API, ustawiaj je imperatywnie w komponencie.

```ts
effect(() => {
  const event = this.event();
  this.layoutConfig.title.set(event?.title || '');
  if (event?.coverImage?.filename) {
    this.layoutConfig.coverImageUrl.set(coverImageUrl(event.coverImage.filename));
  }
});
```

### 3. Złożony podtytuł

Jeśli pod tytułem ma być coś więcej niż tekst, użyj slotu `subtitleTemplate`.

```html
<ng-template appLayoutSlot="subtitleTemplate">
  <div class="flex flex-wrap gap-2">
    <span
      class="rounded-sm bg-primary-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
    >
      Turniej
    </span>
    <span class="rounded-sm bg-black/20 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
      Hala sportowa
    </span>
  </div>
</ng-template>
```

## Opis najważniejszych flag layoutu

### `showHeader`

Włącza hero i mini-bar.

### `showFooter`

Decyduje, czy layout ma wyrenderować `<app-footer />`.

### `showBorder`

Steruje obramowaniem i cieniem wrappera treści.

### `centerContent`

Centruje główną treść strony wewnątrz layoutu.

Może być używany samodzielnie lub razem z `fullscreenContent: true`.

**Bez `fullscreenContent`:**

- wrapper treści dostaje `flex flex-1 items-center justify-center`
- inner wrapper dostaje `overflow-visible w-full`
- content jest centrowany pionowo i poziomo w dostępnej przestrzeni

**Razem z `fullscreenContent: true` (tryb fullscreen + centered):**

- wrapper dostaje `items-center justify-center` na istniejącym flex chain
- inner wrapper NIE dostaje `flex-1 min-h-0` - treść ma naturalny rozmiar i jest centrowana przez wrapper
- użyteczne dla widoków, które ZAWSZE pokazują wycentrowaną treść (np. strona błędu, strona wyłączonej funkcji) w trybie fullscreen

**Ważne:** Gdy komponent w trybie fullscreen przełącza się między trybem "wypełnij ekran" a "wycentrowany stan pusty", centrowanie należy obsłużyć wewnątrz samego komponentu (przez `flex flex-1 items-center justify-center` na divie stanu pustego), a nie przez `centerContent` w route data. Przykładem prawidłowego wzorca jest `ChatViewComponent`.

### `fullscreenContent`

Włącza tryb fullscreen - content wypełnia dokładnie dostępną przestrzeń viewportu bez scrollbara.

Kiedy `fullscreenContent === true`:

- outer wrapper dostaje `overflow-hidden` (zapobiega scrollbarowi)
- content wrapper i inner wrapper używają `flex-1 min-h-0 flex flex-col` (pełny flex chain)
- brak zaokrąglonych rogów, bordera, drag handle'a i notification alert'a
- child components (np. mapa, czat) wypełniają dostępną przestrzeń przez `flex-1 min-h-0`

Stosowany razem z:

- `heroVariant: 'only-mini-bar'` - minimalny header
- `showFooter: false` - bez stopki
- Komponenty child muszą mieć `host: { class: 'flex flex-col flex-1 min-h-0' }` aby prawidłowo uczestniczyć w flex chain
- jeśli fullscreenowy ekran ma stan pusty lub access denied i komponent przełącza się między trybami, centrowanie stanu pustego należy zrobić lokalnie w komponencie przez `flex flex-1 items-center justify-center` (wzorzec: `ChatViewComponent`)
- można połączyć z `centerContent: true` dla widoków, które ZAWSZE pokazują wycentrowaną treść w fullscreenie - w tym trybie nie używaj `flex-1` w host komponentu, bo inner wrapper nie ma już flex-1

Przykład konfiguracji:

```ts
data: {
  showHeader: true,
  heroVariant: 'only-mini-bar',
  showFooter: false,
  fullscreenContent: true,
  contentClass: 'bg-white',
}
```

Strony używające tego trybu:

- `/w/:citySlug/:id/map` - mapa wydarzenia
- `/w/:citySlug/:id/chat` - czat grupowy
- `/w/:citySlug/:id/host-chat` - czat z organizatorem
- `/w/:citySlug/:id/host-chat/:userId` - prywatna konwersacja organizatora

### `contentClass`

Pozwala nadpisać klasy wrappera treści, np. tło.

### `heroVariant`

Wybiera wariant hero: `compact`, `extended` lub `only-mini-bar`.

## Strategia szerokości shella (RWD-11b)

Globalny shell (`.app` / `.app-container` w `frontend/src/styles.scss`) ma **kolumnę główną + boxed look**.

Token (CSS var w `styles.scss`):

- `--app-max-width` (Tailwind `max-w-app`) — szerokość **kolumny głównej** oraz punkt wyrównania elementów `fixed` (bottom-nav, hero, back/sticky, overlaye, modale). **Wartość `700px`** = natywna szerokość cover image (`COVER_IMAGE_WIDTH` w `libs`), więc hero renderuje okładkę 1:1 (bez upscalingu/blura).

**Boxed look** (`.app-container`):

- **mobile / poniżej 700px** — full-bleed: kontener wypełnia ekran, pattern ukryty, brak ramki.
- **od 700px (`@media (min-width: $app-max-width)`)** — wyśrodkowana karta: `max-width` = kolumna główna, `border-radius`, boczne cienie, a w marginesach widoczny `app-bg-pattern` (obrócony, kafelkowany sport-pattern). Próg = szerokość boxa (gdy viewport ją przekroczy), nie arbitralny breakpoint.

Treść wewnątrz kontenera jest wyśrodkowaną kolumną `max-w-app` (700) — page-layout owija ją w `mx-auto w-full max-w-app`.

### Druga kolumna (aside) — tryb dwukolumnowy (RWD-15)

Wzorzec **main (700) + aside** aktywowany od `lg`. Widok deklaruje go przez `route.data`:
`desktopLayout: 'two-column'` (+ opcjonalnie `asideSide: 'left' | 'right'`, domyślnie `right`) oraz
dostarcza zawartość aside przez slot `appLayoutSlot="aside"`. Aside renderuje się tylko, gdy
**oba** warunki są spełnione (`desktopLayout === 'two-column'` i jest zarejestrowany `asideTemplate`).

Tokeny szerokości (`styles.scss`):

- `--app-max-width` (`max-w-app`, 700px) — kolumna główna (natywna szerokość cover image).
- `--app-box-width` (`max-w-box`) — szerokość CAŁEGO boxa. Domyślnie = kolumna główna; klasa
  `.app--two-column` na `.app` (bind w `app.html` z `LayoutConfigService.desktopLayout()`) poszerza ją
  **od `lg`** do `$app-box-wide` (1024px).
- `--app-aside-width` (`w-aside`) = `box − 2×padding − main − gap` (≈ 288px dla 1024 − 24 − 700 − 12).
- Grid: `grid-cols-main-aside` / `grid-cols-aside-main` (Tailwind, zależnie od `asideSide`).

Spacing modułów (desktop, tryb 2-kol): grid ma `lg:p-3` (inset od krawędzi boxa) + `lg:gap-3`
(odstęp między main a aside), a kolumna główna `lg:gap-3` (hero ↔ karta treści). Dzięki temu główne
moduły (hero/cover, treść, aside) tworzą kafelki w szarym boxie — nie stykają się z krawędziami i mają
równy odstęp. Wartości są jednolite (`0.75rem`) i sterowane z jednego miejsca (klasy w page-layout),
a `--app-aside-width` uwzględnia padding, by uniknąć poziomego scrolla.

Przełączanie 1↔2 kolumny jest **CSS-first** (`lg:`), a `desktopLayout` pochodzi z `route.data`
(spójne SSR↔klient) — dzięki temu nie ma rozjazdów hydration. Poniżej `lg` widok 2-kol degraduje się
do pojedynczej wąskiej kolumny (jak dotychczas).

**Sticky aside (od `lg`):** kolumna aside jest `lg:sticky` (`top-app-inset` = pod top-navem + inset
boxa) — zostaje w miejscu, gdy main-column się scrolluje. Aby `position: sticky` liczył się względem
viewportu (a nie boxa, który scrolluje z body), dla `.app--two-column` na `lg` box ma `overflow: clip`
zamiast `hidden` (clip nadal przycina, ale nie tworzy scroll-containera). Zakres ograniczony do
widoków 2-kol; pozostałe zostają na `overflow: hidden`.

**Statyczne hero w trybie 2-kol (pkt 13 audytu):** od `lg` zamiast `fixed` hero + mini-bar
renderowane jest **statyczne** hero w kolumnie głównej (scrolluje się z treścią). Fixed hero/sentinel/
mini-bar są na `lg` ukrywane (`lg:hidden`) dla widoków 2-kol; poniżej `lg` działają jak dotąd.

**Wspólne komponenty aside** (spójny wygląd wszystkich raili/paneli bocznych):

- `app-aside-panel` (`shared/ui/aside/aside-panel.component.ts`) — jednolite chrome „kafelka" aside
  (tło, ramka, zaokrąglenie, cień, padding) + opcjonalny `heading`. Owija DOWOLNĄ zawartość aside —
  nie tylko nawigację (także CTA, statystyki itp.).
- `app-aside-nav` (`shared/ui/aside/aside-nav.component.ts`) — jednolita lista nawigacyjna
  (`items: AsideNavItem[]` + output `selected`), wspólne style pozycji i stanu aktywnego, opcjonalny
  `badge`. Logikę nawigacji/`active` trzyma rail-właściciel.

Każdy rail buduje się na tych dwóch komponentach (`app-event-nav-rail`, `app-account-nav-rail`
i kolejne), więc pozostają spójne wizualnie i łatwo rozszerzalne.

Konsumenci aside:

- **Strefa wydarzenia (RWD-15):** `EventAreaComponent` rejestruje trwały `app-event-nav-rail`
  (CTA „Dołącz" + zakładki: Szczegóły / Uczestnicy / Mapa / Czat grupowy / Czat z organizatorem +
  akcje organizatora). Tryb 2-kol per-trasa-dziecko (`desktopLayout: 'two-column'` na Szczegółach;
  kolejne dzieci przyrostowo — czaty w RWD-19).
- **Panel konta (RWD-16/17/18):** wspólny model `AccountNavService`
  (`shared/ui/account-nav-rail/account-nav.service.ts`) — sekcje **Konto** (Profil, Powiadomienia),
  **Uczestnik** (Uczestnictwa, Galeria, Płatności, Vouchery), **Organizator** (Nowe wydarzenie,
  Moje wydarzenia, Zestawienie, Okładki, Ustawienia) + `activeKey`/`navigate`. Dwie prezentacje:
  **desktop** `app-account-nav-rail` (aside) oraz **mobile** `app-account-nav-bar`. Oba dostarcza na
  stronie JEDEN wrapper `app-account-rail-slot` (rail w aside dla `lg+` + pasek inline `lg:hidden` nad
  treścią). `app-account-nav-bar` to wzorzec „priority+ / overflow": wyśrodkowane, ścieśnione „pills"
  bez przewijania — ile zmieści się w jednej linii; resztę chowa pod kebabem „⋮" (`more-horizontal`),
  a aktualnie wybrana pozycja jest ZAWSZE na pasku (szerokości mierzone „ghostem" + ResizeObserver).
  Mobilny `navigation-overlay` (z dolnej nawigacji) zostaje przy linkach ogólnych + profil/powiadomienia/
  wyloguj (`NavMenuService.links`) — nawigacji panelu NIE powielamy tam.
  Zastąpił wcześniejszy `organizer-nav-rail`. Strona panelu dodaje `<app-account-rail-slot />`
  (+ `desktopLayout: 'two-column'`): profil, `EventFormComponent` (new/edit/edit-template),
  `series-details`, `event-manage`, `organizer-digest` oraz podstrony (participations, payments,
  vouchers, media, notifications, cover-images, settings, /profile/events). Treść głównej kolumny
  zostaje jednokolumnowa (700). Na profilu kafelki nawigacyjne usunięto — zastępuje je rail (desktop)
  i menu inline (mobile).

  **Stabilność przy nawigacji (bez migania nav-a):**
  - `LayoutConfigService.reset()` NIE zeruje `desktopLayout`/`asideSide`/`heroVariant`/`title`/
    `subtitle`/`coverImageUrl` (ustawia je synchronizacja z `route.data` na `NavigationEnd` + efekty
    stron). Dzięki temu box trzyma szerokość (brak „skoku" 1024→700→1024), a shell jest stabilny.
  - `PageLayoutComponent` pokazuje pełny preloader tylko na pierwszym wejściu LUB gdy nawigacja
    przeciąga się > ~200ms (`showFullPreloader` z debouncem). Dla szybkich (cache) nawigacji shell
    NIE znika — kolumna aside (rail) i pasek nav nie „migają", podmienia się tylko main-column.

Pozostałe widoki to nadal pojedyncza kolumna 700 w boxie (`desktopLayout: 'narrow'`). Wariant
`'wide'` (pojedyncza kolumna na pełną szerokość boxa) jest zadeklarowany w typie, ale nie ma jeszcze
dedykowanego renderowania — do wdrożenia, gdy pojawi się pierwszy widok pełnoszerokościowy.

### Nawigacja: bottom-nav vs top-nav (RWD-12)

Poniżej `lg` (1024px) globalną nawigacją jest mobilny `app-bottom-nav` (fixed dół). Od `lg` jest on ukrywany (`lg:hidden`), a jego rolę przejmuje desktopowy `app-top-nav` (fixed góra) — te same akcje (miasto, udostępnij, menu użytkownika) przez współdzielone serwisy (`NavMenuService`, `CityContextService`, `BottomOverlaysService`).

Sterują tym dwie CSS vars w `styles.scss`, przełączane jednym media query, którego próg pochodzi wprost z konfiguracji Tailwinda — `@media (min-width: theme('screens.lg'))` (Sass przepuszcza `theme()`, a `@tailwindcss/postcss` rozwiązuje je do wartości `screens.lg`):

- `--top-nav-h` — wysokość górnego top-navu: `0` na mobile → `3.5rem` na `lg`. `.app-container` rezerwuje na nią `padding-top`.
- `--footer-height` — wysokość/clearance dolnego bottom-navu: `70px` na mobile → `0` na `lg`. Dzięki temu dolne elementy `fixed` automatycznie przestają rezerwować miejsce na bottom-nav na desktopie.

Elementy `fixed` zakotwiczają się do tych zmiennych przez dwa utility z `@layer utilities` (`styles.scss`), zamiast powtarzać `top-[var(--top-nav-h)]` / `bottom-[var(--footer-height)]`:

- `top-app` → `top: var(--top-nav-h)` — górna krawędź tuż pod top-navem (hero, back/sticky, snackbar, nagłówek czatu).
- `bottom-app` → `bottom: var(--footer-height)` — dolna krawędź tuż nad bottom-navem (chat input, sticky bar, cookie consent).

Dodatkowe odstępy (gap, safe-area, mini-bar) dokłada się standardowymi `mt-*` / `mb-*` — np. `top-app mt-2`, `bottom-app mb-[env(safe-area-inset-bottom)]`. Dla elementu `fixed` `top`/`bottom` pozycjonuje krawędź marginesu, więc `mt-*`/`mb-*` przesuwają widoczny box dokładnie jak wcześniejszy `calc(...)`.

## Breadcrumb i back button

Layout sam nie buduje breadcrumbów, ale korzysta z `BreadcrumbService`.

Przycisk powrotu pojawia się tylko wtedy, gdy:

- `breadcrumb.parentUrl()` zwraca wartość

Etykieta w hoverze przycisku powrotu pochodzi z:

- `breadcrumb.parentLabel()`

## Notification overlay

`PageLayoutComponent` renderuje globalnie:

- `app-notification-alert`
- `app-notification-overlay`

Dzięki temu elementy powiadomień są osadzone na poziomie layoutu, a nie pojedynczych stron.

## Ograniczenia i ważne uwagi

- `route.data` nie przeniesie `TemplateRef`, dlatego tekst i template są utrzymywane osobno
- `LayoutConfigService.reset()` czyści stan przy każdej nawigacji, więc komponenty dynamiczne powinny ustawiać potrzebne wartości po wejściu na ekran
- jeśli kilka komponentów jednocześnie modyfikuje layout, ostatni zapis wygrywa

## Dobre praktyki

- preferuj `route.data` dla prostych stron
- używaj `LayoutConfigService` tylko tam, gdzie konfiguracja naprawdę jest dynamiczna
- używaj `subtitle` dla prostego tekstu pod nagłówkiem
- używaj `appLayoutSlot="subtitleTemplate"` tylko dla bogatszej zawartości
- trzymaj logikę ustawiania layoutu blisko komponentu, który jest właścicielem danych
- nie mieszaj wielu niezależnych źródeł ustawiających ten sam fragment layoutu, jeśli nie jest to konieczne

## Checklist przy dodawaniu nowej strony

1. Zdecyduj, czy strona potrzebuje headera
2. Jeśli tak, ustaw `showHeader` w route data
3. Dla prostego hero ustaw `title` i opcjonalnie `subtitle` w route data
4. Jeśli hero jest dynamiczne, ustaw `title` i inne pola przez `LayoutConfigService`
5. Jeśli potrzebujesz bogatszego podtytułu, użyj `appLayoutSlot="subtitleTemplate"`
6. Jeśli potrzebujesz elementu przypiętego w headerze, użyj `appLayoutSlot="stickyTemplate"`
7. Jeśli strona nie powinna dziedziczyć stopki lub bordera, jawnie ustaw `showFooter` / `showBorder`
8. Jeśli strona ma wypełniać cały viewport bez scrollbara (mapa, czat), ustaw `fullscreenContent: true` + `heroVariant: 'only-mini-bar'` + `showFooter: false` i dodaj `host: { class: 'flex flex-col flex-1 min-h-0' }` w komponencie strony

## Przykłady z projektu

### Strony statyczne

Konfiguracja głównie przez `app.routes.ts`:

- `faq`
- `join-us`
- `contact`
- `privacy`
- `terms`

### Ekrany dynamiczne

Konfiguracja przez `LayoutConfigService` i sloty:

- `features/events/pages/events/events.component.ts`
- `features/event/ui/event-hero-slots/event-hero-slots.component.ts`

### Ekrany fullscreen

Konfiguracja przez `fullscreenContent: true` w route data:

- `features/event/pages/event-map/event-map.component.ts` - mapa
- `features/chat/pages/unified-chat/unified-chat.component.ts` - czat grupowy i prywatny
- `features/chat/pages/host-chat/host-chat.component.ts` - czat z organizatorem
