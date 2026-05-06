# Cleanup: Legacy Event Series Fields

## Cel

Usunięcie legacy pól związanych z powtarzającymi się wydarzeniami po pełnym wdrożeniu nowego systemu `EventSeries`.

## Legacy pola do usunięcia

### Prisma Schema (backend/prisma/schema.prisma)

W modelu `Event`:

- `isRecurring Boolean @default(false)` (linia 212)
- `recurringRule String?` (linia 213)
- `parentEventId String?` (linia 214)
- Relacja `parentEvent Event? @relation("RecurringEvents", fields: [parentEventId], references: [id])` (linia 229)
- Relacja `childEvents Event[] @relation("RecurringEvents")` (linia 230)

## Warunki wstępne

1. **Wszystkie legacy dane skonwertowane** — backfill `20260505_event_series_backfill.ts` został uruchomiony pomyślnie
2. **Brak wydarzeń z `isRecurring: true` bez `seriesId`** — wszystkie legacy serie mają odpowiadający rekord `EventSeries`
3. **Nowy system EventSeries stabilny** — cron generujący nowe wydarzenia działa poprawnie
4. **Brak zależności w kodzie** — żaden kod backend/frontend nie używa już legacy pól

## Procedura czyszczenia

### 1. Weryfikacja danych

Sprawdź, czy nie ma wydarzeń z `isRecurring: true` bez przypisanego `seriesId`:

```sql
SELECT id, title, isRecurring, recurringRule, parentEventId, seriesId
FROM "Event"
WHERE isRecurring = true AND seriesId IS NULL;
```

Jeśli wynik jest pusty → można kontynuować.

### 2. Usunięcie legacy pól ze schematu Prisma

Utwórz migrację usuwającą pola:

```prisma
// backend/prisma/schema.prisma - model Event
// USUNIĘTE:
// isRecurring Boolean @default(false)
// recurringRule String?
// parentEventId String?
// parentEvent Event? @relation("RecurringEvents", fields: [parentEventId], references: [id])
// childEvents Event[] @relation("RecurringEvents")
```

Uruchom migrację:

```bash
cd backend
npx prisma migrate dev --name remove_legacy_event_series_fields
```

### 3. Usunięcie pliku backfill

Usuń plik migracji danych:

```bash
rm backend/prisma/data-migrations/20260505_event_series_backfill.ts
```

### 4. Usunięcie skryptu z package.json

Usuń linię z `package.json`:

```json
// USUNIĘTE:
"backend:db:backfill:event-series": "cd backend && dotenv -e ../config/env/.env.local -- npx tsx prisma/data-migrations/20260505_event_series_backfill.ts"
```

### 5. Aktualizacja dokumentacji

- Zaktualizuj `docs/tasks/series_of_events_implementation.md` — oznacz sekcję 2.3 jako zakończoną i usuniętą
- Usuń lub zaktualizuj odwołania do legacy pól w `docs/api-endpoints.md` (jeśli istnieją)

### 6. Weryfikacja kodu

Sprawdź, czy kod nie używa już usuniętych pól:

```bash
# Backend
cd backend
grep -r "isRecurring" src/
grep -r "recurringRule" src/
grep -r "parentEventId" src/

# Frontend
cd frontend
grep -r "isRecurring" src/
grep -r "recurringRule" src/
grep -r "parentEventId" src/
```

Jeśli znaleziono odwołania — zrefaktoryzuj kod przed usunięciem pól.

### 7. Testy

Uruchom pełny zestaw testów:

```bash
pnpm test:ci
pnpm build
```

## Rollback

Jeśli po usunięciu pól wystąpią problemy, można przywrócić migrację:

```bash
cd backend
npx prisma migrate resolve --rolled-back remove_legacy_event_series_fields
```

Następnie przywrócić pola w schemacie i uruchomić `npx prisma migrate dev`.

## Status

- [ ] Weryfikacja danych (brak `isRecurring: true` bez `seriesId`)
- [ ] Usunięcie legacy pól ze schematu Prisma
- [ ] Usunięcie pliku backfill
- [ ] Usunięcie skryptu z package.json
- [ ] Aktualizacja dokumentacji
- [ ] Weryfikacja kodu (brak odwołań do legacy pól)
- [ ] Testy (test:ci + build)
