## Zadanie: Spłaszczenie statusów uczestnika do boolean `isTrusted`

> Ten dokument zastępuje wcześniejszą propozycję z `docs/tasks/new-user.md` (która ograniczała się do rename "Nowy uczestnik" → "Standardowy"). Po analizie kodu okazało się, że model danych już jest booleanem (`OrganizerUserRelation.isTrusted`), a "Nowy uczestnik" / "Zaufany" / "Standardowy" to różne UI dla jednej wartości. Plik `new-user.md` należy po wdrożeniu usunąć.

### Cel

Wyeliminować mylącą terminologię "Nowy uczestnik" / "Standardowy" — to nie są odrębne statusy, tylko UI dla jednego booleana `OrganizerUserRelation.isTrusted`. Model danych zostaje bez zmian (już jest poprawny). W UI:

- usuwamy wskaźnik `new_user_pending` (z mylącą etykietą "Nowy uczestnik")
- wprowadzamy `awaiting_approval` jako jego zamiennik — pozytywna semantyka, pokazywany tylko dla `waitingReason === 'NOT_TRUSTED'`, zachowuje wizualny sygnał "akcja wymagana" dla organizatora
- "Zaufany" (success/shield-check) zostaje bez zmian
- banner w join-rules zostaje, ale tekst opisuje **stan** ("Twoje zgłoszenie wymaga akceptacji"), a nie **historię** ("pierwszy raz") — ten sam tekst jest poprawny niezależnie czy user był 0 czy 10 razy u organizatora

### Zasada nazewnicza (mieszana)

Dwie osie semantyczne — różne formy:

- **API / metody / zmienne / pole DTO** → pozytywne: `isTrusted()`, `isHostTrusted`, `currentUserAccess.isTrusted`
- **Enum `WaitingReason`** → negatywne: `NOT_TRUSTED` (spójne z `BANNED`, `NO_SLOTS` — wszystkie opisują POWÓD czekania)

Uzasadnienie: `waitingReason='IS_TRUSTED'` byłoby sprzeczne logicznie (zaufany dostaje slot automatycznie, więc nie czeka). Powodem czekania jest brak zaufania, stąd negatywna forma enum.

### Wynik docelowy (UX)

- Grid uczestników (organizator): zgłoszenia z `waitingReason='NOT_TRUSTED'` pokazują nowy wskaźnik `awaiting_approval` (warning, ikona `clock` lub `user-check`, `requiresAction: true`, label "Wymaga zatwierdzenia"). Pozostałe powody oczekiwania (`NO_SLOTS`, `PRE_ENROLLMENT`) — bez ikony w gridzie (czysto informacyjne, organizator nic nie zrobi). `BANNED` ma osobny `banned` indicator (zostaje).
- Karta profilu uczestnika: `new_user_pending` znika; w kontekście enrollment dla `NOT_TRUSTED` pokazujemy `awaiting_approval`.
- Join-rules: banner zostaje, ale tekst neutralny — opisuje stan i konsekwencje (akceptacja wymagana), nie historię. Nagłówek: "Twoje zgłoszenie wymaga akceptacji". Tekst: "Nie jesteś jeszcze zaufanym uczestnikiem u tego organizatora — Twoje zgłoszenie trafi do kolejki oczekujących i musi zostać zatwierdzone przed przydzieleniem miejsca. To samo dotyczy gości, których dodasz."
- Status indicator `trusted` (success/shield-check) zostaje bez zmian w `STATUS_INDICATORS`.
- Trust prompt service (`trust-prompt.service.ts`) — komunikaty zostają bez zmian (operują w obrębie pojęcia "Zaufany", które zostaje).

### Zakres zmian — przegląd plików

**Backend:**

