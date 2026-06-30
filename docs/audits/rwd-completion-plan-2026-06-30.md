# Plan dokończenia RWD — Zgadaj się — 2026-06-30

Dokument-następca [`rwd-audit-2026-06-25.md`](./rwd-audit-2026-06-25.md). Audyt opisywał stan
sprzed prac; ten plik opisuje **co realnie zostało** po ~20 zrealizowanych taskach RWD i co trzeba
jeszcze zrobić, by każda podstrona miała poprawny tryb kolumny i dobrze działała na mobile / tablet /
desktop.

> **Źródła prawdy layoutu:** `docs/frontend-page-layout.md`, `layout-config.service.ts`
> (`DesktopLayout = 'narrow' | 'wide' | 'two-column'`), `page-layout.component.ts`, `app.routes.ts`,
> `styles.scss`.

---

## 1. Stan obecny (co już działa)

Infrastruktura jest w zasadzie kompletna — nie trzeba budować mechanizmów od zera, tylko **dokleić
brakujące strony do istniejących wzorców**:

- **Tryby kolumn** `narrow` / `wide` / `two-column` sterowane z `route.data.desktopLayout`
  (+ `asideSide`), przełączanie 1↔2 kolumny CSS-first (`lg:`), spójne SSR↔klient.
- **Boxed shell**: kolumna główna 700px (= natywna szerokość cover image), box rośnie do 1024px od
  `lg` w `wide`/`two-column`. Pattern w marginesach, sticky aside (`overflow: clip`).
- **Nawigacja**: `bottom-nav` < `lg`, `top-nav` od `lg` (RWD-12).
- **Raile aside (desktop) + paski priority+ (mobile)** dla trzech paneli, karmione wspólnymi modelami:
  - **Strefa wydarzenia** — `EventAreaComponent` rejestruje trwały `app-event-nav-rail`
    (CTA „Dołącz" + Szczegóły / Uczestnicy / Mapa / Czat grupowy / Czat z organizatorem + akcje
    organizatora).
  - **Panel konta** — `AccountNavService` (Konto / Uczestnik / Organizator) → `app-account-rail-slot`.
    **Panele użytkownika i organizatora są już POŁĄCZONE** w jeden rail (odpowiedź na wątpliwość z
    pkt g/d zlecenia — nie ma osobnej nawigacji organizatora).
  - **Panel admina** — `AdminNavService` → `app-admin-nav-rail` (aside z lewej).
- **Modale**: na `lg` bottom-sheety zamieniane na centered modale (RWD-13).
- **Poprawność mobile** (audyt sekcje 16–19) — **w większości WDROŻONE** (patrz §4):
  `viewport-fit=cover`, `env(safe-area-inset-*)`, `100svh`, skracanie hero w landscape
  (`max-height: 480px`), `scrollbar-gutter: stable`, tap-target `min-h-11` (44px).

---

## 2. Macierz przypisania trybu kolumny (wszystkie trasy)

Legenda: ✅ zgodne z docelowym • ⚠️ luka do naprawy • (dziedziczy = z trasy-rodzica)

### Jednokolumnowe (`narrow`, chyba że zaznaczono `wide`)

| Trasa                                                                                           | Docelowo | Stan | Uwaga                            |
| ----------------------------------------------------------------------------------------------- | -------- | ---- | -------------------------------- |
| `/`                                                                                             | narrow   | ✅   | fullscreen home (default narrow) |
| `/w/:citySlug`                                                                                  | wide     | ✅   | `wide` + grid kart (RWD-14)      |
| `/faq` `/join-us` `/contact` `/privacy` `/terms`                                                | narrow   | ✅   | default                          |
| `/announcements/confirm/:token` `/o/confirm-event` `/not-found` `/unverified` `/payment/status` | narrow   | ✅   | utility                          |
| `/auth/*` (login, register, activate, forgot, reset)                                            | narrow   | ✅   | `WHITE_BARE_LAYOUT`              |

### Dwukolumnowe (`two-column`)

