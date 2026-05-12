# Ukrywanie wolnych slotów gdy zapisy są niemożliwe

## Problem

Na liście uczestników wydarzenia (`EnrollmentGridComponent`) pojawiają się placeholdery wolnych slotów (`variant="free"`/`variant="locked"`) także wtedy, gdy zapisy nie są już możliwe — np. po starcie wydarzenia, po jego zakończeniu albo po anulowaniu. Sugeruje to użytkownikowi, że może jeszcze dołączyć, mimo że żadna interakcja w gridzie nie zakończy się sukcesem.

## Cel

Gdy zapisy są zamknięte:

- nie generować placeholderów `free` ani `locked` w sekcji `assigned`,
- pozostawić sekcje `pending` i `withdrawn` bez zmian (mają wartość archiwalną),
- pozostawić `app-capacity-progress` jako podsumowanie obsadzenia.

## Definicja "zapisy niemożliwe"

Wykorzystujemy istniejące helpery z `frontend/src/app/shared/utils/event-time-status.util.ts`:

- `isEventJoinable(startsAt, status)` zwraca `true` tylko gdy `status === ACTIVE` i `now < startsAt`.
- Negacja `!isEventJoinable(...)` pokrywa: ONGOING, ENDED, CANCELLED.

## Decyzje projektowe

1. **Wykorzystujemy `!isEventJoinable(...)`** zamiast wprowadzać nową definicję. Pre-enrollment (przed losowaniem) nie jest objęty zmianą — w tym trybie i tak działa osobny placeholder "Trwają wstępne zapisy" (`enrollment-grid.component.html:1`).
2. **Nie reużywamy `readOnly`** — ma inną semantykę ("nie pozwól klikać"; admin nadal edytuje zakończone wydarzenie, więc dla niego grid nie jest readOnly, ale wolne sloty i tak nie powinny się pojawiać).
3. **Ukrywamy zarówno `free`, jak i `locked`** — locked również sugeruje że "kiedyś się otworzy", co po starcie wydarzenia jest mylące.

## Zakres zmian

### 1. `EnrollmentGridComponent` — nowa flaga `enrollmentClosed`

Plik: `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid.component.ts`

Dodać import:

```ts
import {
  isPreEnrollment as isPreEnrollmentFn,
  isEventJoinable,
} from '../../../utils/event-time-status.util';
```

Dodać computed obok `isPreEnrollment` (~linia 62):

```ts
readonly enrollmentClosed = computed(() => {
  const e = this.event();
  return !isEventJoinable(e.startsAt, e.status);
});
```

### 2. `buildSlotItems` — pomijać empty placeholdery gdy zamknięte

Plik: ten sam, metoda `buildSlotItems` (~linia 190).

Aktualnie metoda dorzuca placeholdery w dwóch gałęziach:

- `allSlots.length > 0` → mapuje wszystkie sloty (puste sloty stają się `participant: null`),
- `allSlots.length === 0` → pętla generująca `emptyCount` placeholderów.

Po zmianie:

```ts
private buildSlotItems(
  allSlots: EventSlotInfo[],
  participants: EnrollmentItem[],
  totalSlots: number,
  roleKey: string | null,
): SlotItem[] {
  const closed = this.enrollmentClosed();

  if (allSlots.length > 0) {
    const roleSlots = roleKey ? allSlots.filter((s) => s.roleKey === roleKey) : allSlots;
    const items = roleSlots
      .map((slot) => ({
        slotData: { slotId: slot.id, locked: slot.locked, slot },
        participant: participants.find((p) => slot.enrollmentId === p.id) ?? null,
      }))
      .filter((item) => !closed || item.participant !== null);

    return items.sort((a, b) => {
      if (a.participant && !b.participant) return -1;
      if (!a.participant && b.participant) return 1;
      if (!a.participant && !b.participant) {
        if (a.slotData.locked && !b.slotData.locked) return 1;
        if (!a.slotData.locked && b.slotData.locked) return -1;
      }
      return 0;
    });
  }

  const items: SlotItem[] = participants.map((p) => ({
    slotData: { slotId: undefined, locked: false, slot: null },
    participant: p,
  }));

  if (!closed) {
    const emptyCount = Math.max(0, totalSlots - participants.length);
    for (let i = 0; i < emptyCount; i++) {
      items.push({ slotData: { slotId: undefined, locked: false, slot: null }, participant: null });
    }
  }

  return items;
}
```

