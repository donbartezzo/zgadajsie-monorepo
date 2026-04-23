# Decoy events — sztuczny tłok na starcie aplikacji

## Problem

Aplikacja ma 2–3 wydarzenia tygodniowo. Przy małej liczbie eventów lista wygląda pusto i może odstraszać nowych użytkowników zanim zbuduje się realna społeczność. Celem jest stworzenie wrażenia aktywnej platformy przez dodawanie 1–2 wydarzeń tygodniowo, które:

- wyglądają jak prawdziwe (publiczne, opisane, z datą),
- są widoczne w listingu,
- są **niedostępne do dołączenia** (wszystkie miejsca zajęte),
- **nie przyjmują zapisów na listę oczekujących**.

## Kluczowe ryzyko

Jeśli real user trafi na **listę oczekujących** decoy eventu, będzie czekał na slot, który nigdy nie zostanie zwolniony. To największy scenariusz do zabezpieczenia — decoy event musi blokować zapis na waiting list, nie tylko zwykłe dołączenie.

---

## Opcje implementacji

### Opcja 1 — Locked slots bez fejkowych userów

Decoy event tworzony normalnie. Wszystkie sloty (`EventSlot`) tworzone z `locked: true, enrollmentId: null`. Wydarzenie wyświetla się jako pełne w licznikach pojemności.

**Zmiany w schemacie:** brak (pole `locked` już istnieje).

**Zmiany w logice:** enrollment service musi odczytać `isDecoy` (lub inny sygnał) i odrzucać wszystkie próby dołączenia — włącznie z waiting list.

**Pro:**

- Zero migracji schematu.
- Zero ryzyka kolizji danych (brak fejkowych userów w systemie).
- Łatwe do wycofania.

**Con:**

- Lista uczestników jest pusta — widać „12/12 miejsc" ale zero avatarów i imion.
- Dla dyscyplin z rolami (np. football z bramkarzami) może wyglądać podejrzanie.

---

### Opcja 2 — Ghost users + enrollments

Dodanie flagi `isGhost: Boolean @default(false)` do modelu `User`. Utworzenie puli 40–60 fejkowych użytkowników z polskimi imionami i nazwiskami. Ghost userzy mają:

- `isActive: false`
- brak hasła i brak `SocialAccount` — nie mogą się zalogować
- opcjonalnie avatar z zewnętrznego serwisu (np. Picsum, DiceBear)

Decoy eventy wypełniane są enrollmentami ghost userów ze slotami `confirmed: true`.

**Zmiany w schemacie:** nowe pole `isGhost` na modelu `User`.

**Zmiany w logice:** filtrowanie ghost userów w enrollment search (dodawanie uczestników przez organizatora), czacie grupowym, powiadomieniach, statystykach aktywności.

**Pro:**

- Realistyczna lista uczestników z imionami i avatarami — najsilniejszy efekt społeczny.
- Pasuje do dyscyplin gdzie widoczny skład ma znaczenie.

**Con:**

- Migracja schematu + wiele miejsc do przefiltrowania (search, chat, notyfikacje).
- Ghost userzy mogą wyciekać do widoków organizatora jeśli filtrowanie jest niekompletne.
- Utrudnione wycofanie.

---

### Opcja 3 — Flaga `isDecoy` na Event + locked slots ✅ rekomendowane

Dodanie `isDecoy: Boolean @default(false)` do modelu `Event`. Wszystkie sloty tworzone z `locked: true`. Enrollment service sprawdza `isDecoy` i blokuje **każdą próbę zapisu** (join + waiting list). Panel admina może filtrować decoy eventy osobno.

**Zmiany w schemacie:** nowe pole `isDecoy` na modelu `Event`.

**Zmiany w logice:**

- enrollment service: guard na `isDecoy` przed jakimkolwiek zapisem
- events query: opcjonalne ukrycie `isDecoy` w statystykach organizatora
- seed/skrypt admin: tworzenie decoy eventu z wypełnionymi locked slotami

**Pro:**

- Czyste oddzielenie danych — zero fejkowych użytkowników.
- Łatwe filtrowanie po stronie admina i analityki.
- Bezpieczne dla UX: real user dostaje jednoznaczny komunikat "brak wolnych miejsc".
- Relatywnie prosta implementacja.

**Con:**

- Brak avatarów uczestników — słabszy efekt społeczny niż Opcja 2.
- Wymaga migracji schematu (jedno pole).

---

## Decyzja

- [ ] Opcja 1 — locked slots, bez migracji
- [ ] Opcja 2 — ghost users + enrollments
- [ ] Opcja 3 — `isDecoy` na Event + locked slots (rekomendowane)
- [ ] Hybrydowa: Opcja 3 teraz, Opcja 2 jako druga faza jeśli efekt okaże się zbyt słaby

## Następne kroki (po wyborze opcji)

1. Migracja Prisma (jeśli Opcja 2 lub 3).
2. Guard w `enrollment.service.ts` blokujący zapis do decoy eventu.
3. Skrypt/seed tworzący pulę decoy eventów i blokujący sloty.
4. Opcjonalnie: cykliczny cron tworzący 1–2 decoy eventy tygodniowo.
5. Testy: próba dołączenia do decoy eventu przez real usera — oczekiwany error.
