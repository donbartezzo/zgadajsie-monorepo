# Refaktoryzacja nazewnictwa: uczestnictwo → zgłoszenie

## Problem — aktualne niespójności

### 1. `participant` / `participants` — zbyt szeroki zakres

Aktualnie `participants` obejmuje WSZYSTKICH zgłoszonych: PENDING, APPROVED, CONFIRMED, WITHDRAWN, REJECTED. Tymczasem semantycznie "uczestnik" to ktoś, kto ma zajęte miejsce — czyli status APPROVED lub CONFIRMED.

### 2. `slotCount` w EventAreaService — mylące

Brzmi jak liczba dostępnych miejsc (pojemność), a oznacza liczbę zajętych miejsc (APPROVED + CONFIRMED). To odwrotność tego, czego się intuicyjnie spodziewamy.

### 3. Brak spójnego terminu dla "wszystkich zgłoszonych"

Nie ma jednego terminu pokrywającego "kogokolwiek, kto kiedykolwiek się zapisał" — stąd `participants` jest nadużywany.

---

## Słownik pojęciowy (docelowy)

| Pojęcie | Angielski termin | Uzasadnienie |
|---|---|---|
| Zapisanie się do wydarzenia (akcja) | `enrollment` | Neutralny, obejmuje każdy zapis; spójny z istniejącym `EnrollmentPhase` |
| Zapis do wydarzenia (rekord) | `Enrollment` | Odpowiednik obecnego `Participation` |
| Osoba zapisana (niezależnie od statusu) | `enrollee` | Każdy, kto się kiedykolwiek zapisał — używać oszczędnie, patrz uwaga |
| Osoba z miejscem (APPROVED/CONFIRMED) | `participant` | Właściwy uczestnik — ma przydzielony slot |
| Wszystkie zapisy do wydarzenia | `enrollments` | Odpowiednik obecnego `participants` |

Skrótowo:

```
enrollment      = rekord zgłoszenia do wydarzenia (dowolny status)
enrollee        = osoba zgłoszona (dowolny status) — preferować w nazwach typów
participant     = osoba z przydzielonym slotem (APPROVED lub CONFIRMED)
participantCount = liczba zajętych miejsc (nie: "ile slotów")
enrollmentCount = liczba wszystkich zgłoszonych (nie: "ilu uczestników")
capacity        = pojemność (maxParticipants w modelu Event)
```

> **Uwaga dot. `enrollee`:** termin poprawny, ale rzadko spotykany w kodzie produkcyjnym. Używać go tylko w nazwach typów i interfejsów (np. `EnrolleeManageItem`). W nazwach endpointów i metod preferować nazwy akcji zamiast nazw osób — np. `assign-to-slot` zamiast `assign-enrollee`.

---

## Konkretne zmiany wg warstwy

### Prisma schema / baza danych

| Stara nazwa | Nowa nazwa | Uwaga |
|---|---|---|
| model `EventParticipation` | `EventEnrollment` | rekord zgłoszenia |
| pole FK `participationId` w `EventSlot` | `enrollmentId` | klucz obcy do zgłoszenia |
| pole FK `participationId` w `Payment` | `enrollmentId` | klucz obcy do zgłoszenia |
| pole FK `participationId` w `PaymentIntent` | `enrollmentId` | klucz obcy do zgłoszenia |
| relacja `User.participations` | `User.enrollments` | lista zgłoszeń użytkownika |
| relacja `User.addedParticipants` | `User.addedEnrollments` | zgłoszenia dodane jako gość |
| enum `WithdrawnBy` | bez zmian | semantycznie OK |
| wartość enuma `NotificationKind.PARTICIPATION_STATUS` | do decyzji — patrz uwaga | wymaga migracji danych |

`maxParticipants` / `minParticipants` w modelu `Event` — **zostają bez zmian**. Tu "participants" oznacza docelową pojemność, co jest poprawne.

> **Uwaga dot. `NotificationKind.PARTICIPATION_STATUS`:** zmiana wartości enuma w Prisma wymaga migracji danych w tabeli `Notification`. Warto rozważyć, czy zmiana nazwy wnosi wystarczającą wartość, żeby uzasadnić tę operację.

