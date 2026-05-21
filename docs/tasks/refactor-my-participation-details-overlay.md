# Refaktoryzacja overlaya "Twoje zapisy" — taby per zgłoszenie

## Kontekst

Overlay `app-my-participation-details-overlay`
(`frontend/src/app/features/event/overlays/my-participation-details-overlay.component.ts`) ma dziś
strukturę mieszającą trzy poziomy:

1. **Grid awatarów zgłoszeń hosta** (linie 26–34) — host + jego goście jako klikalne kafle
   `app-enrollment-grid-item`; kliknięcie otwiera oddzielny modal `app-enrollment-slot-modal`.
2. **Łączne CTA per host** — wspólne pasy "Wymagane potwierdzenie" (linie 39–54) i "Chcesz wrócić?"
   (linie 72–84). Pierwsze potwierdza **wszystkie** zgłoszenia jednym kliknięciem
   (`confirmAllPendingSlots` w `event-area.service.ts:771`), z labelem typu "Potwierdź wszystkie
   (3)" lub "Ty i 1 gość".
3. **`app-link-list` z opcjami ogólnymi i per‑host pomieszanymi** (linie 220–271):
   - Ogólne: Lista uczestników, Czat grupowy, Czat z organizatorem.
   - Per‑host: "Dodaj kolejną osobę".
   - **Per‑zgłoszeniowe (niejednoznaczne!)**: "Wypisz się z wydarzenia" — działa zawsze na zgłoszeniu
     hosta, nie na konkretnym; gość jest wypisywany tylko z poziomu modal-a.

Problem UX: użytkownik z 2–3 zgłoszeniami (sam + goście) nie wie, do którego zgłoszenia odnosi się
przycisk w overlayu. "Potwierdź wszystkie" robi akcję zbiorczą bez explicit‑u, a "Wypisz się"
wygląda na akcję ogólną, choć jest jednoznaczna tylko dla zgłoszenia hosta.

Modal `app-enrollment-slot-modal` (`frontend/src/app/shared/enrollment/ui/enrollment-slot-modal/`)
prezentuje już dziś poprawny widok per zgłoszenie:

- Kolorowy header z `slotStatusConfig` (per status zgłoszenia).
- `app-user-profile-card` z host/guests chipami.
- Sekcja "ACTIONS" (linie 155–272) z akcjami uczestnika **i** organizatora (select). Akcje
  uczestnika: Potwierdź uczestnictwo, Zmień rolę, Wypisz się, Wypisz gościa, Wróć do wydarzenia,
  Dodaj gościa ponownie.

Modal pozostaje używany przez 3 inne ścieżki niezwiązane z overlayem:

- `enrollment-grid.component.ts:294` — klik w avatar na pełnej liście uczestników.
- `linked-participant-chip.component.ts:67/81` — klik w chip "Dodany przez" / "Gość".

## Cel

Przebudowa overlaya tak, aby:

1. Każde zgłoszenie hosta (siebie + goście) miało **dedykowany kontekst** w postaci taba w
   overlayu.
2. **Akcje per zgłoszenie** (potwierdzenie, zmiana roli, wypisanie, rejoin) były wykonywane
   wyłącznie w kontekście aktywnego taba — bez akcji zbiorczych.
3. **Akcje ogólne** (lista uczestników, czaty, dodanie kolejnej osoby) pozostały w sekcji `app-link-list`
   pod treścią taba.
4. Logika akcji uczestnika została wydzielona do współdzielonego komponentu, używanego zarówno przez
   overlay (taby) jak i przez `enrollment-slot-modal` (modal cudzych zgłoszeń, chipy hostów/gości).

## Decyzje projektowe (z dyskusji)

- **Layout tab‑switchera**: pasek awatarów z poziomym scrollem (zgodny z aktualnym `enrollment-grid-item`),
  aktywny tab ma wyróżnienie (ring/border + ewentualnie kolor statusu).
- **Pojedyncze zgłoszenie**: pasek tabów zawsze widoczny (spójność wizualna).
- **Edge case organizatora z dużą liczbą gości**: scroll horyzontalny bez fallbacku — jeden UI dla
  wszystkich przypadków.
- **Wspólny komponent**: wydzielamy tylko sekcję **akcji uczestnika** (nie cały modal), bez akcji
  organizatora i bez widoku "view‑only" (te zostają inline w modal‑u, bo nie pasują do overlaya).
  Nowy komponent: `app-enrollment-participant-actions`.