| Trasa                                                     | Docelowo                | Stan | Uwaga                                          |
| --------------------------------------------------------- | ----------------------- | ---- | ---------------------------------------------- |
| `/w/:citySlug/:id` (szczegóły)                            | two-column              | ✅   | event-rail                                     |
| `/w/:citySlug/:id/participants`                           | two-column              | ✅   | `only-mini-bar` + `two-column` (event-rail)    |
| `/w/:citySlug/:id/map`                                    | two-column              | ✅   | fullscreen + 2-kol (`EVENT_FULLSCREEN_LAYOUT`) |
| `/w/:citySlug/:id/chat` `/host-chat` `/host-chat/:userId` | two-column              | ✅   | `CHAT_LAYOUT` (fullscreen+2-kol)               |
| `/o/w/new` `/o/w/:id/edit` `/o/s/:seriesId/edit-template` | two-column              | ✅   | account-rail-slot                              |
| `/o/w/:id/manage`                                         | two-column              | ✅   | account-rail-slot                              |
| `/o/w/:id/create-series`                                  | two-column              | ✅   | `two-column` + account-rail-slot               |
| `/series/:id`                                             | two-column              | ✅   |                                                |
| `/profile` (+ general/enrollment/organizer/\*)            | two-column              | ✅   | account-rail przez `ProfileArea`               |
| `/admin/**`                                               | two-column (aside left) | ✅   | dziedziczy z `AdminArea`                       |

**Wniosek:** w warstwie _przypisania kolumn_ brakuje dokładnie **3 stron**: `participants`, `map`,
`create-series`. Reszta ma już właściwy tryb.

---

## 3. Checklist — luki strukturalne (przypisanie kolumn + aside) ✅ ZROBIONE

- [x] **`participants` → two-column.** Dodano `desktopLayout: 'two-column'` (rail z `EventArea`).
      Dodatkowo: w `page-layout` obsłużono kombinację `only-mini-bar` + `two-column` (nie-fullscreen) —
      `showStaticHero` pomija mini-bar, offset mini-baru przez `mt-mini-bar` (zerowany od `lg`).
- [x] **`map` → fullscreen + two-column.** Wprowadzono wspólny `EVENT_FULLSCREEN_LAYOUT` (czaty + mapa);
      mapa wypełnia kolumnę główną, event-rail w aside. Pusty stan mapy centrowany lokalnie (`flex-1`).
- [x] **`create-series` → two-column + rail.** Dodano `desktopLayout: 'two-column'` +
      `<app-account-rail-slot />` (wzorzec `event-manage`, `p-4 lg:p-0`).
- [x] **Konwencja:** domyślny `narrow` wystarcza dla stron jednokolumnowych (bez jawnego deklarowania).

Weryfikacja: `tsc -p frontend/tsconfig.app.json --noEmit` ✅ • `nx lint frontend` ✅ (0 błędów).

---

## 4. Checklist — poprawność mobile-first (weryfikacja, nie budowa od zera)

Większość pozycji z audytu §16–20 jest już w kodzie — to **audyt potwierdzający**, nie implementacja:

- [x] `viewport-fit=cover` (`index.html`)
- [x] `env(safe-area-inset-bottom)` — `.app-container`, `bottom-nav`, cookie-consent, sticky-bar
- [x] `100svh` zamiast `100vh` (`styles.scss`)
- [x] Skracanie hero w landscape / niskich viewportach (`@media (max-height: 480px)`)
- [x] `scrollbar-gutter: stable` (kompensacja scrollbara)
- [x] Tap-target `min-h-11` (44px) — token w `tailwind.config.js`
- [x] **`scrollPositionRestoration`** = `'top'` — zostaje bez zmian (decyzja Q4).
- [x] Zaktualizowano checklisty w `rwd-audit-2026-06-25.md` §20 (odzwierciedlają stan faktyczny).
- [ ] **Domknięcie audytu tap-targetów** — przejść inline-akcje w gęstych listach (powiadomienia,
      uczestnicy, sloty, `×` w alertach) i potwierdzić ≥44px (nie tylko token, faktyczne hit-area).
- [ ] **Test landscape + klawiatura** w czacie/formularzach (pole input nad klawiaturą, `dvh`) — manualny.

---

## 5. Checklist — adaptacja TREŚCI kolumny głównej (bucket właściwy „reszty")

Te strony mają już **poprawny shell two-column + rail**, ale w środku kolumny głównej (700px) treść
to wciąż „rozciągnięta wersja mobilna" (brak `md:/lg:` gridów, tabel, container queries — potwierdzone
grepem). To jest właściwy zakres „dostosowania reszty podstron". **Wymaga decyzji Q1 (zakres tej rundy).**

> Uwaga architektoniczna: w `two-column` kolumna główna jest capowana do **700px** (natywna szerokość
> cover image), a poszerza się tylko box (do 1024) o kolumnę aside. Dlatego „więcej kolumn kart" z
> audytu jest ograniczone — w 700px sensowniejsze są **tabele**, **container-query cards** i
> **master-detail**, niż gridy 3-kolumnowe. Patrz też **Q4** (czy dla paneli danych dopuścić szerszą
> kolumnę główną).