### 3. (Opcjonalnie) `onSlotItemClick` — zabezpieczenie

Plik: ten sam, `onSlotItemClick` (~linia 163).

Po zmianie pustych slotów już nie będzie w gridzie, więc kliknięcie w "wolne miejsce" jest niemożliwe. Nie wymaga to dodatkowej obsługi — readOnly pozostaje niezależny i blokuje również realnych uczestników w trybie zakończonego wydarzenia (kontekst organizatora).

### 4. Pre-enrollment — bez zmian

Sekcja `@if (isPreEnrollment())` w `enrollment-grid.component.html` ma pierwszeństwo i nie jest modyfikowana.

## Wpływ na inne miejsca

- `event-enrollments.component` (publiczny widok wydarzenia) — automatycznie korzysta z nowego zachowania.
- `event-manage.component` (organizator) — również korzysta automatycznie. Jeśli organizator po zamknięciu zapisów nadal powinien widzieć puste sloty (np. żeby ręcznie kogoś dosadzić), trzeba dodać input `forceShowEmptySlots` i przekazać go w widoku organizatora. **Domyślnie zakładamy, że nie powinien** — po starcie/zakończeniu wydarzenia ręczne dosadzanie nie ma sensu.
- `EventUserParticipantsComponent` (`shared/enrollment/ui/event-user-participants`) używa `app-enrollment-grid-item-empty` w wariancie `add` ("Dodaj nowego") niezależnie od grida — tam zmiana nie ma zastosowania, ale warto sprawdzić, czy widok dodawania uczestnika nie pojawia się po zamknięciu zapisów (osobny temat, poza zakresem tego zadania).

## Testy

Plik: `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid.component.spec.ts`

Dodać przypadki:

1. Wydarzenie ACTIVE + przed `startsAt` → puste sloty są generowane (zachowanie dotychczasowe).
2. Wydarzenie ACTIVE + po `startsAt` (ONGOING) → puste sloty są pominięte; uczestnicy są widoczni.
3. Wydarzenie po `endsAt` (ENDED) → puste sloty są pominięte.
4. Wydarzenie CANCELLED → puste sloty są pominięte.
5. Wariant z `allSlots.length > 0` (sloty istnieją w bazie) i wariant bez slotów — oba muszą filtrować placeholdery.
6. Capacity progress nadal renderuje się prawidłowo w trybie zamkniętych zapisów.

## Manualna weryfikacja

1. Uruchomić dev server (`npm run dev` lub odpowiednia komenda z `docs/project-commands.md`).
2. Seed danych zawiera wydarzenia w różnych stanach — sprawdzić w przeglądarce widok `/w/<city>/<eventId>/enrollments` dla:
   - wydarzenia nadchodzącego (puste sloty widoczne),
   - wydarzenia w trakcie (puste sloty ukryte),
   - wydarzenia zakończonego (puste sloty ukryte),
   - wydarzenia anulowanego (puste sloty ukryte).
3. Zweryfikować, że sekcje `pending` i `withdrawn` nadal się wyświetlają.

## Out of scope

- Zmiany w treści sekcji nagłówka (np. "Trwają zapisy" vs "Zapisy zamknięte") — można rozważyć osobno.
- Przepisanie `readOnly` na bardziej granularny model uprawnień — osobne zadanie.
- Zachowanie w `EventUserParticipantsComponent` (placeholder "Dodaj nowego" po zamknięciu zapisów).
