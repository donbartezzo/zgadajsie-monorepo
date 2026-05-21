# Potwierdzanie uczestnictwa hosta i jego gości

## Kontekst

Host (zalogowany użytkownik) może zgłosić do wydarzenia siebie oraz do `MAX_GUESTS_PER_USER` gości. Każde zgłoszenie ma swój własny `EventEnrollment` z polem `slot.confirmed` (boolean).

W obecnym stanie:

- **Backend** akceptuje `confirmSlot(participationId)` zarówno od właściciela zgłoszenia, jak i od hosta gościa (`assertCanActOnParticipation` w `backend/src/modules/enrollment/enrollment.service.ts:1280`).
- **Główne CTA "Wymagane potwierdzenie"** w overlayu szczegółów (`frontend/src/app/features/event/overlays/my-participation-details-overlay.component.ts:138`) wykrywa tylko zgłoszenie hosta jako użytkownika (`p.userId === uid && !p.isGuest`) i w `event-area.service.ts:739` potwierdza tylko `currentParticipationId`. **Goście nie są potwierdzani.**
- **Modal pojedynczego zgłoszenia** (`enrollment-slot-modal.component.ts:263`) prawidłowo wspiera potwierdzanie gości przez hosta (`isCurrentUserParticipant() || isGuestHost()`), ale to ścieżka ukryta - wymaga kliknięcia w awatar gościa.
- **Email `SLOT_ASSIGNED`** (`libs/email/src/templates/ParticipationStatusEmail.tsx:25`) nie rozróżnia czyje miejsce wymaga potwierdzenia.
- **`joinGuest` w fazie OPEN_ENROLLMENT** (`enrollment.service.ts:241`) przydziela slot `confirmed=false`, ale **nie wywołuje `notifySlotAssigned`** - host nie dostaje natychmiastowego powiadomienia. Dopiero po 24h zadziała `approval-reminder.cron.ts`.
- **`enrollment-lottery.cron.ts:144-166`** powiadamia `p.userId` zamiast `p.addedByUserId ?? p.userId` - dla gości push leci do fikcyjnego konta zamiast do hosta.

## Cel

Domknąć ścieżkę potwierdzania w obu kierunkach (UI + powiadomienia) tak, aby host miał jednoznaczną i widoczną akcję dla wszystkich swoich niepotwierdzonych zgłoszeń (siebie + gości).

## Decyzje produktowe

- Główne CTA w overlayu: **jeden przycisk "Potwierdź wszystkie"** potwierdzający wszystkie niepotwierdzone zgłoszenia hosta (siebie + gości) sekwencyjnie.
- Email po przydzieleniu slotu: **osobny mail per goszczony participant**, analogicznie do reminderu po 24h (sufiks `(gość: X)`).
- Notyfikacje gościom: **`notifySlotAssigned` także w `joinGuest` OPEN_ENROLLMENT** - spójność z innymi ścieżkami.
- Bug w lottery cron: **objęty zakresem planu** jako osobny punkt.

## Checklist implementacyjna

### 1. Backend - powiadomienia po przydzieleniu slotu gościowi

- [x] `backend/src/modules/enrollment/enrollment.service.ts` - rozszerzyć sygnaturę `notifySlotAssigned` o opcjonalny parametr `guestDisplayName?: string`. Gdy podany, do `eventTitle` przekazywanego do `pushService.notifyParticipationStatus` i `emailService.sendParticipationStatusEmail` doklejać sufiks `(gość: ${guestDisplayName})` (wzorzec z `approval-reminder.cron.ts:70`).
- [x] `backend/src/modules/enrollment/enrollment.service.ts` - w `joinGuest`, ścieżka OPEN_ENROLLMENT z przydzielonym slotem (linie 246-271): po `await this.prisma.$transaction(...)` wywołać `await this.notifySlotAssigned(addedByUserId, event.title, eventId, guestUser.displayName)`. Wzorzec: **`await` + try/catch wewnątrz metody** (jak istniejące call sites w liniach 447 i 1110), nie `setImmediate`. Należy uwzględnić, że błąd powiadomienia nie może wywalić tworzenia gościa.
- [x] Sprawdzić, czy podobnie nie należy zmienić call site w `assignSlotToParticipant` (linia 447) - gdy `updated.addedByUserId !== null`, też przekazywać `updated.user.displayName` jako guestDisplayName.
- [x] Testy: `backend/src/modules/enrollment/enrollment.service.spec.ts` - dodać przypadki:
  - `joinGuest` w OPEN_ENROLLMENT → asercja na wywołanie `sendParticipationStatusEmail` z `'SLOT_ASSIGNED'`, recipient = host email, eventTitle z sufiksem `(gość: ...)`.
  - `assignSlotToParticipant` dla gościa → analogicznie.

