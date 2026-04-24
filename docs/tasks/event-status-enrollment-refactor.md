# Refaktor: status eventu i faza zapisów

## Kontekst i decyzje

### Problem

Dwa pola API (`eventTimeStatus`, `enrollmentPhase`) tworzyły podwójne źródło prawdy i wymagały śledzenia stanu na frontendzie. Frontend miał własne kopie logiki obliczania — `??` fallback na `enrollmentPhase` i `eventTimeStatus` w `event-area.service.ts`.

### Decyzje architektoniczne

| Obszar                                       | Decyzja                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `eventTimeStatus`                            | Usunąć z API. Frontend oblicza sam z dat. Typ: `EventLifecycleStatus` (już istnieje w `event-status-messages.ts`) |
| `enrollmentPhase`                            | Usunąć z API. Zostaje jako wewnętrzny detal `enrollment.service.ts`. Frontend nie zna tej koncepcji.              |
| `isPreEnrollment` (ukrywanie uczestników)    | Frontend oblicza lokalnie z dat (`startsAt`, `lotteryExecutedAt`, `status`) — nie z API phase. Opcja A.           |
| Przycisk "Zapisz się"                        | Wyświetlany gdy `status === 'ACTIVE' && now < startsAt`. Jeden wariant etykiety: **"Zapisz się"**                 |
| Blokada zapisu                               | Tylko w momencie próby zapisu (`join()`). API zwraca `{ message, suggestion? }` (status 400)                      |
| Polling / SSE                                | Niepotrzebne — wszystkie tranzycje obliczalne z dat                                                               |
| Status bary UPCOMING                         | Generyczny tekst "Nadchodzące wydarzenie" z przyciskiem "Zapisz się". Opcja C.                                    |
| Status bary                                  | Zostają, uproszczone do `EventLifecycleStatus` + `waitingReason` (bez faz)                                        |
| `BANNED` / `NEW_USER`                        | Zostają jako ścieżka sukcesu → lista oczekujących z `waitingReason`. Obecna obsługa nie zmienia się.              |
| `isEventEnded` / `isEventJoinable` (backend) | Zostają bez zmian — wewnętrzne helpery backendowe                                                                 |
| `shouldSkipPreEnrollment` (backend)          | Zostaje bez zmian — wewnętrzna logika tworzenia eventu                                                            |
| SSR / `nowInZone()`                          | Bezpieczne — Luxon `DateTime.now().setZone()` działa identycznie w Node.js i przeglądarce                         |

### Typ `EventLifecycleStatus` (już istnieje, ujednolicamy)

```typescript
// frontend/src/app/features/event/constants/event-status-messages.ts
type EventLifecycleStatus = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED';
```

Zastępuje `EventTimeStatus` (`UPCOMING | ONGOING | ENDED`). Różnica: `CANCELLED` jest oddzielnym stanem zamiast być mapowany na `ENDED`.

### Nowy typ błędu zapisu

```typescript
// libs — nowy shared type
interface EnrollmentBlockedResponse {
  message: string;
  suggestion?: string;
}
```

Przypadki:

| Sytuacja                    | `message`                                                   | `suggestion`                                                |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Loteria w toku              | "Trwa losowanie miejsc — w tym czasie zapisy są wstrzymane" | "To nie powinno potrwać długo. Spróbuj ponownie za chwilę." |
| Event się rozpoczął         | "Zapisy nie są możliwe po rozpoczęciu wydarzenia"           | —                                                           |
| Event zakończony            | "To wydarzenie już się odbyło"                              | —                                                           |
| Event nieaktywny / odwołany | "To wydarzenie zostało odwołane"                            | —                                                           |

---

## Checklist

### LIBS

- [x] Dodać `EnrollmentBlockedResponse` do `libs/src/lib/constants/error-messages.ts`
- [x] Usunąć `libs/src/lib/enums/enrollment-phase.enum.ts` (enum `EnrollmentPhase`)
- [x] Usunąć `libs/src/lib/enums/event-time-status.enum.ts` (enum `EventTimeStatus`)
- [x] Zaktualizować `libs/src/lib/enums/index.ts` — usunąć reeksporty tych enumów
- [x] Zaktualizować `libs/src/index.ts` jeśli reeksportuje te enumy

---

### BACKEND

#### `backend/src/modules/enrollment/enrollment.service.ts`

- [x] `assertJoinEligibility()`: zamienić surowe `BadRequestException(string)` na `BadRequestException` z ciałem `EnrollmentBlockedResponse` (status 400)
  - `status !== 'ACTIVE'` → message: "To wydarzenie zostało odwołane", suggestion: brak
  - `now >= startsAt` → message: "Zapisy nie są możliwe po rozpoczęciu wydarzenia", suggestion: brak
  - `phase === 'LOTTERY_PENDING'` → message: "Trwa losowanie miejsc...", suggestion: "Spróbuj ponownie za chwilę."