- **Modal pozostaje** dla 3 zewnętrznych konsumentów (grid pełnej listy, chipy linked‑participant).
  Refaktor dotyczy **tylko** wnętrza `my-participation-details-overlay` + ekstrakcji wspólnego komponentu
  akcji uczestnika.

## Wybór akcji do współdzielonego komponentu

Z `enrollment-slot-modal.component.html` sekcji ACTIONS (linie 155–272) **do nowego
`app-enrollment-participant-actions`** trafiają tylko:

| Aktualny blok                                                              | Warunek                                                       | Przenosimy?          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| `canJoinPublic()` → "Zapisz się"                                           | wolny slot (nie aktualne dla overlaya, dla cudzych w modal-u) | ❌ zostaje w modal-u |
| `_slotLocked && !_participant` → "Napisz do organizatora"                  | zablokowany slot bez uczestnika                               | ❌ zostaje w modal-u |
| `needsConfirmation()` → "Potwierdź uczestnictwo"                           | własne zgłoszenie / host gościa, APPROVED + !confirmed        | ✅                   |
| `canChangeRole()` → "Zmień rolę"                                           | własne zgłoszenie / host gościa, event z rolami               | ✅                   |
| `isCurrentUserParticipant() && !_isWithdrawn && canLeave()` → "Wypisz się" | własne, aktywne                                               | ✅                   |
| `isGuestHost() && !_isWithdrawn` → "Wypisz gościa"                         | własny gość, aktywny                                          | ✅                   |
| `_isWithdrawn` → komunikat + `_canRejoin` / `_canGuestRejoin`              | własne / własny gość, wycofany                                | ✅                   |
| `_isViewOnly && !_isOrganizer` → "Uczestnik wydarzenia"                    | cudze, aktywne — nie nasze                                    | ❌ zostaje w modal-u |
| `_isOrganizer && _actions.length > 0` → select organizatora                | organizator                                                   | ❌ zostaje w modal-u |

Wnioski:

- **Wspólne** są **wyłącznie akcje uczestnika** (`needsConfirmation`, `canChangeRole`, leave,
  removeGuest, withdrawn + rejoin / rejoinGuest). Wszystkie wymagają warunku
  `isCurrentUserParticipant() || isGuestHost()` — czyli "to _moje_ zgłoszenie".
- W overlayu **z definicji** wyświetlamy tylko zgłoszenia hosta (filtr w `userParticipations()`
  `my-participation-details-overlay.component.ts:125`), więc warunek "moje" jest zawsze prawdziwy.
- W modal‑u nowy komponent będzie renderowany tylko gdy `isCurrentUserParticipant() ||
isGuestHost()` — pozostałe gałęzie modal‑a (free slot, view‑only, organizer) zostają inline.

UX-owo to ma sens: akcje uczestnika to spójny zestaw związany z "moim" zgłoszeniem; akcje
organizatora i widok cudzego zgłoszenia to inny kontekst, który nie pasuje do overlaya "Twoje zapisy".

## Checklist implementacyjna

### 1. Nowy komponent `app-enrollment-participant-actions`

- [x] Utworzyć katalog `frontend/src/app/shared/enrollment/ui/enrollment-participant-actions/`
      z plikami `enrollment-participant-actions.component.ts` i `.component.html` (osobny `templateUrl` — zgodnie z `docs/styleguide-frontend.md:50-55`, bo komponent ma 6 niezależnych warunków i zagnieżdżenie `_isWithdrawn` → `_canRejoin`/`_canGuestRejoin`).
- [x] **Inputy**:
  - `participant: Enrollment | EnrolleeManageItem` (required)
  - `event: Event` (required) — potrzebny do `eventArea.openChangeRoleWizardForParticipant()` oraz tytułów
  - `currentUserId: string | null` — pozwala policzyć `isCurrentUserParticipant`/`isGuestHost` lokalnie bez ponownego inject `AuthService` (ale wstrzyknięcie `AuthService` też jest OK i upraszcza wywołanie z parent‑a; **decyzja: inject AuthService** dla spójności z innymi komponentami sharedowymi).
