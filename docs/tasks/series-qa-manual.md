# Serie wydarzeń — manualne QA

> Scenariusze do wykonania raz po deploymencie na środowisko dev/staging z działającą bazą danych.
> Każdy scenariusz oznacz `[x]` po pozytywnej weryfikacji.

## Wymagania wstępne

- Działające środowisko: `pnpm start` (DB + backend `localhost:3000` + frontend `localhost:4200`)
- Prisma Studio dostępne: `pnpm prisma:studio` → `localhost:5555`
- Dwa konta użytkowników:
  - **Konto A** — organizator (konto testowe, aktywne)
  - **Konto B** — drugi użytkownik (aktywne, inne konto)
- Dostęp do bazy (Prisma Studio lub `psql`) do inspekcji rekordów

---

## S1 — Tworzenie serii INTERVAL co 7 dni

**Cel:** Weryfikacja że po utworzeniu serii INTERVAL pojawia się prawidłowy bufor 30-dniowy.

### Kroki

1. Zaloguj się jako **Konto A**.
2. Przejdź do `localhost:4200/o/w/new`.
3. Wypełnij pola podstawowe wydarzenia (tytuł, miasto, dyscyplina, lokalizacja).
4. W sekcji **„Seria wydarzeń"** zaznacz checkbox „Powtarzaj wydarzenie".
5. Wybierz tryb **INTERVAL**, wpisz **co 7 dni**.
6. Ustaw godzinę, np. `20:00`, czas trwania `90 min`.
7. Ustaw `Data startu` = jutro, `Data końca` = puste (seria bez końca).
8. Kliknij **Utwórz serię**.

### Weryfikacja

- [ ] Redirect do `/series/:id` — strona ładuje się bez błędu.
- [ ] Na liście nadchodzących wydarzeń widoczne **4 lub 5 instancji** (30 dni ÷ 7 = ~4,3).
- [ ] Każda instancja ma tę samą godzinę lokalną (`20:00`).
- [ ] W Prisma Studio (`EventSeries`): `isActive = true`, `nextGenerationAt` ustawione (zwykle teraz + ~29 dni), `lastGeneratedAt` ustawione.
- [ ] W Prisma Studio (`Event`): wszystkie instancje mają `seriesId` = ID nowej serii, `status = PENDING`.

---

## S2 — Tworzenie serii WEEKLY (pon + czw)

**Cel:** Weryfikacja że seria WEEKLY generuje poprawne dni tygodnia.

### Kroki

1. Jako **Konto A** — przejdź do `localhost:4200/o/w/new`.
2. Zaznacz checkbox serii.
3. Wybierz tryb **WEEKLY**, zaznacz: **Poniedziałek** i **Czwartek**.
4. Ustaw godzinę, np. `18:00`, czas trwania `60 min`.
5. `Data startu` = ten poniedziałek lub następny, `Data końca` = puste.
6. Kliknij **Utwórz serię**.

### Weryfikacja

- [ ] Na liście nadchodzących wydarzeń widoczne **8–9 instancji** (30 dni ÷ 3,5 dnia/instancja ≈ 8–9).
- [ ] Każda instancja przypada na poniedziałek lub czwartek (sprawdź w widoku serii lub Prisma Studio).
- [ ] Godzina = `18:00` w każdej instancji (UTC: zależnie od DST, np. `17:00` lub `16:00`).
- [ ] Status każdego eventu = `PENDING`.

---

## S3 — Rolling buffer (manualny cron)

**Cel:** Weryfikacja że cron generuje kolejne wydarzenia gdy bufor kończy się w czasie.

### Kroki

1. Znajdź serię z S1 lub S2 w Prisma Studio (`EventSeries`).
2. Ustaw ręcznie:
   - `nextGenerationAt` = **wczoraj** (lub dowolna data w przeszłości)
   - `lastGeneratedAt` = **10 dni temu** (symuluje że ostatnio generowaliśmy 10 dni temu, więc zostały tylko ~20 dni buforu)
3. Zapisz zmiany w Prisma Studio.
4. Poczekaj do następnego taktu crona (co 30 minut) **lub** uruchom ponownie backend (`pnpm backend:serve` restart).

   > Cron uruchamia się co 30 minut (`EVERY_30_MINUTES`) — restart backendu nie wyzwoli crona natychmiast, ale po pierwszym takcie.
   > Alternatywa szybsza: zrestartuj backend i ustaw `nextGenerationAt` = 1 minuta temu, co sprawi że w ciągu ~30 min cron go przejmie.

5. Po przebiegu crona odśwież stronę `/series/:id`.

### Weryfikacja