> **Uwaga dot. strategii migracji Prisma:** rename modelu może być realizowany na dwa sposoby:
> - **`@@map` / `@map`** — zachowuje stare nazwy tabel i kolumn w bazie, zmienia tylko nazwy w kodzie. Bezpieczniejsze dla istniejących danych, nie wymaga migracji tabeli.
> - **Destructive rename** — Prisma generuje `DROP TABLE` + `CREATE TABLE`, co wymaga migracji danych. Ryzykowne na produkcji.
>
> Rekomendowane podejście: użyć `@@map("EventParticipation")` i `@map("participationId")` aby zachować istniejące nazwy tabel/kolumn w bazie.

---

### Backend — moduły, serwisy, kontrolery

| Stara nazwa | Nowa nazwa |
|---|---|
| moduł `participation/` | `enrollment/` |
| `ParticipationService` | `EnrollmentService` |
| `ParticipationController` | `EnrollmentController` |
| `participation.service.ts` | `enrollment.service.ts` |
| metoda `getParticipants(eventId)` | `getEnrollments(eventId)` |
| DTO `JoinEventDto` | bez zmian — `join` jest właściwą akcją |
| DTO `JoinGuestDto` | bez zmian |
| typ `ParticipationWithSlot` | `EnrollmentWithSlot` |

**Liczniki w `EventAreaService`:**

| Stara nazwa | Nowa nazwa | Co liczy |
|---|---|---|
| `slotCount` | `participantCount` | zajęte miejsca (APPROVED + CONFIRMED) |
| `participantCount` | `enrollmentCount` | wszyscy zgłoszeni (wszystkie statusy) |
| `isParticipant` | `isEnrolled` | czy użytkownik ma aktywny zapis (dowolny status) |

> **Uwaga:** `isParticipant` aktualnie zwraca `true` również dla PENDING — co jest sprzeczne z proponowanym słownikiem, gdzie `participant` = tylko APPROVED/CONFIRMED. Zmiana na `isEnrolled` odzwierciedla rzeczywistą semantykę tej flagi.

Spójny zestaw liczników po refaktorze:

- `participantCount` — zajęte miejsca (APPROVED + CONFIRMED)
- `enrollmentCount` — wszyscy zgłoszeni (wszystkie statusy)
- `pendingCount` — oczekujący (PENDING)
- `capacity` lub `maxParticipants` — pojemność (obecne `maxParticipants` w modelu Event)

---

### API endpoints

| Stara ścieżka | Nowa ścieżka |
|---|---|
| `GET /events/:id/participants` | `GET /events/:id/enrollments` |
| `POST /participations/:id/assign-slot` | `POST /enrollments/:id/assign-slot` |
| `POST /participations/:id/confirm-slot` | `POST /enrollments/:id/confirm-slot` |
| `POST /participations/:id/release-slot` | `POST /enrollments/:id/release-slot` |
| `POST /participations/:id/leave` | `POST /enrollments/:id/leave` |
| `POST /participations/:id/pay` | `POST /enrollments/:id/pay` |
| `POST /participations/:id/rejoin` | `POST /enrollments/:id/rejoin` |
| `PATCH /participations/:id/update-guest` | `PATCH /enrollments/:id/update-guest` |
| `POST /slots/:slotId/assign-participant/:id` | `POST /slots/:slotId/assign-to-slot/:id` |

`POST /events/:eventId/join` i `join-guest` — **zostają bez zmian** — to naturalne czasowniki akcji.

> **Uwaga:** `assign-enrollee` zastąpiono przez `assign-to-slot` — nazwa akcji jest czytelniejsza niż nazwa osoby w URL-u.

> **Uwaga dot. breaking change:** zmiana ścieżek API to breaking change dla frontendu. W monorepo z jednoczesnym deployem obu warstw nie stanowi problemu, ale jeśli front i back są deployowane niezależnie — potrzebna jest strategia kompatybilności wstecznej (aliasy starych endpointów).

---

### Enumy i typy (backend)