- `backend/src/modules/enrollment/enrollment-eligibility.service.ts` — metoda
- `backend/src/modules/enrollment/enrollment.service.ts` — 6 miejsc z `'NEW_USER'` + zmienne
- `backend/src/modules/events/events.service.ts` — `currentUserAccess.isNewUser` → `isTrusted` (linia ~281)
- `backend/src/modules/notifications/enrollment-lottery.cron.ts` — sprawdzić, używa `isTrusted` wprost
- testy: `enrollment-eligibility.service.spec.ts`, `enrollment.service.spec.ts`, `events.service.spec.ts`, `enrollment-moderation.integration.spec.ts`

**Frontend:**

- `frontend/src/app/shared/types/participation.interface.ts` — `WaitingReason`
- `frontend/src/app/shared/types/event.interface.ts` — `CurrentUserAccess`
- `libs/src/lib/config/status-indicators.config.ts` — usunięcie `new_user_pending`
- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item/enrollment-grid-item.component.ts` + `.spec.ts`
- `frontend/src/app/shared/user/ui/user-profile-card/user-profile-card.component.ts`
- `frontend/src/app/features/event/overlays/join-rules/join-rules-acceptance-step.component.ts` + `.html`
- `frontend/src/app/features/event/services/event-area.service.ts` — komentarze
- `frontend/src/app/shared/utils/waiting-reason-messages.util.ts`
- `frontend/src/app/features/dev/pages/design-system/design-system.component.html` — usunięcie tile "Nowy uczestnik"

**Dokumentacja:**

- `docs/tasks/new-user.md` — usuń po wdrożeniu
- `docs/tasks/fake_users.md` — aktualizacja referencji `isNewUser` / `NEW_USER`
- `docs/tasks/trusted-status-flatten.md` (ten plik)

---

### Checklist wdrożenia

#### Etap 0 — Migracja danych (przed deployem kodu)

- [x] Utwórz Prisma migration (lub data migration script) — `UPDATE EventEnrollment SET waitingReason = 'NOT_TRUSTED' WHERE waitingReason = 'NEW_USER'`
- [x] Uruchom migrację na dev — zweryfikuj liczbę zmienionych rekordów
- [ ] Plan release: migracja DB **przed** deployem nowej wersji kodu (bo nowy kod nie zna `'NEW_USER'`)
- [ ] Standardowy backup DB przed migracją produkcyjną (zgodnie z procedurą DevOps)

#### Etap 1 — Backend: enum i metoda eligibility

- [x] `enrollment-eligibility.service.ts`: zmień `isNewUser()` na `isTrusted()`, odwróć logikę (`return relation?.isTrusted === true`)
- [x] `enrollment-eligibility.service.ts`: zaktualizuj `isEligibleForOpenEnrollment()` i `canAddGuests()` — używają wewnętrznie (negacja na miejscu wywołania)
- [x] `enrollment.service.ts`: zmienna `isHostNew` → `isHostTrusted` (linie ~223-227), odwróć warunki w blokach poniżej
- [x] `enrollment.service.ts`: zmienna `isNew` → `isTrusted` w `handleOpenEnrollmentJoin()` (linia ~819)
- [x] `enrollment.service.ts`: zmienna `isNewCR` → `isTrustedCR` w `changeRole()` (linia ~1145)
- [x] `enrollment.service.ts`: zmienna `isNew` → `isTrusted` w `handleRejoin()` (linia ~983)
- [x] `enrollment.service.ts`: wszystkie literale `'NEW_USER'` → `'NOT_TRUSTED'` (linie ~277, ~833, ~1006, ~1014, ~1160) + typ parametru `createWaiting()` (linia ~757) + komentarz JSDoc (linia ~745)
- [x] `events.service.ts`: `currentUserAccess: { isNewUser: ... }` → `currentUserAccess: { isTrusted: ... }` (linia ~281), wywołanie metody to teraz `isTrusted(...)` bez negacji
- [x] `enrollment-lottery.cron.ts`: weryfikacja — używa `isTrusted` z relacji bezpośrednio, prawdopodobnie bez zmian

#### Etap 2 — Backend: testy

- [x] `enrollment-eligibility.service.spec.ts`: opis `describe('isNewUser()')` → `describe('isTrusted()')`, asercje odwrócone (true ↔ false)
- [x] `enrollment.service.spec.ts`: wszystkie `eligibility.isNewUser as jest.Mock` → `eligibility.isTrusted`, `mockResolvedValue(true/false)` odwrócić logikę, literale `'NEW_USER'` → `'NOT_TRUSTED'`, opisy testów ("nowy użytkownik" → "niezaufany użytkownik")
- [x] `events.service.spec.ts`: mocki `isNewUser` → `isTrusted` (linie 145, 405, 428, 557), odwrócić wartości
- [x] `enrollment-moderation.integration.spec.ts`: `describe('isNewUser()')` → `describe('isTrusted()')`, wywołania metody, asercje odwrócone
- [ ] Uruchom `pnpm test:backend` — wszystkie testy zielone

#### Etap 3 — Frontend: typy i status indicator

- [x] `participation.interface.ts`: `WaitingReason` — `'NEW_USER'` → `'NOT_TRUSTED'` + zaktualizuj komentarz nad typem
- [x] `event.interface.ts`: `CurrentUserAccess.isNewUser` → `CurrentUserAccess.isTrusted`
- [x] `libs/src/lib/config/status-indicators.config.ts`: usuń `'new_user_pending'` z union `StatusIndicatorType`, usuń wpis `new_user_pending` w `STATUS_INDICATORS`
- [x] `libs/src/lib/config/status-indicators.config.ts`: dodaj nowy `'awaiting_approval'` do union i `STATUS_INDICATORS` — `icon: 'user-check'` (lub `clock`), `label: 'Wymaga zatwierdzenia'`, `description: 'Zgłoszenie czeka na decyzję organizatora przed przydzieleniem miejsca.'`, `color: 'warning'`, `requiresAction: true`
- [x] Sprawdź czy gdzieś indziej w `libs` jest reference do `new_user_pending` — jeśli tak, dostosuj

#### Etap 4 — Frontend: komponenty UI

- [x] `enrollment-grid-item.component.ts`: rename `isNewUserPending` → `isAwaitingApproval` (sprawdza `waitingReason === 'NOT_TRUSTED'`), zmień push na `'awaiting_approval'`
- [x] `enrollment-grid-item.component.spec.ts`: dostosuj asercje (`new_user_pending` → `awaiting_approval`), zaktualizuj komentarz w teście (linia 163-165)
- [x] `user-profile-card.component.ts`: zmień branch — `if (this.waitingReason() === 'NOT_TRUSTED') badges.push({ type: 'awaiting_approval' })` (linie ~192-196)
- [x] `join-rules-acceptance-step.component.ts`: rename `showNewUserNotice` → `showApprovalRequiredNotice`, logika: `!event?.currentUserAccess?.isTrusted && !isOrganizer()`
- [x] `join-rules-acceptance-step.component.html`: alias `_showNewUserNotice` → `_showApprovalRequiredNotice`. **Zmień treść bannera**:
  - Nagłówek (zamiast "To Twój pierwszy raz? :)"): **"Twoje zgłoszenie wymaga akceptacji"**
  - Treść (zamiast "Jako nowy uczestnik w wydarzeniach u tego organizatora..."): **"Nie jesteś jeszcze zaufanym uczestnikiem u tego organizatora — Twoje zgłoszenie trafi do kolejki oczekujących i musi zostać zatwierdzone przed przydzieleniem miejsca. To samo dotyczy gości, których dodasz."**
- [x] `waiting-reason-messages.util.ts`: klucz `NEW_USER` → `NOT_TRUSTED`, zaktualizuj treść (zamiast "nowy uczestnik" / "Nowi uczestnicy wymagają akceptacji" — "Twoje zgłoszenie wymaga akceptacji organizatora")
- [x] `event-area.service.ts`: zaktualizuj komentarze w liniach 319-321 (`isNewUser flag` → `isTrusted flag`)
- [x] `design-system.component.html`: usuń tile `<app-explainer-trigger title="Nowy uczestnik">` (linie ~1025-1030), dodaj tile "Wymaga zatwierdzenia"

#### Etap 5 — Frontend: testy i weryfikacja

- [x] Sprawdź `grep` - nie ma wystąpień `NEW_USER`, `isNewUser`, `new_user_pending` w kodzie źródłowym (poza migracją)
- [ ] Uruchom `pnpm test:frontend` — wszystkie testy zielone
- [ ] Uruchom `pnpm lint:frontend` i `pnpm lint:backend` — bez błędów
- [ ] Sprawdź `pnpm typecheck` (lub równoważne) — bez błędów TypeScript
- [ ] Smoke test w UI:
  - [ ] Zgłoszenie niezaufanego usera → w gridzie wskaźnik `awaiting_approval` (warning, ikona z tooltipem "Wymaga zatwierdzenia")
  - [ ] Zgłoszenie zaufanego → automatyczny slot, w gridzie domyślny stan (bez ikony statusu warning)
  - [ ] Karta profilu niezatwierdzonego uczestnika — badge `awaiting_approval` zamiast `new_user_pending`
  - [ ] Join-rules dla niezaufanego usera — banner "Twoje zgłoszenie wymaga akceptacji" pokazuje się
  - [ ] Join-rules dla zaufanego usera — banner się NIE pokazuje
  - [ ] `/dev/design-system` — bez tile "Nowy uczestnik", obecny tile `awaiting_approval` w sekcji status indicators

#### Etap 6 — Dokumentacja i sprzątanie

- [x] Usuń `docs/tasks/new-user.md` — stary plan zastąpiony przez ten dokument
- [x] Zaktualizuj `docs/tasks/fake_users.md` — wiersz B1: `isNewUser` → `isTrusted`, `NEW_USER` → `NOT_TRUSTED`
- [x] Sprawdź `docs/design-tokens.md` — brak odniesień do `new_user_pending`
- [x] Zaktualizuj FAQ sekcja `#new-user-verification` → `#approval-required` (pytanie i odpowiedź) + link w join-rules