- [x] **Outputy**:
  - `actionCompleted` — emitowane po każdej udanej akcji (parent decyduje czy zamknąć overlay/modal; modal aktualnie wywołuje `closeAndRefresh()`, overlay tylko `refresh`).
  - **Brak osobnych outputów per akcja** — komponent woła `eventService`/`eventArea` sam, jak modal dziś.
- [x] **Zależności** (inject):
  - `AuthService`, `EventService` (`confirmSlot`), `SnackbarService`, `ConfirmModalService`,
    `EventAreaService` (`requestLeave`, `openChangeRoleWizardForParticipant`,
    `rejoinParticipantDirect`, `canLeave`, `canJoin`, `eventHasRoles` — większość już ma).
- [x] **Sygnały / computed** (skopiować z modal‑a):
  - `isCurrentUserParticipant`, `isGuestHost`, `isActiveStatus`, `isWithdrawnStatus`, `isBanned`,
    `eventHasRoles`, `needsConfirmation`, `canChangeRole`, `canRejoin`, `canGuestRejoin`.
  - Lokalny `loading: signal(false)`.
- [x] **Metody** (skopiować z modal‑a żywcem):
  - `onConfirmSlot()` — używa `eventService.confirmSlot(p.id)` + snackbar success. **Różnica**:
    nie wywołuje `modalService.close()` — emituje `actionCompleted`, parent sam decyduje.
  - `onChangeRole()` — wywołuje `eventArea.openChangeRoleWizardForParticipant()`. Modal dziś
    woła `modalService.close()` przed otwarciem wizard‑a; **w overlayu** też trzeba zamknąć overlay
    przed otwarciem wizarda (przez output albo bezpośrednio `overlays.close()`). Najprostsze: w
    metodzie wywołać `overlays.close()` bezwarunkowo, bo wizard otwierany przez `eventArea` i tak
    przejmuje UI; modal też się zamyka przez `modalService.close()`. **Decyzja**: w komponencie
    wstrzyknąć obie usługi (`ModalService`, `BottomOverlaysService`) i zamknąć kontekst lokalnie.
    Alternatywnie — output `requestClose` i parent decyduje (czystsze). **Wybieram output**.
  - `onLeave()` — `eventArea.requestLeave()`. Modal dziś robi `modalService.close()` przed. To samo
    co wyżej: `requestClose` output.
  - `onRemoveGuest()` — confirm modal + `eventService.leaveEnrollment(p.id)` + snackbar.
  - `onRejoin()`, `onRejoinGuest()` — `eventArea.openChangeRoleWizardForParticipant` lub
    `rejoinParticipantDirect`, w obu wypadkach `requestClose` przed.
- [x] **Outputy finalne** (decyzja):
  - `actionCompleted` — po sukcesie akcji bez wizarda (confirm / removeGuest).
  - `closeRequested` — przed otwarciem wizard‑a / przejściem do innej ścieżki UI (change role,
    leave, rejoin, rejoinGuest).
- [x] **Template** (`enrollment-participant-actions.component.html`) — zawartość analogiczna do bloków z `enrollment-slot-modal.component.html:170–243`
      (bez `canJoinPublic`/`slotLocked`/`isViewOnly`/`isOrganizer`).
- [x] **Spec**: `enrollment-participant-actions.component.spec.ts` — pokrycie wariantów
      (needsConfirmation, canChangeRole, leave, removeGuest, withdrawn + rejoin, withdrawn + canGuestRejoin).

### 2. Refaktoryzacja `enrollment-slot-modal`

- [x] `enrollment-slot-modal.component.html`: zastąpić bloki linie ~169–243 (sekcje
      "Confirm slot", "Own participation (active)", "Guest host (active)", "Withdrawn") wywołaniem
      nowego komponentu, opakowanym warunkiem `isCurrentUserParticipant() || isGuestHost()`:
  ```html
  @if (_participant && (isCurrentUserParticipant() || isGuestHost())) {
  <app-enrollment-participant-actions
    [participant]="_participant"
    [event]="_event!"
    (actionCompleted)="closeAndRefresh()"
    (closeRequested)="modalService.close()"
  />
  }
  ```
