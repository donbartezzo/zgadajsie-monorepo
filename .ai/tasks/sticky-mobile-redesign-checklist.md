# StickyMobile Redesign – Checklist

## Faza 0 – Decyzje architektoniczne

- [x] 0.1 Zdecydować o docelowym UI stacku (StickyMobile + Bootstrap 5 + SCSS szablonu jako główny design system).
- [x] 0.2 Zaplanować wygaszanie Angular Material, Tailwind CSS i Elementar UI (decyzja: pełne usunięcie tych technologii z projektu).
- [x] 0.3 Potwierdzić, że backend (NestJS + Prisma + Zod + Swagger + Web Push/FCM) pozostaje bez zmian i redesign dotyczy głównie frontendu.

## Faza 1 – Włączenie szablonu do projektu Angular

- [x] 1.1 Skopiować assety StickyMobile do frontendu:
  - [x] 1.1.1 Skopiować katalogi `images`, `fonts`, `fonts5`, `styles/highlights`, `plugins` z `/.ignored/themplates/sticky-mobile-template/code` do `frontend/public` lub `frontend/src/assets` (wybór: `frontend/public`).
- [x] 1.2 Zintegrować SCSS szablonu z Angular CLI:
  - [x] 1.2.1 Zmienić `src/styles.css` na `src/styles.scss` i zaktualizować referencję w `frontend/angular.json` (`options.styles`).
  - [x] 1.2.2 Zaimportować w `styles.scss` pliki `scss/bootstrap.scss` i `scss/style.scss` z szablonu (dodatkowo, na czas MVP, CSS ładowany jest też bezpośrednio z `public/styles/*.css`).
  - [x] 1.2.3 Tymczasowo pozostawić lub wyłączyć style Tailwind / Elementar / Material w globalnych stylach (Tailwind/Material nie są już używane w komponentach home/events, zostaną całkowicie usunięte w Fazie 9).
- [x] 1.3 Włączyć skrypty globalne (tymczasowo):
  - [x] 1.3.1 Dodać `scripts/bootstrap.min.js` i `scripts/custom.js` szablonu do sekcji `scripts` w `frontend/angular.json` (build + test).
  - [x] 1.3.2 Zweryfikować, że app się buduje i startuje z nowymi assetami (frontend działa z podpiętymi skryptami StickyMobile).

## Faza 2 – Shell i struktura strony zgodna z dokumentacją StickyMobile

- [x] 2.1 Zbudować główny shell Angulara według struktury `_starter.html`:
  - [x] 2.1.1 Utworzyć komponent `AppShellComponent` odwzorowujący strukturę:
    - preloader (poza `#page`),
    - `div#page` z headerem, footerem,
    - `div.page-content.header-clear-*` zawierający `router-outlet`,
    - off-canvas (menu, snackbary, toasty, PWA install) poza `page-content`.
    
    _ZREALIZOWANE: struktura shella została zaimplementowana bezpośrednio w komponencie root `App` jako standalone component._
  - [x] 2.1.2 Wpiąć `AppShellComponent` jako główny layout w `AppComponent` / routing (np. `AppComponent` tylko z `<app-shell></app-shell>`).
    
    _ZREALIZOWANE: root `App` pełni rolę shella, w środku posiada `router-outlet` oraz header/footer StickyMobile._
- [ ] 2.2 Wydzielić layoutowe komponenty wspólne:
  - [ ] 2.2.1 `HeaderComponent` z wariantami z dokumentacji (`header-logo-left/right/center/app`).
  - [ ] 2.2.2 `FooterComponent` z wariantami `footer-bar-*` (flexowy bottom nav).
  - [ ] 2.2.3 `PreloaderComponent` zgodnie z opisem (jedyny element poza `#page`).
- [ ] 2.3 Utworzyć moduł layoutu (np. `ShellModule`) i udostępnić komponenty layoutowe innym modułom.

## Faza 3 – Body, motyw, kolory, highlighty

- [x] 3.1 Utworzyć `ThemeService` do zarządzania `<body>`:
  - [x] 3.1.1 Dodawać/usuwać klasy `theme-light`, `theme-dark`, `detect-theme` na `<body>`.
  - [x] 3.1.2 Ustawiać atrybuty `data-background` i `data-highlight` zgodnie z dokumentacją (np. `mint`, `red2`, `blue` itd.).