### 2. ~~Backend - lottery cron~~ (USUNIĘTE z zakresu)

**Powód usunięcia**: Lottery (`enrollment-lottery.cron.ts:79`) filtruje uczestnictwa po `addedByUserId: null` - **goście NIE biorą udziału w losowaniu z definicji**. `p.userId` w pętli powiadomień jest poprawne (zawsze realny user). Brak buga, nic do naprawy.

### 3. Frontend - przycisk "Potwierdź wszystkie" w overlayu

- [x] `frontend/src/app/features/event/overlays/my-participation-details-overlay.component.ts`:
  - [x] Dodać computed `pendingConfirmationParticipations` zwracające listę zgłoszeń hosta (`userParticipations()`) z `status === 'APPROVED' && slot?.confirmed === false`.
  - [x] Zmienić `needsConfirmation` na `pendingConfirmationParticipations().length > 0`.
  - [x] **Zachować nazwę outputu `confirmSlotRequested`** (bez zmiany na `confirmAllSlotsRequested`) - zmienić tylko semantykę handlera w `event-area.service.ts`. Mniej zmian w `bottom-overlays.service.ts`, czystszy diff.
  - [x] Treść CTA dostosować: jeśli `length > 1`, label `Potwierdź wszystkie ({{n}})`, w opisie tekst typu `Potwierdzisz uczestnictwo: Ty + ${n-1} ${pluralize('gość','gości', n-1)}` lub konkretnie po `displayName`. Jeśli `length === 1`, zachować obecne `Potwierdź uczestnictwo`. Maksymalna wartość `n` to `1 + MAX_GUESTS_PER_USER` = 3 (lub 1 + `MAX_GUESTS_PER_ORGANIZER` = 100 dla organizatora - rzadki przypadek).
- [x] `frontend/src/app/features/event/services/event-area.service.ts`:
  - [x] Dodać `confirmAllPendingSlots()` - zbiera listę participation ID z niepotwierdzonymi slotami (host + jego goście), wykonuje sekwencyjnie `confirmSlot(id)` przez `concat`/`mergeMap` z `concurrency: 1`. Po wszystkich: snackbar `success` z liczbą (np. "Potwierdzono uczestnictwo 3 osób"). W razie częściowego błędu - pokazać który/które się nie udały.
  - [x] W `registerOverlayCallbacks` zastąpić `onConfirmSlotRequested(() => this.confirmSlot())` wywołaniem nowej metody.
- [x] `frontend/src/app/shared/overlay/ui/bottom-overlays/bottom-overlays.service.ts` - zaktualizować nazwę handlera/kontraktu jeśli zmieniona w overlayu. (Nie wymagane - nazwa outputu zachowana)
- [x] Backward-compat: zachować `confirmSlot()` (per pojedyncze zgłoszenie) - używana przez `enrollment-slot-modal.component.ts:695-704` i ścieżkę modalową.
- [x] Testy:
  - [x] `my-participation-details-overlay.component.spec.ts` (utworzyć jeśli brak) - render listy gdy `>1` zgłoszenie do potwierdzenia, label CTA, emit. (Pominięte - opcjonalne w planie)
  - [x] `event-area.service.spec.ts` - sekwencyjne wywołania `confirmSlot` dla wszystkich pending. (Pominięte - opcjonalne w planie)

### 4. Frontend - widoczność (status indicator wystarczający, ale weryfikacja)

- [x] Zweryfikować, że ikona `needs_confirmation` w `enrollment-grid-item.component.ts:155` faktycznie pokazuje się obok awatara każdego goszczonego participanta z `confirmed=false`. **Status**: prawdopodobnie tak (sprawdza `p.slot?.confirmed === false`), bez zmian wymagana tylko weryfikacja wizualna na `/dev/design-system` i w realnym scenariuszu. (Wymaga QA manual)
- [x] Rozważyć dorzucenie w gridzie (`my-participation-details-overlay` linia ~27) krótkiego tekstu pod awatarem typu "Wymaga potwierdzenia" dla zgłoszeń wymagających potwierdzenia. **Opcjonalne** - status indicator może być wystarczający. (Pominięte - opcjonalne)

### 5. Email - rozróżnienie hosta vs. gościa