- [x] `enrollment-slot-modal.component.ts`: usunąć metody przeniesione do nowego komponentu —
      `onConfirmSlot`, `onChangeRole`, `onLeave`, `onRemoveGuest`, `onRejoin`, `onRejoinGuest` oraz
      powiązane computed (`needsConfirmation`, `canChangeRole`, `canRejoin`, `canGuestRejoin`,
      `canEditProfileInModal` zostaje — używana w innym miejscu). Zachować `closeAndRefresh`
      (wymagana przez nowy handler `actionCompleted`).
- [x] Wyeksportować `closeAndRefresh` jako `protected` (jest dziś `private`) lub dodać wrapper
      `protected onActionCompleted(): void`. **Decyzja**: `protected onActionCompleted()` dla
      czytelności w template.
- [ ] Spec modal‑a (`enrollment-slot-modal.component.spec.ts` jeśli istnieje) — usunąć testy
      przeniesionych metod, dodać proste sprawdzenie, że child `app-enrollment-participant-actions`
      się rendereruje pod warunkiem `isCurrentUserParticipant || isGuestHost`.

### 3. Refaktoryzacja `my-participation-details-overlay`

- [x] **Stan lokalny aktywnego taba**:
  - `activeParticipationId: signal<string | null>(null)`
  - `activeParticipation: computed<Participation | null>` — wybiera z `userParticipations()` po ID lub fallback na pierwsze.
  - `effect` — gdy `userParticipations()` zmienia się i aktywne ID jest `null` lub niepoprawne, ustaw na pierwsze.
- [x] **Pasek tabów** (zastępuje obecny grid linie 26–34):
  - Pozostaje `app-enrollment-grid-item` z `showRole=true`.
  - Wrapper z `overflow-x-auto` + `flex-nowrap`, by umożliwić scroll przy >4 zgłoszeniach.
  - Przekazać `[highlightOwn]="false"` (w overlayu wszystkie zgłoszenia są "moje" — domyślny highlight podświetla wszystkie taby naraz, co po refaktorze jest błędne) + nowy input `[active]="p.id === activeParticipationId()"`.
  - Klik (`(clicked)="onTabChange(p.id)"`) ustawia `activeParticipationId` zamiast otwierać modal.
- [x] **Nowy input `[active]` w `EnrollmentGridItemComponent`** (`frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item/enrollment-grid-item.component.ts`):
  - Dodać `readonly active = input(false)`.
  - W `buttonClass` computed dodać gałąź dla `active()` z mocniejszym wyróżnieniem niż `shouldHighlight` (np. `bg-primary-50 ring-2 ring-primary-500` — kolor cieńszy/silniejszy ring), tak aby aktywny tab odróżniał się od "własnych" zgłoszeń w widokach, gdzie obie flagi mogą wystąpić.
  - Reużywalny — w przyszłości pełna lista uczestników może go wykorzystać (np. deep-link do zaznaczonego uczestnika).
- [x] **Zawartość taba** (zastępuje sekcje CTA + link-list w starym układzie):
  - Header statusu — kopia `enrollment-slot-modal.component.html:30–46` (kolorowy banner z
    `slotStatusConfig.title/description`). Można wydzielić jako podkomponent `app-enrollment-slot-header`
    **albo** zostawić inline w overlayu (decyzja: inline — niewiele HTML‑a, ekstrakcja
    overengineering).
  - `app-user-profile-card` (analogicznie jak w modal-u linie 53–113) — z chipami host/guests.
    **Uwaga**: w modal-u są też computed-y `hostParticipant`, `hostUserInfo`, `guestParticipants`
    — przenieść do overlaya jako lokalne computed‑y obliczone z `activeParticipation()` +
    `participants()`.
  - `<app-enrollment-participant-actions>` — z aktywnym zgłoszeniem, `(closeRequested)="closed.emit()"`
    (overlay się zamyka analogicznie do modal‑a), `(actionCompleted)` — zostawić overlay otwarty
    (`event-area` zrobi auto‑refresh, użytkownik widzi zmiany w aktywnym tabie).
- [x] **Sekcja `app-link-list` (ogólne opcje per‑event)**:
  - Pozostaje: "Lista uczestników", "Czat grupowy", "Czat prywatny z organizatorem", "Dodaj kolejną osobę".
  - **Usuwamy**: "Wypisz się z wydarzenia" (per zgłoszenie w tabie).
  - `participantLinks()` — usunąć item `value: 'leave'` i powiązane warunki w `handleParticipantOption`.