- [ ] Liczba widocznych nadchodzących wydarzeń **wzrosła** (bufor uzupełniony do ~30 dni od teraz).
- [ ] W Prisma Studio `lastGeneratedAt` i `nextGenerationAt` zostały zaktualizowane.
- [ ] Logi backendu zawierają linię `Event series cron: created N new events` lub `Event series cron: processing 1 series`.
- [ ] Nowo wygenerowane eventy mają `status = PENDING` i wygenerowany `confirmToken`.

---

## S4 — Edycja serii — regeneracja przyszłych wydarzeń

**Cel:** Weryfikacja że edycja serii (np. godziny) regeneruje przyszłe puste eventy, ale nie narusza eventów z zapisami.

### Przygotowanie

1. Użyj serii z S1 lub S2 — upewnij się, że ma min. 3 przyszłe PENDING eventy.
2. Jako **inny użytkownik (Konto B)** — zapisz się na pierwsze wydarzenie z tej serii (przełącz je najpierw na ACTIVE przez Prisma Studio lub endpoint confirm, żeby zapis był możliwy).

   Szybsza opcja (Prisma Studio):
   - Znajdź jeden z PENDING eventów serii.
   - Ustaw `status = ACTIVE`.
   - Dodaj ręcznie jeden `EventEnrollment` z `userId = ID Konta B`, `eventId = ID tego eventu`.

3. Zanotuj: stara godzina, ID eventu z zapisem, liczba eventów bez zapisów.

### Kroki edycji

4. Zaloguj się jako **Konto A** na stronie `/series/:id`.
5. Kliknij **Edytuj serię**.
6. Zmień godzinę (np. z `20:00` na `19:30`).
7. Zatwierdź edycję.

### Weryfikacja

- [ ] Strona serii odświeżona — widoczne odświeżone daty z nową godziną.
- [ ] Event **z zapisem** (Konta B) — jego `startsAt` **nie zmieniła się** (sprawdź ID w Prisma Studio).
- [ ] Eventy **bez zapisów** — zostały usunięte i wygenerowane na nowo z nową godziną.
- [ ] Liczba nadchodzących wydarzeń porównywalna z przed edycją (bufor odtworzony).
- [ ] Logi nie zawierają błędów.

---

## S5 — DST: stałość godziny lokalnej po zmianie czasu

**Cel:** Weryfikacja że seria nie „przesuwa się" o godzinę przy przejściu zima→lato (last Sunday of March).

> Polska (Europe/Warsaw): zmiana czasu w 2026 — **niedziela 29 marca 2026** o 02:00 (→ 03:00).

### Przygotowanie

1. Jako **Konto A** stwórz serię INTERVAL co 7 dni z godziną **20:00** Europe/Warsaw.
2. Ustaw `startDate` = `2026-03-19` (czwartek przed zmianą czasu).
3. Ustaw bufor na 30 dni (domyślny).

### Weryfikacja w Prisma Studio

4. Otwórz Prisma Studio → tabela `Event` → filtruj po `seriesId`.
5. Sprawdź instancje:

   | Instancja         | Oczekiwana `startsAt` (UTC) | Godzina lokalna |
   | ----------------- | --------------------------- | --------------- |
   | 19 marca (zima)   | `2026-03-19T19:00:00.000Z`  | 20:00 CET       |
   | 26 marca (zima)   | `2026-03-26T19:00:00.000Z`  | 20:00 CET       |
   | 2 kwietnia (lato) | `2026-04-02T18:00:00.000Z`  | 20:00 CEST      |
   | 9 kwietnia (lato) | `2026-04-09T18:00:00.000Z`  | 20:00 CEST      |

- [ ] Godzina lokalna **zawsze 20:00** niezależnie od DST (offset UTC zmienia się, godzina lokalna stała).
- [ ] UTC offset: przed 29.03 = `+01:00` → po 29.03 = `+02:00` (różnica 1 godz. w UTC timestamps).
- [ ] Brak „przeskoku" o godzinę (np. 19:00 lub 21:00 lokalnie).

---

## S6 — autoCoverImage: różne covery dla instancji serii

**Cel:** Weryfikacja że każda instancja serii z `autoCoverImage = true` dostaje inną grafikę.

### Wymaganie wstępne

W bazie musi istnieć min. **4 cover images** dla wybranej dyscypliny (sprawdź w Prisma Studio → tabela `CoverImage` lub w panelu admina `/admin/cover-images`). Jeśli jest mniej, wygeneruj przez seed lub dodaj przez admin.

### Kroki

1. Jako **Konto A** stwórz serię INTERVAL co 7 dni z opcją **„Automatyczna grafika"** (`autoCoverImage: true`).
2. Użyj dyscypliny, dla której masz co najmniej 4 cover images.
3. Ustaw bufor 30 dni (wygeneruje ~4 instancje).

### Weryfikacja