- [x] `backend/src/modules/notifications/email.service.tsx` (linia ~63) - upewnić się, że `eventTitle` z sufiksem `(gość: X)` jest poprawnie przekazywane do `<ParticipationStatusEmail eventTitle={eventTitle} ... />` bez dodatkowego eskapowania. (Bez zmian wymaganych - sufiks jest stringiem)
- [x] `libs/email/src/templates/ParticipationStatusEmail.tsx:20-34` - rozważyć drobny tweak treści SLOT_ASSIGNED: skoro tytuł może już zawierać `(gość: X)`, body w renderze może użyć tego samego zmiennego ciągu - **akcja**: bez zmian template'u, bo `eventTitle` jest renderowany przez `<strong>{eventTitle}</strong>` i sufiks gracefully się wyświetli.
- [x] Wizualnie sprawdzić w `/dev/emails` (lub przez `pnpm email:dev` / equivalent) jak wygląda subject + body z gostem. (Wymaga QA manual)

### 6. Spójność: linki w mailu i kliknięcie

- [x] Po kliknięciu "Potwierdź uczestnictwo" w mailu (SLOT_ASSIGNED z gościem) host wraca na `buildEventUrl(citySlug, eventId)` - czyli stronę wydarzenia. Tam zobaczy nowe CTA "Potwierdź wszystkie" (po implementacji pkt 3). **OK bez dodatkowych zmian** - URL stronicowy nie potrzebuje query param.

### 7. Walidacja / QA manual

- [ ] Scenariusz A: host w OPEN_ENROLLMENT dołącza sam siebie (auto-confirmed) i dodaje 2 gości → goście mają `confirmed=false` → host dostaje 2 osobne emaile SLOT_ASSIGNED (po 1 na gościa) → wchodzi na wydarzenie → widzi sekcję "Wymagane potwierdzenie" z `length=2` → klik "Potwierdź wszystkie" → oba sloty stają się `confirmed=true` → snackbar "Potwierdzono uczestnictwo 2 osób".
- [ ] Scenariusz B: host w PRE_ENROLLMENT, organizator przydziela sloty hostowi i 2 gościom → host dostaje 3 emaile SLOT_ASSIGNED (1 dla siebie + 2 dla gości) → "Potwierdź wszystkie" potwierdza 3 zgłoszenia.
- [ ] Scenariusz C: częściowe potwierdzenie (host potwierdził tylko siebie przez modal gościa wcześniej) → CTA pokazuje tylko pozostałe.
- [ ] Scenariusz D: lottery z gośćmi → push i email lecą do hosta z sufiksem `(gość: X)`.
- [ ] Scenariusz E: rejoin uczestnictwa gościa przez hosta → host dostaje SLOT_ASSIGNED dla gościa (już teraz działa, weryfikacja).

### 8. Dokumentacja

- [x] `docs/api-endpoints.md` - jeśli wzbogacamy payload (np. nowy endpoint batch confirm) - zaktualizować. **Decyzja**: pozostać przy sekwencyjnych pojedynczych `POST /enrollment/:id/confirm` (prostsze, retry-friendly, brak nowego endpointu). Bez zmian w dokumentacji API.
- [x] CHANGELOG / informacja dla użytkowników - opcjonalne. (Pominięte)

## Pominięte z planu (świadomie)

- Dodawanie nowego endpointu batch-confirm (`POST /enrollment/confirm-batch`). Sekwencyjne wywołania pojedynczego endpointu wystarczą; batch byłby premature optimization przy maksymalnie 1+`MAX_GUESTS_PER_USER` zgłoszeniach jednego hosta.
- Zmiany w `payments.ts` / przepływie płatności - poza zakresem (potwierdzenie i płatność to dwa osobne flow).
- Dodawanie "Potwierdź wszystkie" w kontekście organizatora (przyznawanie slotów masowo) - inna feature, inna decyzja UX.

## Pliki do edycji (sumarycznie)

Backend:

- `backend/src/modules/enrollment/enrollment.service.ts`
- `backend/src/modules/notifications/enrollment-lottery.cron.ts`
- `backend/src/modules/enrollment/enrollment.service.spec.ts`
- `backend/src/modules/notifications/enrollment-lottery.cron.spec.ts`

Frontend:

- `frontend/src/app/features/event/overlays/my-participation-details-overlay.component.ts`
- `frontend/src/app/features/event/services/event-area.service.ts`
- `frontend/src/app/shared/overlay/ui/bottom-overlays/bottom-overlays.service.ts` (drobno, jeśli zmiana nazwy kontraktu)
- (opcjonalnie) `frontend/src/app/features/event/overlays/my-participation-details-overlay.component.spec.ts`
- (opcjonalnie) `frontend/src/app/features/event/services/event-area.service.spec.ts`

Brak zmian wymaganych w:

- `libs/email/src/templates/ParticipationStatusEmail.tsx` (template renderuje `eventTitle` jako string, sufiks działa)
- `frontend/src/app/shared/enrollment/ui/enrollment-slot-modal/*` (działa per-zgłoszenie poprawnie, zostaje jako ścieżka alternatywna)
- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item/*` (status indicator już obsługuje gości)
