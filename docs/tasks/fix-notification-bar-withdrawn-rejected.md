# Fix: pasek statusu dla WITHDRAWN/REJECTED

## Problem

`notificationBars` w `EventAreaService` pokazuje "Jesteś zapisany" nawet gdy wszystkie participacje usera mają status `WITHDRAWN` lub `REJECTED`.

Źródło błędu: `currentUserParticipations()` (linia ~98-104) zwraca **wszystkie** participacje bez filtrowania po statusie. Warunek w `notificationBars` (linia ~185-221) sprawdza tylko `userParticipations.length > 0`, co jest prawdą nawet dla samych wycofanych.

## Scenariusze do obsłużenia

| Participacje usera                             | Oczekiwane zachowanie                     |
| ---------------------------------------------- | ----------------------------------------- |
| Wszystkie aktywne (PENDING/APPROVED/CONFIRMED) | "Jesteś zapisany" z awatarami             |
| Mieszane (aktywne + wycofane)                  | "Jesteś zapisany" — tylko aktywne awatary |
| Wszystkie WITHDRAWN/REJECTED                   | Domyślny pasek statusu wydarzenia         |
| Brak participacji                              | Bez zmian                                 |

## Wariant A — minimalny fix (rekomendowany)

W `notificationBars` przefiltrować participacje do aktywnych przed sprawdzeniem warunku:

```ts
const activeParticipations = userParticipations.filter(
  (p) => p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'CONFIRMED',
);

if (lifecycleStatus === 'UPCOMING' && activeParticipations.length > 0) {
  bars.push({ title: 'Jesteś zapisany:' /* ... awatary z activeParticipations */ });
}
```

**Zaleta:** minimalny zakres zmian, poprawna semantyka.  
**Wada:** user z samymi WITHDRAWN/REJECTED nie widzi śladu w pasku — ale `MyParticipationDetailsOverlay` obsługuje ten stan i pokazuje CTA "Dołącz ponownie", więc to akceptowalne.

## Wariant B — bogatszy UX

Dodatkowo, gdy user ma **wyłącznie** WITHDRAWN/REJECTED i wydarzenie jest nadal joinable, pokazać pasek "Byłeś zapisany":

```ts
const withdrawnParticipations = userParticipations.filter(
  (p) => p.status === 'WITHDRAWN' || p.status === 'REJECTED',
);

if (activeParticipations.length === 0 && withdrawnParticipations.length > 0 && this.canJoin()) {
  bars.push({ id: 'rejoin', title: 'Byłeś zapisany', subtitle: 'Dołącz ponownie' /* ... */ });
}
```

**Zaleta:** proaktywne CTA dla wycofanych.  
**Wada:** dodatkowa logika, dodatkowy stan paska.

## Rekomendacja

**Wariant A** — wystarczający. Wariant B warto dodać tylko jeśli zależy na proaktywnym CTA dla wycofanych.