4. W Prisma Studio → tabela `Event` → filtruj po `seriesId`:
   - [ ] Każda instancja ma `coverImageId` ustawiony (nie null).
   - [ ] Jeśli pool coverów ≥ 4 instancji: **wszystkie `coverImageId` są różne**.
   - [ ] Jeśli pool coverów < liczba instancji: covery się powtarzają, ale nie kolejno (LRU — ostatnio użyty wraca jako ostatni).

5. W UI (`/series/:id`) — miniatury eventów na liście wizualnie różnią się od siebie.

---

## S7 — Autoryzacja: GET /event-series/:id bez JWT

**Cel:** Weryfikacja że endpoint GET zwraca 401 dla niezalogowanego użytkownika.

### Kroki (curl lub DevTools)

```bash
# Pobierz ID istniejącej serii z Prisma Studio lub z poprzednich testów
SERIES_ID="<uuid>"

curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/event-series/$SERIES_ID
```

Lub w DevTools → Network: otwórz okno incognito (bez ciasteczek) i wejdź na `/series/:id` — sprawdź request do `/api/event-series/:id`.

### Weryfikacja

- [ ] HTTP status = **401** (Unauthorized).
- [ ] Odpowiedź JSON: `{ "statusCode": 401, "message": "Unauthorized" }`.
- [ ] Frontend na `/series/:id` — redirect do logowania (guard `verifiedUserGuard`).

---

## S8 — Autoryzacja: PATCH /event-series/:id przez innego użytkownika

**Cel:** Weryfikacja że edycja serii przez innego użytkownika zwraca 403.

### Przygotowanie

1. Zaloguj się jako **Konto A** i stwórz serię (lub użyj istniejącej). Zanotuj `SERIES_ID`.
2. Zaloguj się jako **Konto B** i pobierz jego JWT token (np. z DevTools → Application → Local Storage → `access_token`).

### Kroki (curl)

```bash
SERIES_ID="<uuid>"
TOKEN="<jwt-token-konta-B>"

curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Próba włamania"}' \
  http://localhost:3000/api/event-series/$SERIES_ID
```

### Weryfikacja

- [ ] HTTP status = **403** (Forbidden).
- [ ] Odpowiedź JSON zawiera komunikat `NOT_SERIES_ORGANIZER` lub `Forbidden`.
- [ ] Rekord serii w Prisma Studio **nie zmienił się** (name, time itd.).

---

## S9 — PENDING: widoczność w publicznym listingu

**Cel:** Weryfikacja że eventy z `status = PENDING` NIE pojawiają się w publicznym listingu `/w/:citySlug`.

### Przygotowanie

1. Utwórz serię (S1 lub S2) — wygenerowane eventy mają `status = PENDING`.
2. Zanotuj miasto (`citySlug`) serii.

### Kroki

3. Otwórz w **oknie incognito** (bez logowania): `localhost:4200/w/{citySlug}`.
4. Sprawdź czy wygenerowane PENDING eventy pojawiają się na liście.

### Weryfikacja

- [ ] Żaden z PENDING eventów serii **nie jest widoczny** na publicznej liście.
- [ ] Sprawdź przez API bezpośrednio:
  ```bash
  curl -s "http://localhost:3000/api/events?citySlug={citySlug}" | python3 -m json.tool | grep -E '"status"|PENDING'
  ```
  → wynik nie powinien zawierać `"status": "PENDING"`.

---

## S10 — PENDING: blokada bezpośredniego URL

**Cel:** Weryfikacja że niezalogowany użytkownik nie może otworzyć PENDING eventu przez bezpośredni link.

### Przygotowanie

1. Znajdź `id` jednego z PENDING eventów w Prisma Studio.
2. Znajdź jego `citySlug` (przez relację `city`).

### Kroki

```bash
EVENT_ID="<uuid>"
CITY_SLUG="<slug>"

# Niezalogowany
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/events/$EVENT_ID
```

Lub w przeglądarce incognito: `localhost:4200/w/{citySlug}/{eventId}`.

### Weryfikacja

- [ ] API: HTTP status = **404** (Not Found) — event traktowany jak nieistniejący.
- [ ] Frontend: strona 404 lub redirect.
- [ ] Zalogowany **organizator** (Konto A) może otworzyć ten sam URL i widzi wydarzenie.

---

## S11 — Potwierdzanie eventu (confirm by token z linku email)

**Cel:** Weryfikacja że link z emaila potwierdza PENDING event i zmienia go na ACTIVE.

### Przygotowanie

1. W Prisma Studio znajdź jeden z PENDING eventów serii — skopiuj `confirmToken`.
2. Zanotuj `id` eventu.

### Kroki

3. Otwórz w przeglądarce (bez logowania): `localhost:4200/o/confirm-event?token={confirmToken}`.
4. Strona powinna wyświetlić komunikat o potwierdzeniu.

### Weryfikacja

