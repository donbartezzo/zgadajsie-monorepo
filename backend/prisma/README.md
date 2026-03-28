# Inicjalizacja danych produkcyjnych

Ten dokument opisuje jak wgrać podstawowe dane słownikowe na środowisko produkcyjne.

## Czym są dane słownikowe?

Dane słownikowe to podstawowe dane niezbędne do działania aplikacji:

- **Miasta** - Zielona Góra (docelowo więcej miast dodawanych pojedynczo)
- **Dyscypliny sportowe** - piłka nożna, siatkówka, koszykówka, tenis, badminton, squash, bieganie, kolarstwo, pływanie, rzutki, szachy, tenis stołowy
- **Obiekty sportowe** - orlik, hala sportowa, balon, boisko syntetyczne, boisko trawiaste, kort, stadion, siłownia, basen, park, plaża
- **Poziomy zaawansowania** - z hierarchią wag (NULL dla "Mieszany (open)", 1-6 dla poziomów)
- **Ustawienia systemowe** - opłaty, limity, prowizje

## Hierarchia poziomów zaawansowania

Poziomy mają hierarchię opisaną przez wagę (`weight`):

| Waga | Nazwa           | Opis                        |
| ---- | --------------- | --------------------------- |
| NULL | Mieszany (open) | Dla każdego, bez ograniczeń |
| 1    | Początkujący    | Początkujący gracze         |
| 2    | Rekreacyjny     | Gra rekreacyjna             |
| 3    | Regularny       | Regularne granie            |
| 4    | Solidny         | Solidny poziom              |
| 5    | Zaawansowany    | Zaawansowani gracze         |
| 6    | Zawodowy        | Poziom zawodowy             |

Poziom "Mieszany (open)" jest opcją (weight = NULL) - oznacza że wydarzenie jest dla każdego. Pozostałe poziomy określają minimalny wymagany poziom i służą do filtrowania.

## Skrypty

### 1. `seed.ts` (deweloperski)

- **Cel**: Środowiska deweloperskie/testowe
- **Zawiera**: Dane testowe + przykładowe wydarzenia + konta testowe
- **Czści**: Usuwa wszystkie dane przed wgraniem
- **Niebezpieczny**: Zawiera hasła w kodzie

### 2. `seed-production.ts` (produkcyjny)

- **Cel**: Środowisko produkcyjne
- **Zawiera**: Tylko dane słownikowe
- **Bezpieczny**: Nie usuwa istniejących danych
- **Idempotentny**: Można uruchomić wielokrotnie

## Deploy na produkcję

### Krok 1: Migracje bazy danych

```bash
# Stwórz strukturę tabel (jeśli nie istnieje)
pnpm prisma:migrate
```

### Krok 2: Inicjalizacja danych słownikowych

```bash
# Wgraj miasta, dyscypliny, obiekty, poziomy, ustawienia
pnpm prisma:seed:prod
```

### Krok 3: Stwórz konto admina

```bash
# Zarejestruj pierwszego admina przez formularz rejestracji
# lub użyj dedykowanego skryptu (jeśli istnieje)
```

## Kluczowe różnice

| Cecha                  | seed.ts           | seed-production.ts |
| ---------------------- | ----------------- | ------------------ |
| Przeznaczenie          | Dev/Test          | Produkcja          |
| Czyszczenie danych     | ✅ Tak            | ❌ Nie             |
| Dane testowe           | ✅ Tak            | ❌ Nie             |
| Wydarzenia przykładowe | ✅ Tak            | ❌ Nie             |
| Konta testowe          | ✅ Tak            | ❌ Nie             |
| Idempotentność         | ❌ Nie            | ✅ Tak             |
| Bezpieczeństwo         | ❌ Hasła w kodzie | ✅ Bezpieczny      |

## Automatyzacja (opcjonalnie)

W procesie CI/CD można dodać krok:

```yaml
# Przykład dla GitHub Actions
- name: Seed production data
  run: pnpm prisma:seed:prod
  if: github.ref == 'refs/heads/main'
```

## Sprawdzenie

Po wgraniu danych można sprawdzić zawartość:

```bash
# Sprawdź liczbę miast
pnpm prisma studio
# lub zapytanie SQL
SELECT COUNT(*) FROM "City";
SELECT COUNT(*) FROM "EventDiscipline";
SELECT COUNT(*) FROM "EventFacility";
SELECT COUNT(*) FROM "EventLevel";
```

## Uwagi

- Skrypt produkcyjny używa `skipDuplicates: true` - nie utworzy duplikatów
- Nie usuwa żadnych istniejących danych
- Można go uruchomić wielokrotnie bez ryzyka
- Nie zawiera żadnych danych wrażliwych
- Miasta są dodawane pojedynczo - obecnie tylko Zielona Góra
- Poziomy mają hierarchię wag dla przyszłego filtrowania
