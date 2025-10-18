# Komendy projektu ZgadajSię

Ten dokument opisuje wszystkie dostępne komendy w projekcie ZgadajSię po migracji do wspólnego package.json.

## Komendy ogólne

| Komenda | Opis |
|---------|------|
| `pnpm start` | Uruchamia bazę danych, a następnie równolegle aplikację frontendową i backendową. |
| `pnpm build` | Buduje zarówno frontend jak i backend. |
| `pnpm test` | Uruchamia testy dla frontendu i backendu. |

## Komendy dla frontendu

| Komenda | Opis |
|---------|------|
| `pnpm frontend:serve` | Uruchamia serwer deweloperski Angular dla aplikacji frontendowej. Aplikacja jest dostępna pod adresem http://localhost:4200. |
| `pnpm frontend:build` | Buduje aplikację frontendową z użyciem Angular CLI. |
| `pnpm frontend:test` | Uruchamia testy jednostkowe dla aplikacji frontendowej z użyciem Jest. |

## Komendy dla backendu

| Komenda | Opis |
|---------|------|
| `pnpm backend:serve` | Uruchamia serwer backendowy NestJS w trybie deweloperskim z automatycznym przeładowaniem po zmianach. API jest dostępne pod adresem http://localhost:3000/api. |
| `pnpm backend:build` | Kompiluje kod backendowy przy użyciu webpack. |
| `pnpm backend:test` | Uruchamia testy jednostkowe dla backendu. |
| `pnpm backend:start:db` | Uruchamia bazę danych PostgreSQL i PGAdmin jako kontenery Docker. |
| `pnpm backend:db:seed` | Wypełnia bazę danych przykładowymi danymi określonymi w skrypcie seed.ts. |

## Komendy dla Prisma ORM

| Komenda | Opis |
|---------|------|
| `pnpm prisma:generate` | Generuje klienta Prisma na podstawie schematu w `backend/prisma/schema.prisma`. Ta komenda jest wymagana po zmianach w schemacie bazy danych. |
| `pnpm prisma:migrate` | Uruchamia migrację bazy danych, tworząc nowy plik migracji na podstawie zmian w schemacie Prisma. |
| `pnpm prisma:studio` | Uruchamia graficzny interfejs Prisma Studio do zarządzania danymi w bazie danych pod adresem http://localhost:5555. |

## Uwagi

1. Po zmianie schematu Prisma (`backend/prisma/schema.prisma`) należy wykonać `pnpm prisma:generate`, aby zaktualizować typy.
2. Komenda `pnpm start` automatycznie uruchamia bazę danych przed uruchomieniem frontendu i backendu, więc nie ma już potrzeby osobnego uruchamiania `pnpm backend:start:db` przed `pnpm start`.
3. Główny plik package.json zawiera teraz wszystkie zależności, zarówno dla frontendu jak i backendu - nie ma potrzeby instalowania zależności w poszczególnych katalogach.

## Przykłady użycia

### Uruchomienie całego projektu w trybie deweloperskim

```bash
# Jedno polecenie uruchomi bazę danych, frontend i backend
pnpm start
```

### Praca tylko nad frontendem

```bash
pnpm frontend:serve
```

### Aktualizacja schematu bazy danych

```bash
# Wykonaj zmiany w pliku backend/prisma/schema.prisma
# Następnie wygeneruj klienta i stwórz migrację
pnpm prisma:generate
pnpm prisma:migrate
```

### Zarządzanie danymi przez interfejs graficzny

```bash
pnpm prisma:studio
```