- [ ] Strona wyświetla komunikat **„Wydarzenie potwierdzone"** lub podobny (bez błędu).
- [ ] W Prisma Studio: event zmienił `status` z `PENDING` → `ACTIVE`, a `confirmToken` = `null`.
- [ ] Jeśli seria była wstrzymana i `pendingCount < 3` po potwierdzeniu: `suspendedReason` i `suspendedAt` serii = `null` (seria odblokowana).

### Przypadek: token już użyty

5. Otwórz ponownie ten sam URL z tym samym tokenem.

- [ ] Strona wyświetla komunikat **„Wydarzenie już potwierdzone"** (status `alreadyConfirmed`).
- [ ] Brak błędu 500, brak podwójnej zmiany statusu.

---

## S12 — Wstrzymanie serii po 3 niepotwierdzonych (suspension)

**Cel:** Weryfikacja że seria z 3+ PENDING eventami z rzędu staje się `suspended`.

### Przygotowanie

1. Utwórz serię z S1 — ma 4-5 PENDING eventów (bufor 30 dni, co 7 dni).
2. Wywołaj ręcznie kolejną generację (patrz S3, krok 2-4):
   - W Prisma Studio ustaw `nextGenerationAt = wczoraj`.
   - Poczekaj na cron **lub** użyj metody alternatywnej poniżej.

   > Alternatywa bez czekania na cron: w Prisma Studio stwórz ręcznie 4 PENDING eventy z `confirmToken` i `seriesId` = ID serii. Ale to żmudne; lepiej poczekać na cron lub symulować przez `nextGenerationAt`.

3. Sprawdź w Prisma Studio ile z rzędu ostatnich eventów serii ma `status = PENDING` — potrzebujesz **min. 3**.

### Weryfikacja

- [ ] Jeśli 3+ PENDING z rzędu: `EventSeries.suspendedReason` jest ustawione (np. `"Seria wstrzymana..."`), `suspendedAt` = timestamp.
- [ ] Cron przy kolejnym przebiegu **pomija** wstrzymaną serię (logi nie pokazują generacji dla tej serii).
- [ ] W UI na stronie `/series/:id` widoczny baner **„Seria wstrzymana"** z linkiem do zestawienia.
- [ ] Po potwierdzeniu ≥1 eventu (S11): jeśli pozostałe PENDING < 3, baner znika i `suspendedReason = null`.

---

## S13 — Zestawienie organizatora (digest)

**Cel:** Weryfikacja strony `/profile/organizer/digest` i wysyłki emaila.

### Przygotowanie

1. Upewnij się że masz serię z PENDING eventami (z S1 lub S2).

### Kroki UI

2. Zaloguj się jako **Konto A**.
3. Przejdź do `localhost:4200/profile/organizer/digest`.

### Weryfikacja

- [ ] Sekcja **„Do potwierdzenia"** zawiera listę PENDING eventów serii z przyciskami „Potwierdź".
- [ ] Kliknij **„Potwierdź"** przy pierwszym evencie:
  - [ ] Event znika z sekcji „Do potwierdzenia".
  - [ ] Jeśli `startsAt` w przyszłości — event pojawia się w sekcji „Nadchodzące".
  - [ ] W Prisma Studio: event ma `status = ACTIVE`, `confirmToken = null`.
- [ ] Sekcja **„Aktywne serie"** wyświetla serię z liczbą oczekujących.
- [ ] Przycisk **„Wyślij zestawienie na email"** → kliknij:
  - [ ] Wyświetla się komunikat sukcesu (lub spinner).
  - [ ] Na konto email organizatora przychodzi email z tematem „Tygodniowy raport organizatora".
  - [ ] Email zawiera listę PENDING eventów z przyciskami „Potwierdź".
  - [ ] Link w emailu (`/o/confirm-event?token=xxx`) otwiera stronę potwierdzenia (S11).

---

## Podsumowanie po weryfikacji

Po wykonaniu wszystkich scenariuszy zaznacz w `docs/tasks/series_of_events_implementation.md` sekcję 9 (QA manualne) i odpowiednie pozycje w sekcji 11 (Definition of Done).

```
- [x] Tworzenie serii INTERVAL co 7 dni... (S1)
- [x] Tworzenie serii WEEKLY pon+czw... (S2)
- [x] Cron → wzrost liczby wydarzeń... (S3)
- [x] Edycja serii → regeneracja... (S4)
- [x] DST → stałość godziny lokalnej... (S5)
- [x] autoCoverImage → różne covery... (S6)
- [x] GET /event-series/:id bez JWT → 401 (S7)
- [x] PATCH /event-series/:id inny user → 403 (S8)
```

Oraz (sekcja 12 raporty — weryfikacja runtime):

```
- [x] PENDING niewidoczne publicznie (S9)
- [x] PENDING 404 przez URL (S10)
- [x] Confirm by token (S11)
- [x] Suspension po 3 PENDING (S12)
- [x] Digest UI + email (S13)
```
