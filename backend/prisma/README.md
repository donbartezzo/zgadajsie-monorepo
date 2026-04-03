# Prisma Migrations & Seeding

Dokument opisuje zasady pracy z migracjami i seedami w projekcie.

## Zasady ogólne

### Migracje

- **Local**: `prisma migrate dev` — tworzy nowe migracje, aktualizuje bazę
- **Dev/Prod**: `prisma migrate deploy` — tylko aplikuje istniejące migracje
- **NIGDY** nie uruchamiaj `prisma migrate dev` na środowiskach zdalnych (dev/prod)

### Seedy

Projekt używa dwóch seedów:

#### 1. `seed.nonprod.ts` (local + dev)

- **Przeznaczenie**: Środowiska deweloperskie (local, dev)
- **Zawiera**: Dane słownikowe + konta testowe + przykładowe wydarzenia
- **Destrukcyjny**: Czyści całą bazę przed seedowaniem
- **Hasła**: Zawiera hardcoded hasła testowe (np. `Admin123!`)
- **Kiedy używać**: Lokalne testy, reset bazy dev

#### 2. `seed.prod.ts` (prod)

- **Przeznaczenie**: Środowisko produkcyjne
- **Zawiera**: Tylko dane słownikowe (miasta, dyscypliny, obiekty, poziomy)
- **Bezpieczny**: Nie usuwa istniejących danych, używa `upsert`
- **Idempotentny**: Można uruchomić wielokrotnie bez ryzyka
- **Kiedy używać**: Inicjalizacja prod, aktualizacja słowników

## Dane słownikowe

- **Miasta**: Zielona Góra (docelowo więcej miast)
- **Dyscypliny**: piłka nożna, siatkówka, koszykówka, tenis, badminton, squash, bieganie, kolarstwo, pływanie, rzutki, szachy, tenis stołowy
- **Obiekty**: orlik, hala sportowa, balon, boisko syntetyczne, boisko trawiaste, kort, stadion, siłownia, basen, park, plaża
- **Poziomy zaawansowania**: hierarchia wag (NULL dla "Mieszany (open)", 1-6 dla poziomów)

## Komendy

### Local (development)

```bash
# Generuj klienta Prisma
pnpm prisma:generate

# Stwórz nową migrację (tylko local!)
pnpm prisma:migrate

# Reset bazy + seed nonprod
pnpm db:reset:local

# Tylko seed nonprod
pnpm backend:db:seed

# Prisma Studio
pnpm prisma:studio
```

### Remote (dev/prod)

```bash
# Setup zdalnej bazy dev (przez tunel SSH)
pnpm db:reset:remote dev   # seed nonprod (CZYŚCI BAZĘ!)
pnpm db:reset:remote prod  # seed prod (bezpieczny)
```

**UWAGA**: `pnpm db:reset:remote dev` czyści całą bazę przed seedowaniem. Używaj ostrożnie.

### Produkcja (automatyczne)

W środowisku produkcyjnym migracje i seed prod są uruchamiane automatycznie przy każdym starcie backendu przez `docker-entrypoint.sh`:

```sh
prisma migrate deploy
tsx prisma/seed.prod.ts
node main.js
```

## Porównanie seedów

| Cecha                  | seed.nonprod.ts    | seed.prod.ts    |
| ---------------------- | ------------------ | --------------- |
| Przeznaczenie          | Local + Dev        | Prod            |
| Czyszczenie danych     | ✅ Tak             | ❌ Nie          |
| Dane testowe           | ✅ Tak             | ❌ Nie          |
| Wydarzenia przykładowe | ✅ Tak             | ❌ Nie          |
| Konta testowe          | ✅ Tak (Admin123!) | ❌ Nie          |
| Idempotentność         | ❌ Nie             | ✅ Tak (upsert) |
| Bezpieczeństwo         | ❌ Hasła w kodzie  | ✅ Bezpieczny   |

## Najważniejsze zasady

1. **Migracje tworzymy tylko lokalnie** (`prisma migrate dev`)
2. **Na dev/prod tylko aplikujemy** (`prisma migrate deploy`)
3. **Seed nonprod czyści bazę** — używaj tylko local/dev
4. **Seed prod jest bezpieczny** — można uruchamiać wielokrotnie
5. **Nigdy nie uruchamiaj `prisma migrate dev` na środowiskach zdalnych**