- [x] `getJoinPhase()` — bez zmian (logika wewnętrzna zostaje)

#### `backend/src/modules/events/events.service.ts`

- [x] Usunąć import i wywołanie `getEventTimeStatus()`
- [x] Usunąć import i wywołanie `getEnrollmentPhase()`
- [x] `isEventEnded()` zostaje — ma 9 miejsc użycia w events.service i slot.service (wewnętrzne helpery)

#### `backend/src/modules/events/enrollment-phase.util.ts`

- [x] Plik zostaje bez zmian (wewnętrzny util enrollment.service + events.service `shouldSkipPreEnrollment`)

#### `backend/src/modules/events/event-time-status.util.ts`

- [x] Plik zostaje bez zmian — `isEventEnded`, `isEventJoinable` to wewnętrzne helpery (9+ użyć w slot.service i events.service)
- [x] Usunąć import `getEventTimeStatus` z `events.service.ts` (jedyne miejsce użycia `getEventTimeStatus` poza util)

#### Testy backendu

- [x] `enrollment-phase.util.spec.ts` — bez zmian
- [x] `event-time-status.util.spec.ts` — bez zmian (funkcje zostają)
- [x] `events.service.spec.ts` — usunąć asercje na `eventTimeStatus` i `enrollmentPhase` w odpowiedziach
- [x] `enrollment.service.spec.ts` — bez zmian (assertJoinEligibility jest prywatna, testowana pośrednio)

---

### FRONTEND — typy i utils

#### `frontend/src/app/shared/types/event.interface.ts`

- [x] Usunąć pole `enrollmentPhase?: EnrollmentPhase | null`
- [x] Usunąć pole `eventTimeStatus?: EventTimeStatus`
- [x] Usunąć lokalne typy `EnrollmentPhase` i import `EventTimeStatus` z `@zgadajsie/shared`

#### `frontend/src/app/shared/utils/event-time-status.util.ts`

- [x] Zmienić zwracany typ na `EventLifecycleStatus` (z `event-status-messages.ts`)
  - Dodać obsługę `status === 'CANCELLED'` → `'CANCELLED'` (zamiast mapowania na `'ENDED'`)
  - Usunąć import `EventTimeStatus` z `@zgadajsie/shared`
- [x] Plik zostaje jako jedyne miejsce obliczania statusu cyklu życia
- [x] Zaktualizować `event-time-status.util.spec.ts`

#### `frontend/src/app/shared/utils/enrollment-phase.util.ts`

- [x] Przenieść `getLotteryThreshold()` do `event-time-status.util.ts` (czysta kalkulacja daty, niezależna od faz)
- [x] Usunąć resztę pliku (getEnrollmentPhase i inne)
- [x] Usunąć `enrollment-phase.util.spec.ts`

---

### FRONTEND — `event-area.service.ts`

- [x] Usunąć `readonly enrollmentPhase` computed
- [x] Usunąć importy `getEnrollmentPhase`, `EnrollmentPhase`
- [x] `readonly eventTimeStatus` → zmienić na `readonly lifecycleStatus` obliczany z dat przez `getEventLifecycleStatus()`
  - Usunąć `?? null` fallback — zawsze obliczać lokalnie
  - Typ: `EventLifecycleStatus | null`
- [x] Dodać `readonly isPreEnrollment` computed z dat (opcja A): `status === 'ACTIVE' && now < lotteryThreshold && !lotteryExecutedAt`
- [x] `readonly canJoin`: uprościć do `status === 'ACTIVE' && now < startsAt`
- [x] `readonly canLeave`: zamienić na `lifecycleStatus === 'ENDED' || lifecycleStatus === 'CANCELLED'`
- [x] `readonly ctaLabel`: uprościć — "Zapisz się" (zalogowany) / "Zaloguj się, aby dołączyć" (niezalogowany)
- [x] `resolveLifecycleStatus()`: uprościć — użyć `this.lifecycleStatus()` bezpośrednio
- [x] `resolveStatusBarContent()`: usunąć logikę per-phase. UPCOMING → generyczny "Nadchodzące wydarzenie" / "Zapisz się"
- [x] `resolveStatusBarActionButton()`: usunąć zależność od `enrollmentPhase`
- [x] `lifecycleBannerVariant`: zaktualizować do `lifecycleStatus`
- [x] Effect `showInactiveModal`: zaktualizować do `lifecycleStatus`
- [x] Obsługa błędu `confirmJoin()`: rozszerzyć o wyświetlanie `suggestion` — `err.error?.message + (err.error?.suggestion ? '. ' + err.error.suggestion : '')`
- [x] Zaktualizować `event-area.service.spec.ts`

---

### FRONTEND — komponenty UI