- [x] **Usuwamy** sekcje globalnych CTA:
  - Pasek "Wymagane potwierdzenie" (linie 39–54) — potwierdzanie per tab.
  - Pasek "Chcesz wrócić?" (linie 72–84) — rejoin per tab w `app-enrollment-participant-actions`.
  - Sekcja `@if (!isWithdrawnOrRejected())` opakowująca link-list — link-list jest teraz **zawsze**
    widoczna jako opcje ogólne (chat, lista uczestników) niezależnie od statusu zgłoszenia hosta.
    Sprawdzić, czy `participantStatus` input nadal jest potrzebny (raczej tak — ale logika użycia
    znika; rozważyć usunięcie inputu).
- [x] **Usuwamy** wywołanie modal-a — metoda `onParticipantClick` (linie 280–291) — zastąpić
      `onTabChange(p.id)`. Usunąć import `EnrollmentSlotModalComponent` i `ModalService`.
- [x] **Usuwamy outputy**:
  - `confirmSlotRequested`, `leaveRequested`, `rejoinRequested` — per‑tab teraz, brak globalnych CTA.
  - `payRequested` — sekcja "Payment CTA" jest już zakomentowana (linie 56–69) i nie jest aktywna; przy okazji refaktora usuwamy dead output + zakomentowany blok.
  - `participantClicked` — nieużywany w `bottom-overlays.component.html`, dead.
  - `manageGuests` — **dead path**: output istnieje, ale `participantLinks()` nie zawiera już itemu `'manage-guests'`, więc emisja nigdy nie nastąpi. Usuwamy output + case `'manage-guests'` w `handleParticipantOption` (linia 317–320).
- [x] **Pozostawiamy** outputy: `addGuestRequested`, `closed`.

### 4. Cleanup w `event-area.service.ts`

- [x] Usunąć metodę `confirmAllPendingSlots()` (linia 771) — nie jest już wywoływana z overlaya.
      Zweryfikowane: brak innych callerów (`grep`). Spec — usunąć powiązane testy.
- [x] W `registerOverlayCallbacks()` (linia 589) usunąć rejestracje:
  - `onConfirmSlotRequested` (linia 596),
  - `onLeaveRequested` (linia 597),
  - `onRejoinRequested` (linia 598),
  - `onManageGuests` (linia 601) — cały tor `manageGuests` to dead path (patrz pkt 5).
    Zostaje tylko `onAddGuestRequested(() => this.openAddGuest())`.
- [x] Usunąć metodę `openManageGuests()` (linia 666) — zweryfikowane, że jedynym callerem jest
      rejestracja w linii 601, którą usuwamy. Cała metoda dead.
- [x] Usunąć wywołania `setParticipantStatus()` — linia 609 (w innej metodzie sync) i linia 972
      (po `confirmSlot` ustawia `'CONFIRMED'`). Po refaktorze status liczymy per tab z `participants()`,
      a sygnały zostają usunięte z `BottomOverlaysService` (patrz pkt 5).
- [x] Zachować `requestLeave()`, `confirmJoin()`, `confirmSlot()` (per‑id) — wykorzystywane przez nowy
      komponent / inne ścieżki.

### 5. Cleanup w `bottom-overlays.service.ts` + `.component.html`

- [x] `bottom-overlays.service.ts`:
  - Usunąć **callbacki + handlery** (per‑tab teraz, brak globalnych CTA):
    - `confirmSlotRequestedCallback` + `onConfirmSlotRequested` + `handleConfirmSlot`,
    - `leaveRequestedCallback` + `onLeaveRequested` + `handleLeaveRequested`,
    - `rejoinRequestedCallback` + `onRejoinRequested` + `handleRejoinRequested`,
    - `payRequestedCallback` + `onPayRequested` + `handlePay` (jeśli istnieją — sekcja Payment CTA i tak jest zakomentowana).
  - Usunąć `manageGuestsCallback` (linia 59) + `onManageGuests` (linia 202) + `handleManageGuests`
    (linia 272) + `null`‑owanie w cleanupie (linia 298) — **dead path** (link `'manage-guests'` nie
    istnieje już w `participantLinks`, output overlaya też usuwamy).
  - Usunąć sygnały statusu hosta:
    - `participantStatusSignal` + readonly getter `participantStatus` (linie 45, 90),
    - `waitingReasonSignal` + readonly getter `waitingReason` (linie 46, 91),
    - metoda `setParticipantStatus()` (linia 137–139).
      Jeśli `WaitingReason` jest importowane tylko dla tych sygnałów — usunąć też import.
  - Zachować `onAddGuestRequested` + `handleAddGuestRequested` + `addGuestRequestedCallback`.