| Stara nazwa | Nowa nazwa | Uzasadnienie |
|---|---|---|
| `ParticipationStatus` | `EnrollmentStatus` | status zgłoszenia, nie uczestnictwa |
| `WaitingReason` | bez zmian | semantycznie poprawne |
| `EnrollmentPhase` | bez zmian | już poprawne |

Wartości enumów (`PENDING`, `APPROVED`, `CONFIRMED`, `WITHDRAWN`, `REJECTED`) — **zostają bez zmian** — są jasne same w sobie.

---

### Frontend — typy i interfejsy

| Stara nazwa | Nowa nazwa |
|---|---|
| interfejs `Participation` | `Enrollment` |
| interfejs `ParticipantManageItem` | `EnrolleeManageItem` |
| typ `ParticipationStatus` | `EnrollmentStatus` |
| `participation.interface.ts` | `enrollment.interface.ts` |
| `participation-status.util.ts` | `enrollment-status.util.ts` |

---

### Frontend — serwisy i komponenty

| Stara nazwa | Nowa nazwa | Uwaga |
|---|---|---|
| metoda `getParticipants(eventId)` w event.service | `getEnrollments(eventId)` | pobiera wszystkich zgłoszonych |
| `assignParticipantToSlot(slotId, participationId)` | `assignToSlot(slotId, enrollmentId)` | nazwa akcji zamiast nazwy osoby |
| `event-participants.component` | `event-enrollments.component` | jeśli pokazuje wszystkich zgłoszonych |
| `participant-grid.component` | `enrollment-grid.component` | wyświetla wszystkich zgłoszonych |
| `participant-grid-item.component` | `enrollment-grid-item.component` | |
| `participant-slot-modal.component` | `enrollment-slot-modal.component` | |

> **Uwaga do `event-participants.component`:** jeśli ta strona docelowo ma pokazywać tylko "uczestników z miejscami", można zatrzymać nazwę. Jeśli pokazuje wszystkich zgłoszonych — powinna być przemianowana.

---

### `SlotDisplayStatus` — szczegółowa zmiana

Obecne:

```typescript
type SlotDisplayStatus = 'participant' | 'pending' | 'withdrawn' | 'free';
```

Propozycja:

```typescript
type SlotDisplayStatus = 'assigned' | 'pending' | 'withdrawn' | 'free';
```

Gdzie `'assigned'` = slot z przydzielonym uczestnikiem (APPROVED lub CONFIRMED).

> **Uwaga:** `'active'` odrzucono jako zbyt generyczne — koliduje semantycznie z `EventStatus.ACTIVE` i `isActive` używanymi w innych miejscach kodu. `'assigned'` lub `'occupied'` są jednoznaczne.

---

## Co NIE wymaga zmiany

- Nazwy statusów: `PENDING`, `APPROVED`, `CONFIRMED`, `WITHDRAWN`, `REJECTED`
- Model `EventSlot` — poprawnie nazwany
- `EnrollmentPhase` — już ma właściwą nazwę
- `WaitingReason` — semantycznie OK
- Akcja `join` / `joinGuest` — naturalne i zrozumiałe
- `maxParticipants` / `minParticipants` w modelu `Event` — odnosi się do pojemności

---

## Sugerowana kolejność implementacji

1. **Prisma schema** — przemianowanie modelu `EventParticipation` → `EventEnrollment` z użyciem `@@map`, aktualizacja wszystkich pól FK (`EventSlot`, `Payment`, `PaymentIntent`), aktualizacja relacji w `User`
2. **Enumy i typy w `libs/`** — `ParticipationStatus` → `EnrollmentStatus`
3. **Backend** — moduł, serwis, kontroler, DTO, typy wewnętrzne; aktualizacja liczników w `EventAreaService` (`slotCount` → `participantCount`, `participantCount` → `enrollmentCount`, `isParticipant` → `isEnrolled`)
4. **API endpoints** — aktualizacja ścieżek
5. **Frontend** — typy/interfejsy, serwisy, komponenty, `SlotDisplayStatus`
6. **Dokumentacja** — aktualizacja `docs/api-endpoints.md`
