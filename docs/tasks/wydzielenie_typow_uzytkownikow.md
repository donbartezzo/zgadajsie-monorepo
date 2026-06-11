# Wydzielenie pól per typ użytkownika (Class Table Inheritance)

## Cel

Uporządkować model `User` tak, aby tabela trzymała wyłącznie pola **wspólne** dla wszystkich typów kont (`AccountType`: `REAL`, `GUEST`, `FAKE`), a pola dedykowane danemu typowi znalazły się w osobnych, ściśle powiązanych tabelach 1:1.

Wzorzec: **Class Table Inheritance (CTI)** — `User` pozostaje wspólnym „supertypem" z dyskryminatorem `accountType`, a szczegóły per typ wiszą w tabelach `UserRealDetails` / `UserGuestDetails` / (`UserFakeDetails` w przyszłości).

Korzyści:

- koniec z kolumnami NULL nieużywanymi przez dany typ (dziś `User` ma ~12 pól wyłącznie-REAL, NULL dla każdego gościa/fake'a),
- twardsze ograniczenia integralności (gość/fake nie może mieć hasła, tokenów, emaila logowania),
- czytelniejsze zapytania i mniej rozsianych po kodzie warunków `WHERE accountType != FAKE`,
- znika hack ze sztucznym emailem `guest-*@…` / `fake-*@…`.

## Kluczowa zaleta architektoniczna

**`EventEnrollment.userId` i wszystkie inne FK do `User.id` pozostają nietknięte.** Nie wprowadzamy polimorfizmu — sloty, płatności, loteria, notyfikacje dalej joinują po `User`. Cały koszt skupia się w warstwie auth/identity (wyprowadzenie `email` i pól konta do `UserRealDetails`), a nie rozsmarowuje się po logice uczestnictwa.

---

## Stan obecny (źródło prawdy: `backend/prisma/schema.prisma`)

`User` trzyma dziś wszystkie typy kont i miesza pola wspólne z polami wyłącznie-REAL:

- **GUEST** — tworzony w `enrollment.service.ts:joinGuest()` jako wiersz `User` ze sztucznym mailem, `isActive=false`, bez `passwordHash`. Używa wyłącznie pól wspólnych (`displayName`, `avatarSeed`, `gender`, `isActive`). Wskazywany przez `EventEnrollment.userId`; host w `EventEnrollment.addedByUserId`.
- **FAKE** — tworzony w module `fake-users`, służy do „pompowania" wydarzeń. Też używa wyłącznie pól wspólnych.
- `accountType` jest używany w ~15 plikach backendu w dwóch wzorcach: wykluczanie `FAKE` z maili/notyfikacji oraz przekierowanie `GUEST` → `addedBy` (host).

**Ustalony fakt:** goście i fake'i nie mają dziś żadnych własnych pól skalarnych — cała ich „treść" to pola wspólne. Jedyną tabelą z realną zawartością do migracji jest więc `UserRealDetails`.

---

## Model docelowy

### Podział pól

| `User` (wspólne — zostają)                                                                               | `UserRealDetails` (1:1, tylko REAL — przenoszone)                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`, `displayName`, `role`, `accountType`, `gender`, `avatarSeed`, `isActive`, `createdAt`, `updatedAt` | `email` (`@unique`), `passwordHash`, `isEmailVerified`, `activationToken`, `activationTokenExpiresAt`, `passwordResetToken`, `passwordResetTokenExpiresAt`, `tpayMerchantId`, `donationUrl`, `weeklyDigestSentAt`, `welcomeMessage`, `welcomeMessageEnabled` |

**Zakres decyzji — tylko pola skalarne się przenoszą.** Wszystkie relacje (`payments`, `socialAccounts`, `enrollments`, `addedEnrollments`, `organizedEvents`, `vouchers*`, `reprimands*`, `pushSubscriptions`, `notifications`, …) **pozostają zadeklarowane na `User` i wskazują na `User.id`**. Nie zmieniamy ich FK — to ograniczyłoby blast radius do warstwy skalarnej. Goście/fake po prostu nie mają wierszy w tych relacjach.

### Tabele detali

```prisma
model UserRealDetails {
  userId                      String    @id
  email                       String    @unique
  passwordHash                String?
  isEmailVerified             Boolean   @default(false)
  activationToken             String?
  activationTokenExpiresAt    DateTime?
  passwordResetToken          String?
  passwordResetTokenExpiresAt DateTime?
  tpayMerchantId              String?
  donationUrl                 String?
  weeklyDigestSentAt          DateTime?
  welcomeMessage              String?
  welcomeMessageEnabled       Boolean   @default(true)
  user                        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Dostarczane wraz z epikiem „profil gracza" (patrz Powiązania) — nie tworzymy pustej tabeli w tym epiku.
model UserGuestDetails {
  userId    String     @id
  levelSlug String                       // walidacja backend: != 'open'
  bio       String?                      // opcjonalne, max 500 znaków
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  level     EventLevel @relation(fields: [levelSlug], references: [slug])
}
```

`UserFakeDetails` — **odłożone** (brak pól specyficznych dla FAKE). Furtka zostaje, gdyby kiedyś pojawiły się.

### Niezmienniki (egzekwowane aplikacyjnie, nie przez DB)

- Każdy `User` z `accountType=REAL` ma **dokładnie jeden** `UserRealDetails`; tworzenie obu wierszy zawsze w **jednej transakcji**.
- `User` z `accountType` `GUEST`/`FAKE` **nie ma** `UserRealDetails`.
- Gość to **jednorazowy `User`** powstający tylko w `joinGuest()`, zawsze z dokładnie jednym `EventEnrollment` mającym `addedByUserId` (host). To uzasadnia trzymanie ewentualnego profilu dyscypliny gościa w `UserGuestDetails` (1:1) zamiast na zgłoszeniu.

> Uwaga: „nierozłączności" (User REAL ⇔ UserRealDetails) nie da się wymusić twardym, cyklicznym, wymaganym FK w Postgresie. Egzekwujemy ją transakcją + niezmiennikiem aplikacyjnym spójnym z `accountType`.

---

## Co NIE wchodzi w zakres

- `EventEnrollment` pozostaje bez zmian — w szczególności **`addedByUserId` + relacja `addedBy` zostają na zgłoszeniu** (atrybut uczestnictwa: dyskryminator gościa `isGuest = addedByUserId != null`, routing płatności `addedByUserId ?? userId`, routing notyfikacji, autoryzacja host/admin, filtr loterii). Przenoszenie ich do detali gościa duplikowałoby źródło prawdy i obciążało gorące ścieżki joinami.
- Polimorfizm enrollmentu — odrzucony na rzecz CTI.
- `UserGuestDetails` / `UserFakeDetails` jako realny kod — dostarczane osobno (guest details wraz z epikiem profilu gracza; fake details dopiero gdy będą potrzebne).

---

## Strategia migracji: Expand → Migrate → Contract

Ze względu na to, że `email` jest kluczem logowania używanym w ~89 miejscach, robimy migrację **trójfazową**, aby uniknąć big-bangu na produkcji. Migracje schematu prowadzimy **wyłącznie przez migracje Prisma** (nie `db push`) — zmiana `schema.prisma` bez migracji = 500 na prodzie (patrz pamięć projektu). Backfill danych jako ręczny skrypt w `prisma/data-migrations/` (wzorzec: `20260515_rename_new_user_to_not_trusted.ts`), uruchamiany przed deployem nowego kodu.

### Faza 1 — EXPAND (addytywna, nie psuje produkcji)

- Dodać model `UserRealDetails` (kolumny jw., `email` jeszcze **bez** `@unique` na tym etapie, żeby backfill nie kolidował).
- Migracja Prisma tworząca tabelę.
- Skrypt data-migration: dla każdego `User` z `accountType=REAL` wstawić `UserRealDetails` kopiując wartości pól REAL z `User`.
- Po backfillu: migracja dodająca `@unique` na `UserRealDetails.email`.
- Na tym etapie kolumny REAL **wciąż istnieją na `User`** (dual-source) — kod nadal działa po staremu.

### Faza 2 — MIGRATE (refaktor kodu na nowe źródło)

Przepiąć cały odczyt/zapis pól REAL z `User.*` na `User.realDetails.*`. Zakres (z analizy kodu):

- **`auth.service.ts`** — rejestracja, logowanie (`where: { email }` ×3), reset hasła, weryfikacja emaila, tokeny aktywacyjne, OAuth (`where: { email: profile.email }`). Email i tokeny czytane/zapisywane przez `realDetails`.
- **Tworzenie usera REAL** — wszędzie gdzie powstaje konto REAL: utworzyć `User` + `UserRealDetails` w jednej transakcji.
- **`users.service.ts`** — listowanie/filtrowanie userów w adminie (wyszukiwanie po email).
- **~89 miejsc czytających `email`** — głównie `select: { email: true }` → `select: { realDetails: { select: { email: true } } }` lub `include`. Nadawcy maili (`announcement-dispatcher`, `event-reminder.cron`, `approval-reminder.cron`, `events.service`) muszą czytać `realDetails.email` dla REAL; ścieżki `GUEST`→`addedBy` i wykluczenie `FAKE` już istnieją, więc goście/fake bez emaila są bezpieczni.
- **`prisma-selects.ts`** — `USER_SELECT_WITH_EMAIL` przebudować na zagnieżdżony select.
- **Pola organizatora/REAL** (`tpayMerchantId`, `donationUrl`, `welcomeMessage`, `welcomeMessageEnabled`, `weeklyDigestSentAt`) — przepiąć odczyt/zapis na `realDetails`.
- **Sztuczne emaile** — usunąć generowanie `guest-*@…` w `joinGuest()` i `fake-*@…` w `fake-users.service.ts` (goście/fake nie mają już emaila).
- **Seedy** (`seed.nonprod.ts`, `seed.prod.ts`, `seed-common.ts`) — tworzenie userów REAL z emailem/hasłem → tworzyć `UserRealDetails`.
- **Testy** — specs konstruujące userów z emailem/hasłem oraz integracyjne.

### Faza 3 — CONTRACT (usunięcie zduplikowanych kolumn)

- Po wdrożeniu i weryfikacji Fazy 2: migracja Prisma **usuwająca** przeniesione kolumny REAL oraz `email @unique` z `User`.
- Weryfikacja, że nic już nie odwołuje się do `User.email` ani pozostałych przeniesionych pól bezpośrednio.

---

## Checklist wdrożeniowy

### Etap 0 — Przygotowanie

- [x] Zinwentaryzować pełną listę odczytów/zapisów pól REAL (`email` ~89 miejsc, `passwordHash`, tokeny, `tpay*`, `donationUrl`, `welcome*`, `weeklyDigestSentAt`) — zakres do Fazy 2 ujęty w sekcji „MIGRATE"
- [x] Potwierdzić, że żadna ścieżka mailowa/notyfikacyjna nie zakłada emaila dla `GUEST`/`FAKE` (potwierdzone: GUEST→`addedBy`, FAKE wykluczany przez `accountType: { not: 'FAKE' }`)

### Etap 1 — EXPAND (schema + backfill)

- [x] Dodać model `UserRealDetails` + relacja 1:1 `realDetails` na `User` (`schema.prisma`); `email @unique` od razu — kolizja niemożliwa, bo kopiowane wartości pochodzą z `User.email`, który już jest `@unique` wśród REAL
- [x] `pnpm prisma:generate` — klient wygenerowany, delegat `prisma.userRealDetails` dostępny
- [x] Migracja `20260611120000_extract_user_real_details/migration.sql` (CREATE TABLE + unique index + FK, idempotentna) — **utworzona; niezastosowana, bo DB lokalna wyłączona**
- [x] Skrypt `prisma/data-migrations/20260611_backfill_user_real_details.ts` — backfill REAL → `UserRealDetails` (idempotentny, z weryfikacją)
- [x] **Zastosować migrację + uruchomić backfill na działającej DB** — `migrate deploy` OK (brak P3005, historia spójna), backfill OK
- [x] Weryfikacja: liczba `UserRealDetails` == liczba `User` z `accountType=REAL` — **55 == 55** ✅

### Etap 2 — MIGRATE (refaktor auth/identity)

- [x] `auth.service.ts`: logowanie, rejestracja, reset hasła, weryfikacja emaila, OAuth — przez `realDetails` (lookupy przez `userRealDetails`, tworzenie konta zagnieżdżonym `realDetails.create`)
- [x] Tworzenie usera REAL w jednej transakcji (`User` + `UserRealDetails` przez nested write)
- [x] `users.service.ts`: wyszukiwanie/filtrowanie po email przez `realDetails`, rozdział `User`/`realDetails` w update (uwaga: luźny `Record<string,unknown>` ukrywał błędy — przepisane na typowane)
- [x] Przepiąć wszystkie `select/where { email }` na zagnieżdżony `realDetails` (potwierdzone typecheckiem)
- [x] `prisma-selects.ts`: przebudować `USER_SELECT_WITH_EMAIL`
- [x] Pola organizatora/REAL (`donationUrl`, `welcome*`, `weeklyDigestSentAt`) przez `realDetails`
- [x] Usunąć generowanie sztucznych emaili w `joinGuest()` i `fake-users.service.ts` (usunięto też `email` z `FakeUserDto`)
- [x] Typecheck kodu aplikacji czysty (jedyny pozostały błąd: `fake-users-handlers.ts:96` cast `EventRoleConfig` — **wcześniej istniejący, niezwiązany**, maskowany przez webpack `transpileOnly`)
- [x] Zaktualizować seedy: `seed.nonprod.ts` (16× REAL → `realDetails.create`), `seed-common.ts` (fake users: `upsert by email` → `create`, bez email/hasła); `seed.prod.ts` bez zmian — **zweryfikowane: `pnpm backend:db:seed` przechodzi end-to-end** (admin z realDetails, 50 fake users, wydarzenia, zgłoszenia)
- [x] Zaktualizować fixture'y w 6 specach (mocki/asercje na `realDetails`): `auth.service.spec`, `users.service.spec`, `events.service.spec`, `enrollment.service.spec`, `notification-escalation.cron.spec`, `organizer-digest.cron.spec`
- [x] Zaktualizować testy integracyjne (`src/tests/*.integration.spec.ts`): `user.create` → `realDetails.create`, filtry `where: { email }` → `where: { realDetails: { email } }` (transformacja zweryfikowana — pliki kompilują się po naprawie configu tsx). `tests/test-helpers.ts` bez zmian (`mockAuthUser` to payload `AuthUser`, nie model DB)
- [x] **Pełny suite jednostkowy backendu ZIELONY: 39 suite, 493 testy** (`nx test backend --skip-nx-cache`)
- [x] Naprawić pre-existing lukę configu: `jest.integration.config.ts` nie obsługiwał `.tsx` (`email.service.tsx`) — `[tj]s` → `[tj]sx?`, dodano `tsx`/`jsx` do `moduleFileExtensions` (mirror configu unitowego)
- [x] Naprawić pre-existing dryf w testach integracyjnych (DI + sygnatura): `enrollment-lottery` (provider `CronAdminService`), `enrollment-moderation` (provider `AppConfigService`), `enrollment-payment` (provider `AppConfigService`/`ChatService`/`ChatNotificationService` + `join(event.id, mockAuthUser(user.id))`)
- [x] **Testy integracyjne ZIELONE: 3 suite, 14 testów** (`nx run backend:test:integration`, testowa DB 5434 z `docker-compose.test.yml` + `migrate deploy`)

> Uwaga narzędziowa: realny typecheck wymagał `backend/tsconfig.typecheck.json` — `tsconfig.app.json` ma include `src/**/*.{ts,tsx}`, a TypeScript **nie rozwija klamry `{ts,tsx}`**, więc `tsc -p` nie widział źródeł (0 plików). Webpack build używa `transpileOnly` (zero typechecku). To luka w CI do rozważenia osobno.

### Etap 3 — CONTRACT (sprzątanie)

- [x] Migracja `20260611130000_drop_real_fields_from_user` (idempotentny backfill INSERT…SELECT **przed** DROP — prod-safe, bez ręcznego kroku) — **zastosowana**; redundantny skrypt TS backfill usunięty
- [x] Brak driftu: `prisma migrate status` = „Database schema is up to date"; dane 55/55, User total 105 (55 REAL + 50 GUEST/FAKE)
- [x] Testy zielone: jednostkowe **493/493** + integracyjne **14/14**; seed end-to-end OK; migracje zastosowane bez driftu

### Etap 4 — Weryfikacja end-to-end

- [ ] Rejestracja → aktywacja → logowanie → reset hasła (ścieżka REAL)
- [ ] Logowanie OAuth (social)
- [ ] Dodanie gościa (`joinGuest`) bez emaila — działa, host dostaje notyfikacje/maile
- [ ] Fake users — pompowanie wydarzenia, brak maili/push do FAKE
- [ ] Wysyłka maili (announcement, przypomnienia) — REAL po `realDetails`, GUEST→host, FAKE pominięty
- [ ] Przegląd kodu (`/code-review`) i przegląd bezpieczeństwa (unikalność email, spójność niezmiennika REAL⇔UserRealDetails)

---

## Powiązania z innymi planami

- **`docs/tasks/implementacja_profilu_gracza.md`** — profil dyscypliny **gościa** (`levelSlug` + `bio`) trafia do **`UserGuestDetails`** (wg wzorca CTI z tego planu), a **nie** do kolumn `guest*` na `EventEnrollment`. Wymaga aktualizacji tamtego planu:
  - sekcja 9 pkt 3 oraz Etap 4: zapis profilu gościa → `UserGuestDetails` (`levelSlug`, `bio`), nie kolumny na enrollment,
  - wspólny modal profilu dyscypliny dla gościa zapisuje do `UserGuestDetails`,
  - walidacja: `levelSlug != 'open'` (blacklista), `bio` opcjonalne, max 500.
  - `UserGuestDetails` jest fizycznie tworzone w tamtym epiku (tu definiujemy tylko jego docelowy kształt i miejsce w modelu).
- `UserFakeDetails` — poza zakresem; do rozważenia, gdy pojawią się pola specyficzne dla FAKE.

## Ryzyka

- **Auth/email to gorący, krytyczny obszar** — błąd w przepięciu logowania/resetu hasła blokuje użytkowników. Stąd faza EXPAND z dual-source i CONTRACT dopiero po weryfikacji.
- **Niezmiennik REAL⇔UserRealDetails jest aplikacyjny** — każdy punkt tworzenia konta REAL musi tworzyć oba wiersze w transakcji; pominięcie = user bez emaila/hasła.
- **Seedy i testy** — szeroki zakres mechanicznych zmian; ryzyko przeoczenia miejsca tworzącego usera bez `realDetails`.