- [x] `bottom-overlays.component.html`: w bloku `@case ('joinConfirm')` (linie 30–44) usunąć
      bindingi:
  - `[participantStatus]` (linia 34),
  - `[waitingReason]` (linia 35),
  - `(payRequested)` (linia 38),
  - `(confirmSlotRequested)` (linia 39),
  - `(leaveRequested)` (linia 40),
  - `(rejoinRequested)` (linia 41),
  - `(manageGuests)` (linia 43).
    Zostaje: `[open]`, `[event]`, `[loading]`, `[participants]`, `(closed)`, `(addGuestRequested)`.

### 6. Usunięcie inputów `participantStatus` / `waitingReason` w overlayu

- [x] `my-participation-details-overlay.component.ts`:
  - Usunąć inputy `participantStatus` (linia 110) i `waitingReason` (linia 111).
  - Usunąć computed `isWithdrawnOrRejected` (linia 139–142) — status decydujemy per aktywny tab
    wewnątrz `app-enrollment-participant-actions`.
  - Usunąć computed `canRejoin` (linia 154–158) — przenosi się do nowego komponentu (lub jego
    czytanie z `eventArea.canJoin()` zostaje w komponencie akcji uczestnika).
  - Z importów wyczyścić `WaitingReason` jeśli nieużywane gdzie indziej.
- [x] Po refaktorze inputów cały tor `setParticipantStatus()` w `event-area.service.ts` i sygnałów
      w `bottom-overlays.service.ts` jest martwy → usunięty w pkt 4 i 5.

### 7. Testy

- [x] **W zakresie tego taska** — nowy spec `enrollment-participant-actions.component.spec.ts` — pokrycie wszystkich gałęzi
      decyzyjnych (confirm, changeRole, leave, removeGuest, withdrawn warianty). Izolowany komponent
      z czystą logiką decyzyjną — najwyższy ROI testowy.
- [ ] **W zakresie tego taska** — `enrollment-slot-modal.component.spec.ts` (jeśli istnieje) — usunąć testy przeniesionych metod
      (`onConfirmSlot`, `onChangeRole`, `onLeave`, `onRemoveGuest`, `onRejoin`, `onRejoinGuest`)
      i dodać test, że nowy child się renderuje pod warunkiem `isCurrentUserParticipant || isGuestHost`.
- [x] **W zakresie tego taska** — `event-area.service.spec.ts` — usunąć testy `confirmAllPendingSlots` (i ewentualnie
      `openManageGuests`, `registerOverlayCallbacks` dla usuwanych callbacków).
- [ ] **Odłożone do osobnego taska** — `my-participation-details-overlay.component.spec.ts`. Sporo
      dependencji (`EventAreaService`, `BottomOverlaysService`, `AuthService`, `ModalService`),
      niski ROI testów w stosunku do nakładu mockowania. Pokrycie zapewnia QA wizualne (pkt 8) +
      spec nowego komponentu akcji.

### 8. QA wizualne

- [ ] Scenariusz A (1 zgłoszenie — host bez gości): pasek tabów z 1 awatarem + treść, brak
      łącznych przycisków.
- [ ] Scenariusz B (host + 1 gość, oba APPROVED, !confirmed): w pasku 2 avatary z badge
      `needs_confirmation`, każdy tab ma swoje "Potwierdź uczestnictwo", potwierdzenie zostawia
      overlay otwarty.
- [ ] Scenariusz C (host wycofany + gość aktywny): tab hosta pokazuje komunikat + "Wróć do
      wydarzenia"; tab gościa pokazuje "Zmień rolę" + "Wypisz gościa".
- [ ] Scenariusz D (organizator z 100 gośćmi): pasek tabów scrolluje poziomo, każdy tab
      sam‑w‑sobie działa.
- [ ] Scenariusz E (zmiana roli z taba): overlay się zamyka (closeRequested), otwiera się wizard
      ról; po zakończeniu wizarda overlay nie odzyskuje stanu — to OK, użytkownik wraca przez ikonę
      "Twoje zapisy".