- [x] 3.2 Obsłużyć highlight CSS:
  - [x] 3.2.1 Wstawić do `index.html` `<link rel="stylesheet" class="page-highlight" href="styles/highlights/highlight_blue.css">` (domyślny kolor).
  - [x] 3.2.2 Dodać w `ThemeService` logikę podmiany `href` tego linka (zmiana motywu kolorystycznego przez `setHighlight`).
- [ ] 3.3 Udostępnić w UI (komponent/ustawienia) możliwość zmiany motywu (jasny/ciemny/auto + highlight).
  - _Częściowo: UI ma przełącznik jasny/ciemny w headerze; wybór highlightów i trybu "detect" będzie dodany później._

## Faza 4 – Projekt modułów i routingu Angulara pod strony szablonu

- [ ] 4.1 Zaprojektować mapowanie plików HTML StickyMobile → moduły Angular:
  - [ ] 4.1.1 Pogrupować strony w domeny: np. `Delivery`, `Food`, `Store`, `Tasks`, `Events`, `Travel`, `Finance`, `Profile` itd.
  - [ ] 4.1.2 Dla każdej domeny zdefiniować docelowy `FeatureModule` (lazy loaded) i listę ekranów (home, listing, detail, dashboard, settings).
- [ ] 4.2 Skonfigurować `AppRoutingModule`:
  - [ ] 4.2.1 Dodać lazy-loaded ścieżki do poszczególnych modułów StickyMobile.
  - [ ] 4.2.2 Zaplanować migrację istniejących routów na nowe (zachować stare za feature-flagą lub inną ścieżką na czas migracji).

## Faza 5 – Konwersja HTML → komponenty Angular (MVP ścieżki)

- [ ] 5.1 Wybrać MVP ścieżki biznesowe do pierwszej migracji (np. onboarding + jeden główny flow: Delivery/Food/Tasks).
- [ ] 5.2 Dla każdego wybranego ekranu StickyMobile:
  - [ ] 5.2.1 Skopiować markup z odpowiedniego pliku `*.html` do `*.component.html` w module Angulara.
  - [ ] 5.2.2 Usunąć inline `<script>` i logikę zależną bezpośrednio od DOM/globalnego JS.
  - [ ] 5.2.3 Zamienić statyczne dane na bindingi Angulara (`*ngFor`, `*ngIf`, `[class.active]` itd.).
  - [ ] 5.2.4 Przepisać formularze na Reactive Forms (`FormGroup`, `FormControl`, walidacja z Zod / Angular Validators).
- [ ] 5.3 Wydzielić powtarzalne elementy do `shared/ui`:
  - [ ] 5.3.1 Komponenty kart, list, nagłówków sekcji, „hero” bloków.
  - [ ] 5.3.2 Ustalić konwencję nazewniczą i strukturę katalogów (np. `frontend/src/app/shared/ui/*`).

## Faza 6 – System menu, off-canvas, snackbary, toasty

- [ ] 6.1 Owinąć API menu StickyMobile w Angular:
  - [ ] 6.1.1 Utworzyć `MenuService` (Angular) wywołujący globalne `menu(id, 'show'|'hide', delay)` z `custom.js` lub przenoszący tę funkcję do TS.
  - [ ] 6.1.2 Zapewnić typowane metody `open/close` i ewentualnie `toggle`.
- [ ] 6.2 Dyrektywy do triggerowania menu:
  - [ ] 6.2.1 `[appMenuTrigger]="menuId"` – zastępujące atrybut `data-menu="MENU_ID"` z dokumentacji.
  - [ ] 6.2.2 `appCloseMenu` – odpowiednik klasy `close-menu` (zamyka bieżące menu).
- [ ] 6.3 Umieścić wszystkie `div.menu ...` (off-canvas) poza `page-content` w `OffcanvasContainerComponent` zgodnie z dokumentacją.

## Faza 7 – PWA: manifest, service worker, PWA install boxy