#### `event-status-messages.ts`

- [x] Usunąć `UPCOMING_PHASE_LABELS` (PRE_ENROLLMENT, LOTTERY_PENDING, OPEN_ENROLLMENT, NONE)
- [x] Dodać `UPCOMING` do `LIFECYCLE_STATUS_LABELS` z generycznym tekstem "Nadchodzące wydarzenie" / "Zapisz się"
- [x] Zachować `LIFECYCLE_STATUS_APPEARANCE`, `EVENT_STATUS_MESSAGES`
- [x] `EventLifecycleStatus` zostaje jako główny typ statusu

#### `event-status-bar-details-overlay` (przepisanie — duży scope)

- [x] Usunąć inputy `enrollmentPhase` i `eventTimeStatus` — zamienić na `lifecycleStatus` input
- [x] Usunąć computed: `statusTitle`, `statusDescription`, `showLotteryDate`, `showParticipantCount` oparte na `enrollmentPhase`
- [x] `showSteps` uprościć: `lifecycleStatus === 'UPCOMING'`
- [x] Przepisać `steps`, `joinInstructions`, `importantNotes` — usunąć per-phase logikę, zastąpić generycznym contentem UPCOMING
- [x] Zaktualizować `statusBorderClass`, `statusBgClass`, `statusTextClass` — oprzeć na `lifecycleStatus`
- [x] Usunąć lottery countdown z szablonu (nie dotyczy koncepcji faz)

#### `event-detail.component.ts`

- [x] Usunąć `readonly isPreEnrollment` (linia 129) — wziąć z `eventArea.isPreEnrollment`
- [x] Usunąć `readonly enrollmentPhase` delegation (linia 94)
- [x] Usunąć `readonly eventTimeStatus` delegation (linia 95) — zamienić na `lifecycleStatus`
- [x] Zaktualizować efekt countdown: użyć `lifecycleStatus !== 'ENDED' && lifecycleStatus !== 'CANCELLED'`
- [x] Zaktualizować `event-detail.component.html` — `_phase` / `_isPreEnrollment` zamienić na `eventArea.isPreEnrollment()`
- [x] Zaktualizować `event-detail.component.spec.ts`

#### `enrollment-grid.component.ts`

- [x] Usunąć `enrollmentPhase` computed (linia 55–56)
- [x] Zamienić `isPreEnrollment` na obliczany z dat (z event'a) lub pobrany z wstrzykniętego serwisu
- [x] Zaktualizować `enrollment-grid.component.html`
- [x] Zaktualizować `enrollment-grid.component.spec.ts`

#### `my-events.component.ts`

- [x] Zamienić import `EventTimeStatus` z `@zgadajsie/shared` na `EventLifecycleStatus`
- [x] Zaktualizować porównania `EventTimeStatus.ONGOING` / `EventTimeStatus.ENDED` na string literals

#### `event-status-bar-item`, `event-status-bar-sticky`, `event-status-bars-inline`

- [x] Zweryfikowano — nie było obsługi faz (`enrollmentPhase`-based content)
- [x] Wyświetlana treść oparta wyłącznie na `EventLifecycleStatus` + `waitingReason`

#### CTA — ujednolicenie nazewnictwa

- [x] Zamienić wszystkie warianty CTA na **"Zapisz się"** (w `STATUS_BAR_ACTION_LABELS` i `ctaLabel`)
- [x] Przeszukano szablony — pozostałe "Dołącz" to treści opisowe (FAQ, terms, chat), nie CTA

#### `organizer-actions-overlay.component.ts`

- [x] Zaktualizowano — używa `getEventLifecycleStatus` zamiast `eventTimeStatus`

#### `bottom-overlays.component.ts` / `bottom-overlays.service.ts`

- [x] Zaktualizowano — przekazywanie `lifecycleStatus` zamiast `enrollmentPhase` / `eventTimeStatus`

---

### DESIGN SYSTEM

- [x] Zaktualizowano `/dev/design-system` — status bary używają `LIFECYCLE_STATUS_LABELS.UPCOMING`
- [x] `docs/design-tokens.md` — brak zmian w tokenach (nie dotyczy)

---

## Kolejność implementacji

1. **Libs** — dodać `EnrollmentBlockedResponse`, usunąć stare enumy
2. **Backend** — zaktualizować `assertJoinEligibility()` + usunąć pola z `events.service.ts`
3. **Frontend typy** — usunąć pola z `event.interface.ts`, zaktualizować utils
4. **`event-area.service.ts`** — przepisać computed properties
5. **Komponenty UI** — uprościć status bary, przepisać details overlay
6. **Obsługa błędu zapisu** — toast z message + suggestion
7. **Testy** — zaktualizować wszystkie spec pliki
8. **Design system** — weryfikacja strony `/dev/design-system`