- [ ] Sprawdzić na `/dev/design-system`, czy `app-enrollment-grid-item` z dodaną klasą "active"
      wygląda poprawnie (jeśli zdecydujemy się dodać input `[active]` zamiast wrappera w overlayu).

## Pominięte z planu (świadomie)

- **Zmiany w modal‑u dla cudzych zgłoszeń** — sekcje free slot, view‑only, organizer zostają
  inline; nie ma powodu wyciągać ich do współdzielonego komponentu, bo nie mają konsumenta w overlayu.
- **Reorganizacja `participantLinks()` w stylu sekcji** — zostaje płaska lista bez dzielenia na
  "Komunikacja" / "Akcje" itp. Można przemyśleć po refaktorze jako osobny task.
- **Spec `my-participation-details-overlay.component.spec.ts`** — odłożone do osobnego taska
  (duży nakład mockowania, niski ROI; pokrycie zapewnia QA wizualne + spec nowego komponentu).

## Pliki do edycji (sumarycznie)

### Nowe pliki

- `frontend/src/app/shared/enrollment/ui/enrollment-participant-actions/enrollment-participant-actions.component.ts`
- `frontend/src/app/shared/enrollment/ui/enrollment-participant-actions/enrollment-participant-actions.component.html`
- `frontend/src/app/shared/enrollment/ui/enrollment-participant-actions/enrollment-participant-actions.component.spec.ts`

### Zmieniane

- `frontend/src/app/features/event/overlays/my-participation-details-overlay.component.ts` (główna refaktoryzacja: taby + usunięcie globalnych CTA + usunięcie inputów statusu)
- `frontend/src/app/shared/enrollment/ui/enrollment-slot-modal/enrollment-slot-modal.component.ts` (usunięcie metod przeniesionych do nowego komponentu)
- `frontend/src/app/shared/enrollment/ui/enrollment-slot-modal/enrollment-slot-modal.component.html` (zastąpienie sekcji ACTIONS uczestnika nowym komponentem)
- `frontend/src/app/shared/enrollment/ui/enrollment-slot-modal/enrollment-slot-modal.component.spec.ts` (jeśli istnieje — aktualizacja)
- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item/enrollment-grid-item.component.ts` (nowy input `[active]` + nowa gałąź w `buttonClass`)
- `frontend/src/app/features/event/services/event-area.service.ts` (usunięcie `confirmAllPendingSlots`, `openManageGuests`, callbacków `onConfirmSlotRequested`/`onLeaveRequested`/`onRejoinRequested`/`onManageGuests`, wywołań `setParticipantStatus`)
- `frontend/src/app/features/event/services/event-area.service.spec.ts` (usunięcie testów dla usuniętych metod)
- `frontend/src/app/shared/overlay/ui/bottom-overlays/bottom-overlays.service.ts` (usunięcie callbacków/handlerów per‑tab CTA + `manageGuests` dead path + sygnałów `participantStatus`/`waitingReason`)
- `frontend/src/app/shared/overlay/ui/bottom-overlays/bottom-overlays.component.html` (usunięcie 7 bindingów: `participantStatus`, `waitingReason`, `payRequested`, `confirmSlotRequested`, `leaveRequested`, `rejoinRequested`, `manageGuests`)

## Brak zmian wymaganych w

- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid.component.ts` — pełna lista uczestników nadal otwiera modal.
- `frontend/src/app/shared/enrollment/ui/linked-participant-chip/linked-participant-chip.component.ts` — chipy nadal otwierają modal.
- `frontend/src/app/shared/user/ui/user-profile-card/*` — profil renderowany identycznie w obu kontekstach.
- `libs/email/*` — refaktor jest tylko UI-owy.
- `backend/*` — brak zmian backendowych.

## Zgodność z guide'ami

- `docs/styleguide-common.md` — pliki .ts < ~300 linii, OnPush, signals, brak `@Input()` legacy.
- `docs/styleguide-frontend.md` — wyłącznie semantyczne kolory Tailwind (`primary`, `neutral`,
  `success`, `warning`, `danger`, `info`); standalone components, `inject()`, `effect/computed`.
- `docs/frontend-page-layout.md` — overlay korzysta z `app-bottom-overlay`, zachowujemy
  `max-w-app`, `space-y-4`.