- [ ] 7.1 Manifest PWA:
  - [ ] 7.1.1 Przenieść `_manifest.json` szablonu do `frontend/public/manifest.webmanifest`.
  - [ ] 7.1.2 Ustawić poprawne `scope`, `start_url`, `name`, `short_name`, `icons` dla docelowej domeny.
- [ ] 7.2 Service Worker – wybór strategii:
  - [ ] 7.2.1 Podjąć decyzję: używamy Angular Service Worker (`@angular/pwa`) jako głównego, czy zostajemy przy `/_service-worker.js` z szablonu.
  - [ ] 7.2.2 Jeśli wybór pada na Angular SW: odwzorować w `ngsw-config.json` zachowania cache z dokumentacji StickyMobile (w tym obejście cache na iOS, jeśli potrzebne).
  - [ ] 7.2.3 Jeśli wybór pada na custom SW z szablonu: wyłączyć Angular SW i zadbać o poprawną rejestrację `pwaScope` i `pwaLocation` (zgodnie z dokumentacją).
- [ ] 7.3 Komponenty PWA install:
  - [ ] 7.3.1 Utworzyć komponenty `PwaInstallAndroidComponent` i `PwaInstallIosComponent` odwzorowujące `menu-install-pwa-android` i `menu-install-pwa-ios`.
  - [ ] 7.3.2 Zintegrować je z realnym `beforeinstallprompt` / eventami SW (pokazywanie tylko gdy spełnione warunki PWA).

## Faza 8 – Integracja z backendem i shared models (Zod)

- [ ] 8.1 Dla kluczowych domen (np. użytkownicy, zamówienia, tasks, events, store):
  - [ ] 8.1.1 Zdefiniować schematy Zod w `libs/shared`.
  - [ ] 8.1.2 Wygenerować / współdzielić typy między NestJS a Angular (TS-first).
- [ ] 8.2 Serwisy Angular:
  - [ ] 8.2.1 Utworzyć `DeliveryService`, `StoreService`, `TasksService`, `EventsService` itd. korzystające z API Nest (na podstawie Swagger / OpenAPI).
  - [ ] 8.2.2 Zastosować RxJS (observables) do zasilania widoków kart/list w oparciu o layout szablonu.

## Faza 9 – Wygaszanie starego UI (Material, Tailwind, Elementar)

- [ ] 9.1 Dla każdej funkcji / modułu:
  - [ ] 9.1.1 Gdy nowy moduł StickyMobile pokrywa funkcjonalność, przekierować stare route’y Angulara do nowego modułu.
  - [ ] 9.1.2 (Opcjonalnie) trzymać starą wersję za feature-flagą / alternatywną ścieżką do czasu pełnego rollout’u.
- [ ] 9.2 Po zakończeniu migracji modułów:
  - [ ] 9.2.1 Usunąć nieużywane komponenty Angular Material, Elementar UI i style Tailwind z kodu.
  - [ ] 9.2.2 Wyczyścić `package.json` z bibliotek UI, które nie są już używane.
  - [ ] 9.2.3 Usunąć konfigurację Tailwind / PostCSS, jeśli nie jest już potrzebna.
- [ ] 9.3 Zaktualizować dokumentację:
  - [ ] 9.3.1 Uaktualnić `docs/tech-stack.md` – sekcja UI: opisać StickyMobile + Bootstrap + SCSS jako główny design system.

## Faza 10 – Testy i rollout

- [ ] 10.1 Testy jednostkowe (Jest):
  - [ ] 10.1.1 Dodać testy dla krytycznych komponentów (auth, checkout, główne dashboardy, listy z interakcjami).
- [ ] 10.2 Testy e2e (Playwright):
  - [ ] 10.2.1 Zdefiniować scenariusze dla kluczowych ścieżek biznesowych w nowym UI (web + mobile viewport).
  - [ ] 10.2.2 Dodać scenariusze PWA (install prompt, offline, odświeżanie cache).
- [ ] 10.3 Rollout:
  - [ ] 10.3.1 (Opcjonalnie) udostępnić nowy UI pod `/beta` lub za feature-flagą.
  - [ ] 10.3.2 Po pozytywnych testach przełączyć główne route’y na nowy UI.
  - [ ] 10.3.3 Monitorować błędy, performance i feedback użytkowników po wdrożeniu.