### Panel użytkownika / uczestnika

- [ ] `notifications` — gęsta lista; rozważyć tabelę/lepsze wiersze, akcje widoczne bez hover.
- [ ] `my-payments` — lista płatności → tabela (data, kwota, status, akcje).
- [ ] `my-vouchers` — uporządkować karty/grid w 700.
- [ ] `my-participations` — karty uczestnictw (container queries, czytelność w 700).
- [ ] `media-gallery` — siatka miniatur (`grid` adaptacyjny w 700).
- [ ] `profile` — formularz edycji + sekcje (lepszy układ niż pełna szerokość 1-kol).

### Panel organizatora

- [ ] `organizer-digest` — długie sekcje stacked → podsumowanie/statystyki na górze, grid sekcji.
- [ ] `event-manage` — lista zgłoszeń → tabela (imię, status, akcje) od `md`.
- [ ] `event-form` (new/edit/edit-template) — pola w gridzie (`md:grid-cols-*`), sekcje.
- [ ] `series-details` — już ma `sm:`/`xl:` gridy; dokończyć formularz konfiguracji w gridzie.

### Strefa wydarzenia

- [ ] `event-detail` — wykorzystać rail (sticky CTA już jest); zweryfikować długość strony i mapę.
- [ ] `event-enrollments` (participants) — lista/sloty czytelne w 700 + container queries.

### Panel admina (wszystkie dziedziczą two-column / aside-left)

- [ ] `admin-dashboard` — statystyki jako grid, większe liczby.
- [x] `admin-users` — **już ma tabelę od `md`** (wzorzec referencyjny).
- [x] `admin-events` — karty < `md` / tabela od `md` (wg wzorca `admin-users`; akcje w `#rowActions`).
- [ ] `admin-cover-images` — siatka miniatur.
- [ ] `admin-contact-messages` — lista → tabela / master-detail.
- [ ] `admin-pending-emails` — kolejka → tabela.
- [ ] `admin-crons` — tabela cronów (nazwa, harmonogram, status, akcje).
- [ ] `admin-fake-users` — tabela.
- [ ] `admin-user-detail` — układ szczegółów (sekcje, ewentualnie 2 kolumny w 700).

---

## 6. Cross-cutting / konwencje do utrzymania

- [ ] **Tabele responsywne** — jeden wzorzec: karty < `md`, tabela od `md` (jak `admin-users`),
      z `overflow-x-auto` w razie potrzeby w kolumnie 700. Rozważyć wspólny komponent/dyrektywę.
- [ ] **Container queries** dla reużywalnych kart (event-card, sloty, kafelki) — fundament jest
      (RWD container-queries task); stosować konsekwentnie, bo karta żyje raz w 700, raz w railu.
- [ ] **Tylko semantyczne klasy Tailwinda** i breakpointy z configu (`screens.*`) — bez arbitralnych
      hexów / `gray-*` / `dark:` (reguły `CLAUDE.md`).
- [ ] Po zmianach design-systemowych zaktualizować `/dev/design-system` i `docs/design-tokens.md`.

---

## 7. Decyzje (zatwierdzone 2026-06-30)

- **Q1 — Zakres:** PEŁNY — §3 (luki strukturalne) + §4 (domknięcie mobile) + §5 (adaptacja treści ~20 stron).
- **Q2 — Mapa:** fullscreen + two-column z event-railem (wzorzec `CHAT_LAYOUT`).
- **Q3 — Szerokość kolumny głównej:** trzymamy **700px** + tabele z `overflow-x-auto`. Bez zmian w shellu.
- **Q4 — Scroll restoration:** zostaje `'top'` (bez zmian).
- **Kolejność:** najpierw §3 (małe, pewne), potem §4, potem §5 panel-po-panelu (od najbardziej
  tabelarycznych: admin / płatności / powiadomienia), z jednym wspólnym wzorcem tabeli.

---

## 8. Proponowana kolejność wdrożenia

1. **§3 — luki strukturalne** (participants, map\*, create-series) — małe, niskie ryzyko.
2. **§4 — domknięcie mobile** (scroll restoration, audyt tap-target, aktualizacja checklist audytu).
3. **§5 — adaptacja treści**, panel po panelu, zaczynając od najbardziej tabelarycznych
   (admin, płatności, powiadomienia), z jednym wspólnym wzorcem tabeli.

\* zależnie od decyzji Q2.