#### Etap 7 — Monitoring po wdrożeniu

- [x] Dodano `console.warn` w `waiting-reason-messages.util.ts` dla nieznanego klucza — ochrona przed starymi rekordami
- [ ] Po wdrożeniu na prod: zweryfikuj w DB że brak rekordów `waitingReason = 'NEW_USER'` (jednorazowy SELECT)
- [ ] Usuń `console.warn` po tygodniu observacji
- [ ] Obserwacja: czy organizatorzy zgłaszają trudność w identyfikacji "co wymaga akceptacji" — jeśli tak, rozważ wzmocnienie wskaźnika `awaiting_approval` (np. mocniejszy kolor lub badge zamiast tylko ikony).

---

### Uwagi / decyzje do potwierdzenia w trakcie

1. **Trust prompt service** (`frontend/src/app/shared/services/trust-prompt.service.ts`) — bez zmian. Operuje w obrębie pojęcia "Zaufany" (które zostaje), nie "Nowy uczestnik" (które usuwamy). Komunikaty typu "oznaczyć jako zaufany" są spójne z zachowaną terminologią.
2. **`isTrusted` w karcie profilu jako pozytywny badge** — obecnie karta nie dostaje informacji o `isTrusted` (relacja organizer-user, nie pole enrollment). Można rozważyć osobne zadanie: pokazywać badge "Zaufany" w karcie profilu uczestnika (gdy organizator ogląda). Poza zakresem tego refaktoru.
3. **Ikona dla `awaiting_approval`** — propozycja `user-check` (sugeruje "zatwierdzić użytkownika") albo `clock` (akcent na "czeka"). Decyzja w trakcie implementacji — sprawdź wizualnie na `/dev/design-system` co lepiej działa obok pozostałych wskaźników.
4. ~~**FAQ anchor `#new-user-verification`**~~ — **ZAKOŃCZONE**: zmieniono anchor na `#approval-required` i zaktualizowano pytanie/odpowiedź w FAQ oraz link w join-rules.
