# Fake users — sztuczny tłok w zapisach

## 1. Cel i koncepcja

Zestaw fejkowych użytkowników służących do budowania _social proof_ i „rozruszania" pustych
wydarzeń. Funkcja dostępna **wyłącznie dla administratora serwisu**.

Fake users to zwykłe konta użytkowników z flagą typu konta `FAKE`. Dzięki temu działają w
aplikacji jak normalni uczestnicy — mają profil, avatar, płeć, przechodzą **ten sam flow
zapisów** co realni userzy (przydział slotu, lista oczekujących, zatwierdzanie, wypisanie,
ban przez organizatora).

Rola fake users ogranicza się do:

- budowania wrażenia aktywności wydarzenia,
- social proof,
- „rozruszania" pustych eventów.

## 2. Ocena sensowności

Plan jest **sensowny do wdrożenia** i dobrze leży na istniejącej architekturze:

- model `EventEnrollment` + `EventSlot` obsługuje już „gości" (konta z `isActive=false`,
  tworzone przez `joinGuest`) — fake users to naturalne rozszerzenie tego wzorca,
- istnieje panel admina (`/admin/*`) z `adminGuard`,
- istnieje wzorzec cronów (`@nestjs/schedule`) z monitoringiem przez `CronLog` i panelem
  `/admin/crons` oraz `CronAdminService` (rejestracja triggerów, ręczne uruchomienie),
- `OrganizerUserRelation.isBanned` daje gotowy mechanizm „nie używaj tej persony u tego
  organizatora po banie".

**Główne braki infrastrukturalne do uzupełnienia:**

- brak kolejki delayed jobs (projekt nie ma Redis/BullMQ) — patrz sekcja 5,
- model `User` nie ma pola `gender` ani typu konta — wymagana migracja,
- `WithdrawnBy` ma tylko `USER | ORGANIZER` — brak `ADMIN`.

**Pokrewny dokument:** `docs/tasks/decoy-events.md` („Opcja 2 — ghost users") pokrywa się
częściowo z tym systemem. Po wdrożeniu fake users decoy events można zrealizować jako
wydarzenie z wysokim `targetOccupancy` — warto skoordynować i nie duplikować puli person.

## 3. Decyzje architektoniczne

### Rozstrzygnięte (pytania D1–D3)

| #   | Kwestia           | Decyzja                                                                                                                                                                                                                                                                                                 |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Model slotów      | Fake user przechodzi **normalny flow zapisów** — może dostać realny `EventSlot` albo trafić na listę oczekujących, zależnie od dostępności. Zasada „nie blokują prawdziwych miejsc" jest **gwarancją operacyjną**: bufor min. 3 wolnych miejsc + reaktywne wypisywanie + finalny cleanup przed startem. |
| D2  | Flaga typu konta  | Nowy enum `AccountType { REAL, GUEST, FAKE }` na `User`, default `REAL`. `isActive` zostaje bez zmian. Istniejący goście backfillowani do `GUEST`.                                                                                                                                                      |
| D3  | Kto włącza system | **Tylko administrator.** Organizator zarządza fake userami w swoim wydarzeniu jak zwykłymi userami, ale nie włącza systemu ani nie ustawia `targetOccupancy`.                                                                                                                                           |

### Rozstrzygnięte założenia (A1–A7)

| #   | Kwestia                   | Decyzja                                                                                                                                                                                                                                           |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Default `targetOccupancy` | Kolumna `Int?`, default `null`. `null`/`0` = fake users niedozwoleni. UI **prefilluje 35** przy włączaniu. Zakres 1–100.                                                                                                                          |
| A2  | Kolejka jobów             | **Generyczna, trwała kolejka w DB** — model `ScheduledJob` + executor-cron. Rozwiązanie reużywalne dla całej aplikacji, przyszłościowe. Szczegóły i uzasadnienie: sekcja 5.                                                                       |
| A3  | Globalny kill switch      | **Feature flag `enableFakeUsers`** w `libs/src/lib/config/feature-flags.ts`, analogicznie do `enableOnlinePayments`. Spójne z konwencją projektu (zmiana = redeploy — akceptowalne, tak działa nawet flaga płatności). Bez nowej tabeli ustawień. |
| A4  | Wydarzenia płatne         | Fake users działają na **wszystkich** wydarzeniach, w tym płatnych. Szczegóły i analiza ryzyk: sekcja 6.5.                                                                                                                                        |
| A5  | Ograniczenia wiekowe      | **Całkowicie pomijane** — `User` nie ma daty urodzenia. Jedyny parametr doboru fake users to **płeć**.                                                                                                                                            |
| A6  | Faza zapisów              | Monitor operuje **wyłącznie w fazie `OPEN_ENROLLMENT`** (nie `PRE_ENROLLMENT` / `LOTTERY_PENDING`).                                                                                                                                               |
| A7  | Pula startowa             | 40 mężczyzn + 10 kobiet, tworzona seed scriptem.                                                                                                                                                                                                  |

### Rozstrzygnięte — zachowanie w standardowym flow zapisów (B1–B4)

| #   | Kwestia                                 | Decyzja                                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Reguła `isNewUser` / lista oczekujących | **Pełna normalność.** Fake user przechodzi `isNewUser` jak realny: u nieznanego organizatora ląduje na liście oczekujących (`waitingReason = NEW_USER`) i czeka na ręczne zatwierdzenie. Po pierwszym zatwierdzeniu auto-trust (działa dla `addedByUserId = null`, czyli także dla fake usera) sprawia, że kolejne wydarzenia tego samego organizatora dają slot od razu. |
| B2  | Próg `minParticipants`                  | **Fake users wliczają się normalnie** — bez special-case w logice progu.                                                                                                                                                                                                                                                                                                  |
| B3  | Powiadomienia organizatora              | **Pełna normalność.** Zapis fake usera wysyła organizatorowi push + e-mail „nowe zgłoszenie" jak realne zgłoszenie. Brak special-case w `createWaiting`.                                                                                                                                                                                                                  |
| B4  | Czat grupowy                            | Fake users **widoczni** na liście członków czatu jak zwykli uczestnicy; system **nigdy nie wysyła wiadomości w ich imieniu**. Nie wymaga to praktycznie żadnego kodu — fake user to zwykły enrollment, a system i tak nie generuje wiadomości.                                                                                                                            |

**Konsekwencja B1+B3:** w początkowej fazie współpracy z danym organizatorem fake users
będą przeważnie widoczni jako **oczekujący (`PENDING`)**, a organizator dostanie o nich
powiadomienia — to świadomie przyjęte zachowanie. Efekt „pełnych slotów" narasta dopiero po
zatwierdzeniach i zbudowaniu historii (auto-trust).

## 4. Zmiany w schemacie Prisma

```prisma
enum AccountType {
  REAL
  GUEST
  FAKE
}

enum Gender {
  MALE
  FEMALE
}

// WithdrawnBy — dodać wartość:
enum WithdrawnBy {
  USER
  ORGANIZER
  ADMIN        // nowe — wypisanie REALNEGO usera przez administratora serwisu
}

enum ScheduledJobStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
  CANCELLED
}
```

**Model `User`** — nowe pola:

- `accountType AccountType @default(REAL)`
- `gender Gender?` (null = nieokreślona)
- `@@index([accountType])`

**Model `Event`** — nowe pole:

- `targetOccupancy Int?` (null/0 = fake users niedozwoleni; 1–100 = % docelowego obłożenia)

**Model `EventSeries`** — nowe pole:

- `targetOccupancy Int?` — propagowane do generowanych wydarzeń przez generator serii

**Nowy model `ScheduledJob`** (generyczna kolejka — patrz sekcja 5):

```prisma
model ScheduledJob {
  id          String             @id @default(uuid())
  type        String             // np. 'FAKE_USER_ENROLL', 'FAKE_USER_WITHDRAW'
  payload     Json               // np. { eventId, enrollmentId? }
  status      ScheduledJobStatus @default(PENDING)
  scheduledAt DateTime           // kiedy job ma się wykonać
  startedAt   DateTime?
  executedAt  DateTime?
  attempts    Int                @default(0)
  maxAttempts Int                @default(3)
  error       String?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([status, scheduledAt])
  @@index([type, status])
}
```

**Migracja danych (backfill):** ustawić `accountType = GUEST` dla wszystkich userów, którzy
występują jako `userId` w `EventEnrollment` z niepustym `addedByUserId`. Pozostali → `REAL`.

## 5. Infrastruktura kolejki jobów (A2 — uzasadnienie)

### Analiza stanu obecnego

Aplikacja używa wyłącznie `@nestjs/schedule` (`@Cron`) — 6 cronów (`event-series`,
`event-reminder`, `approval-reminder`, `enrollment-lottery`, `organizer-digest`,
`cron-monitor`), każdy ze stałym harmonogramem, logujący do tabeli `CronLog` i rejestrowany
w `CronAdminService`. Operacje „odroczone" robione są dziś ad hoc przez `setImmediate`
(fire-and-forget, np. `notifyWaitingAboutFreeSlot`) — bez trwałości i bez retry.

Fake users wymagają czegoś więcej: **pojedyncze joby zaplanowane na konkretny czas, z
losowymi odstępami, z możliwością anulowania i recovery po błędzie**. Stały cron „rób
wszystko naraz" jest tu wprost niewłaściwy.

### Rozważone opcje

| Opcja                                          | Plusy                                                                                                                     | Minusy                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **BullMQ + Redis**                             | dojrzałe, delayed jobs, retry, priorytety, panele                                                                         | nowa infra (Redis), koszt utrzymania i deployu — projekt dziś nie ma Redis |
| **Dynamiczne timeouty `SchedulerRegistry`**    | zero migracji                                                                                                             | in-memory, ginie po restarcie — brak trwałości i recovery, dyskwalifikuje  |
| **Generyczna kolejka w DB + executor-cron** ✅ | trwała, recovery, anulowanie, zero nowej infra, spójna z `CronLog`/`CronAdminService`, **reużywalna dla całej aplikacji** | polling (akceptowalny przy tej skali), mniej funkcji niż BullMQ            |

### Decyzja

Wdrażamy **generyczną, trwałą kolejkę w DB** (`ScheduledJob`), nie tabelę dedykowaną fake
userom — żeby była przyszłościowa i reużywalna (docelowo może przejąć też e-maile,
powiadomienia, digesty). Składniki:

- **`ScheduledJobService`** — planowanie, anulowanie, rejestr handlerów per `type`.
- **Handler registry** — każdy moduł rejestruje handler dla swojego `type` (wzorzec
  analogiczny do `CronAdminService.registerTrigger`). Fake users rejestrują
  `FAKE_USER_ENROLL` i `FAKE_USER_WITHDRAW`.
- **`scheduled-jobs-executor` cron** (co ~1 min) — pobiera joby `PENDING` z
  `scheduledAt <= now`, oznacza `PROCESSING`, wykonuje **pojedynczo** przez handler,
  ustawia `DONE`/`FAILED`, retry z backoffem do `maxAttempts`. Loguje do `CronLog`,
  rejestruje się w `CronAdminService`.
- Migracja do BullMQ pozostaje otwartą ścieżką na przyszłość — interfejs `ScheduledJobService`
  należy zaprojektować tak, by dało się podmienić implementację.

Executor musi obsłużyć „zasób z payloadu nie istnieje" (np. event usunięty) — wtedy
`CANCELLED`, nie `FAILED`.

## 6. Logika domenowa

### 6.1. Pomiar obłożenia — liczone na zgłoszeniach, nie slotach (wytyczna dodatkowa 2)

**Obłożenie liczone jest na podstawie aktywnych zgłoszeń, NIE zajętości slotów.**

- `activeEnrollments` = `EventEnrollment` z `wantsIn = true` dla danego wydarzenia —
  obejmuje **uczestników (ze slotem) i oczekujących (bez slotu)**, **wyklucza wypisanych**
  (`wantsIn = false`).
- `currentOccupancy = activeEnrollments / maxParticipants * 100`
- `targetCount = ceil(targetOccupancy / 100 * maxParticipants)` — docelowa liczba aktywnych zgłoszeń
- `freePlaces = maxParticipants - activeEnrollments`

**Przykład:** `maxParticipants = 100`, wypisanych 5, oczekujących 40, uczestników 10 →
`activeEnrollments = 50` → `currentOccupancy = 50%` (mimo że slotów zajętych jest 10%).
Przy `targetOccupancy = 35%` system **nie dodaje** fake users — chętnych jest już więcej niż
trzeba, oczekujący czekają tylko na zatwierdzenie przez organizatora.

### 6.2. Monitor obłożenia (`FakeUsersMonitorService` + `fake-users-monitor` cron)

Cron co ~15 min. Kwalifikacja wydarzenia: feature flag `enableFakeUsers` włączona, status
`ACTIVE`, faza `OPEN_ENROLLMENT`, `targetOccupancy >= 1`. Dla każdego kwalifikującego się
wydarzenia:

1. Policz `activeEnrollments`, `fakeActiveCount` (aktywne zgłoszenia `accountType = FAKE`),
   `targetCount`, `freePlaces`.
2. **Deficyt** (`activeEnrollments < targetCount`): zaplanuj `FAKE_USER_ENROLL` joby
   (`ScheduledJob`) z **losowym, narastającym** `scheduledAt` — nigdy wszystkie naraz.
   Liczba jobów ograniczona warunkiem bufora (pkt 6.4).
3. **Nadmiar** (`activeEnrollments > targetCount`): zaplanuj `FAKE_USER_WITHDRAW` joby dla
   fake users — najpierw wypisuj fake users, nigdy realnych. Gdy realni userzy czekają na
   liście oczekujących, **priorytetowo wypisuj fake users zajmujących sloty**.
4. **Finalny cleanup**: na X godzin przed `startsAt` (stała `FAKE_USERS_FINAL_CLEANUP_HOURS`
   w `libs`, np. 12 h) — zaplanuj `FAKE_USER_WITHDRAW` wszystkich fake users. Na końcowym
   etapie zapisów wszystkie miejsca dostępne wyłącznie dla realnych userów.

### 6.3. Reakcja na zmiany `targetOccupancy`

- **Wyłączenie** (`targetOccupancy` → `null`/`0`, wytyczna 7): anuluj `PENDING` joby
  `FAKE_USER_ENROLL` dla tego wydarzenia, zaplanuj `FAKE_USER_WITHDRAW` wszystkich obecnych
  fake users.
- **Zmiana wartości** (wytyczna 8): przelicz `targetCount` i zaplanuj odpowiednio
  dodanie/usunięcie — trigger natychmiastowego przeliczenia monitora dla tego wydarzenia
  przy zapisie zmiany.

### 6.4. Bufor wolnych miejsc i warunki dodania (wytyczna 6)

Przed wykonaniem **każdego** joba `FAKE_USER_ENROLL` (sprawdzane w handlerze, w momencie
wykonania — nie tylko przy planowaniu, bo stan zmienia się w międzyczasie):

- `freePlaces >= FAKE_USERS_MIN_FREE_SLOTS_BUFFER` (stała = 3) — jeśli wolnych miejsc jest
  mniej niż 3, **nie dodawaj** fake usera (dotyczy też dodawania ręcznego przez admina),
- `activeEnrollments < targetCount` — deficyt nadal istnieje,
- feature flag `enableFakeUsers` nadal włączona, wydarzenie wciąż kwalifikujące się.

Jeśli warunki nie są spełnione — job kończy się `CANCELLED` (nie `FAILED`).

### 6.5. Wydarzenia płatne (A4 — analiza)

Fake users działają na wydarzeniach płatnych przez **ten sam flow** co realni userzy:

- fake user dostaje slot z `confirmed = false` (jak każdy na evencie płatnym — slot czeka
  na opłacenie),
- fake user **nigdy nie wchodzi w przepływ płatności** — nie powstają rekordy `PaymentIntent`
  ani `Payment`. To pozytywne: brak śmieci w danych finansowych, a `deleteParticipation`
  (blokowane przy istnieniu `Payment`) zawsze zadziała czysto dla fake usera,
- organizator może wypisać fake usera z nieopłaconym slotem dokładnie tak jak realnego —
  ale ślad zapisywany jest wg reguły 6.6 (zawsze jako `USER`).

**Ocena ryzyk — brak poważnych przeciwwskazań:**

- _Fake user blokuje slot realnemu płacącemu userowi_ — to samo ryzyko co na evencie
  bezpłatnym; mityguje bufor 3 + reaktywne wypisywanie + cleanup. Pomiar obłożenia na
  zgłoszeniach (6.1) działa tu na korzyść: realny user na liście oczekujących natychmiast
  podnosi `activeEnrollments`, więc monitor szybciej wypisuje fake users.
- _Zaburzenie statystyk/rozliczeń_ — nie występuje, bo fake user nie generuje płatności.
- _Fake user „APPROVED" bez opłaty wisi w liście_ — to akceptowalne, wręcz pożądane jako
  social proof; finalny cleanup i tak go usunie przed startem.

Jedyna uwaga: monitor powinien być świadomy, że nieopłacone sloty fake userów nie powinny
sztucznie zaniżać dostępności — ale ponieważ obłożenie liczymy na zgłoszeniach, a nie
slotach, problem nie występuje.

### 6.6. Wypisywanie i ślad (wytyczna 9)

`deriveStatus` występuje w **`enrollment.service.ts` i `events.service.ts`** — zaktualizować
oba miejsca + frontend (`participation.interface.ts` i widoki):

- `withdrawnBy === 'ORGANIZER'` → `REJECTED` (wypisany przez organizatora) — **już działa**,
- `withdrawnBy === 'ADMIN'` → `REJECTED` (komunikat: „usunięty przez administratora serwisu") — **nowe**,
- `withdrawnBy === 'USER'` → `WITHDRAWN`.

**Reguły zapisu śladu:**

- **Realny user wypisany przez admina** → `withdrawnBy = ADMIN` + powiadomienie push+email
  „usunięty przez administratora serwisu" (analogicznie do istniejącego `notifyRemoved` dla
  organizatora; zweryfikować, że ścieżka organizatora faktycznie wysyła powiadomienie — tak,
  `releaseSlotFromParticipant` → `notifyRemoved`; dla admina dodać wariant tekstu).
- **Fake user wypisany przez KOGOKOLWIEK** (admin, system/monitor, **a także organizator**)
  → zawsze `withdrawnBy = USER`, status `WITHDRAWN` — wygląda jak dobrowolne wyjście.
  **Żadnego powiadomienia, żadnego śladu.** Skip `notifyRemoved` dla `accountType = FAKE`.
- **Zastępowanie** (wytyczna 10): po wypisaniu fake usera, jeśli `targetOccupancy` aktywne,
  feature flag włączona i jest miejsce (bufor 3 zachowany) — monitor przy kolejnym przebiegu
  uzupełni deficyt; dodatkowo po `FAKE_USER_WITHDRAW` handler może od razu zaplanować
  przeliczenie tego wydarzenia.

### 6.7. Dobór person (`FakeUserPickerService`, wytyczna dodatkowa 1)

Przy `FAKE_USER_ENROLL` — wybór persony spośród kont `accountType = FAKE`:

**Twarde warunki wykluczające:**

- płeć zgodna z `Event.gender` (`MALE`/`FEMALE`; `ANY` = bez ograniczenia) — **jedyny**
  parametr profilowy (A5),
- persona **nie jest już zapisana** na to wydarzenie (aktywne lub wypisane zgłoszenie),
- persona **nie ma bana** od organizatora tego wydarzenia (`OrganizerUserRelation.isBanned`).

**Równoważenie obłożenia person (do zatwierdzenia):** zamiast osobnego, denormalizowanego
licznika — **dynamiczne liczenie aktywnych zgłoszeń persony**
(`COUNT(EventEnrollment WHERE userId = persona AND wantsIn = true)`). Zaleta: zawsze
aktualne, brak driftu po wypisaniach, brak nowej kolumny. Spośród person spełniających
twarde warunki wybieramy te o **najniższym** bieżącym obłożeniu, z losowym rozstrzyganiem
remisów — to naturalnie różnicuje dobór i zapobiega powtarzalności person, której userzy
szybko by się domyślili.

Enrollment fake usera tworzony jest jak normalne zgłoszenie, ale z **`addedByUserId = null`**
(fake user „zapisał się sam" — brak śladu admina/systemu).

### 6.8. Ręczne dodanie pojedynczego fake usera (wytyczna 5)

Endpoint admina planuje **dokładnie jeden** job `FAKE_USER_ENROLL` (lub wykonuje
natychmiast przez handler). Admin nie wskazuje persony — dobiera `FakeUserPickerService`.
Obowiązuje warunek bufora 3 wolnych miejsc (6.4).

### 6.9. Globalne wyłączenie (A3)

Feature flag `enableFakeUsers` w `libs/src/lib/config/feature-flags.ts`. Gdy `false`:
monitor nie planuje nowych jobów, handler `FAKE_USER_ENROLL` kończy się `CANCELLED`.
`FAKE_USER_WITHDRAW` wykonuje się normalnie (wyłączenie systemu nie powinno „zamrażać"
fake users w wydarzeniach).

## 7. Fazy wdrożenia i checklista

### Faza 0 — Współdzielone kontrakty (`libs/`)

- [x] enumy `AccountType`, `Gender` w `libs/src/lib/enums/`
- [x] `WithdrawnBy` — dodać `ADMIN`
- [x] enum `ScheduledJobStatus`
- [x] feature flag `enableFakeUsers` w `libs/src/lib/config/feature-flags.ts` (DEV + PROD)
- [x] stałe w `libs`: `FAKE_USERS_MIN_FREE_SLOTS_BUFFER = 3`, `FAKE_USERS_DEFAULT_TARGET_OCCUPANCY = 35`, `FAKE_USERS_FINAL_CLEANUP_HOURS`
- [x] interfejsy/DTO: fake user, scheduled job, target occupancy

### Faza 1 — Schemat bazy

- [x] migracja Prisma: `AccountType`, `Gender`, `WithdrawnBy.ADMIN`, pola `accountType`/`gender` na `User` + indeks
- [x] migracja: `Event.targetOccupancy`, `EventSeries.targetOccupancy`
- [x] migracja: model `ScheduledJob`
- [x] migracja danych: backfill `accountType = GUEST` dla istniejących gości
- [x] aktualizacja `prisma-selects` (dodać `accountType`, `gender` gdzie potrzebne)

### Faza 2 — Backend: generyczna kolejka jobów (sekcja 5)

- [x] `ScheduledJobService` — planowanie, anulowanie, rejestr handlerów per `type`
- [x] cron `scheduled-jobs-executor` (co ~1 min) — wykonanie pojedynczych jobów, retry/backoff, obsługa „zasób nie istnieje" → `CANCELLED`
- [x] rejestracja w `CronAdminService` + logowanie do `CronLog`
- [ ] testy: happy path, błąd + retry, anulowanie, brak zasobu

### Faza 3 — Backend: konta fake users i panel zarządzania (wytyczna 1)

- [x] `FakeUsersModule` + serwis CRUD kont fake users
- [x] spec tworzenia konta: `accountType = FAKE`, `isActive = false`, e-mail `fake-{uuid}@fake.zgadajsie.pl`, brak `passwordHash`, brak `SocialAccount` (nie da się zalogować), losowy `avatarSeed`
- [x] endpointy admina: listing, tworzenie, edycja (avatar `avatarSeed`, `displayName`, `gender`), dezaktywacja/usuwanie
- [x] seed script: pula 40 M + 10 K — zróżnicowane imiona/pseudonimy („Paweł K.", ksywki, warianty), różne avatary
- [x] filtrowanie `accountType = FAKE` w globalnym wyszukiwaniu userów (UsersService.findAll)
- [x] activity-rank — nie ma globalnego rankingu, tylko per-user (brak potrzeby filtrowania)
- [ ] testy serwisu

### Faza 4 — Backend: target occupancy na wydarzeniu/serii (wytyczne 3, 4, 8)

- [x] endpoint admina: ustaw/zmień `targetOccupancy` na `Event` (walidacja 1–100; null/0 = wyłączone)
- [x] endpoint admina: ustaw/zmień `targetOccupancy` na `EventSeries` + propagacja w generatorze serii
- [ ] trigger natychmiastowego przeliczenia monitora po zmianie
- [ ] obsługa wyłączenia: anulowanie `PENDING` `FAKE_USER_ENROLL` + `WITHDRAW` wszystkich (wytyczna 7)
- [ ] testy

### Faza 5 — Backend: picker i logika domenowa (wytyczne 6, 10; sekcje 6.4, 6.7)

- [x] `FakeUserPickerService` — dobór wg płci, wykluczenie zapisanych/zbanowanych, równoważenie po dynamicznym obłożeniu person + losowy tiebreak
- [x] handlery `FAKE_USER_ENROLL` / `FAKE_USER_WITHDRAW` (z warunkiem bufora 3 w momencie wykonania)
- [x] logika zastępowania wypisanego fake usera (wytyczna 10) — monitor uzupełni deficyt przy kolejnym przebiegu
- [ ] testy: dobór płci, ban, brak duplikatu, bufor, równoważenie obłożenia

### Faza 6 — Backend: monitor obłożenia (sekcje 6.1–6.3)

- [x] `FakeUsersMonitorService` — obciążenie liczone na **aktywnych zgłoszeniach** (uczestnicy + oczekujący, bez wypisanych), nie na slotach
- [x] cron `fake-users-monitor` (co ~15 min) — kwalifikacja wydarzeń, planowanie jobów z losowym `scheduledAt`
- [x] deficyt → `ENROLL`; nadmiar → `WITHDRAW` (priorytet: fake users na slotach gdy realni czekają)
- [x] finalny cleanup X h przed startem
- [x] reaktywny hook na evencie `join` realnego usera: przy braku wolnych miejsc natychmiast planuje `FAKE_USER_WITHDRAW` (mitygacja wyścigu monitor ↔ zapisy)
- [x] respektowanie feature flag `enableFakeUsers`
- [ ] testy: liczenie obłożenia (przykład z wytycznej 2), deficyt, nadmiar, cleanup, reaktywny hook

### Faza 7 — Backend: wypisywanie i ślad (wytyczna 9)

- [x] `WithdrawnBy.ADMIN` w `deriveStatus` (`enrollment.service.ts` + `events.service.ts`)
- [x] admin może wypisać dowolnego usera (host/gość/realny) → `withdrawnBy = ADMIN` + powiadomienie „administrator serwisu"
- [x] weryfikacja/uzupełnienie: wypisanie przez organizatora ma poprawny ślad i powiadomienie (withdrawnBy=ORGANIZER, notifyRemoved wywoływane)
- [x] fake user wypisany przez kogokolwiek (admin/system/organizator) → `withdrawnBy = USER`, brak powiadomienia, brak śladu
- [x] skip powiadomień dla `accountType = FAKE` w `notifyRemoved` i pokrewnych
- [ ] testy: ślad ADMIN dla realnego, brak śladu dla fake (każda ścieżka wypisania)

### Faza 8 — Backend: ręczne dodanie pojedynczego fake usera (wytyczna 5)

- [x] endpoint admina: ręczne dodanie jednego fake usera (z warunkiem bufora)
- [ ] testy

### Faza 9 — Frontend: panel admina (wytyczne 1, 5)

- [x] strona `/admin/fake-users` — listing kont fake users z szybką edycją avatara
- [x] tworzenie/edycja/usuwanie fake usera, podgląd liczby wydarzeń persony
- [x] metody w `admin.service.ts`, trasa w `app.routes.ts`, link w panelu admina
- [x] kontrola `targetOccupancy` w widoku wydarzenia (admin) — prefill 35 przy włączaniu (typ dodany)
- [x] kontrola `targetOccupancy` w widoku serii wydarzeń (admin) — NIE DOTYCZY, targetOccupancy jest na poziomie wydarzenia
- [x] przycisk „dodaj fake usera" (pojedynczo) w widoku wydarzenia (admin)
- [x] przycisk wypisania dowolnego uczestnika przez admina + etykieta statusu „usunięty przez administratora serwisu"
- [x] weryfikacja: fake users renderują się jako normalni uczestnicy (lista, avatary, czat grupowy — widoczni jako członkowie, B4) — WYMAGA RĘCZNEJ WERYFIKACJI W APLIKACJI

### Faza 10 — Design system

- [x] dodano ikonę 'power' do IconName (toggle aktywności fake users) — aktualizacja `docs/design-tokens.md` i `/dev/design-system`
- [x] badge REAL/FAKE — NIE WPROWADZONO, panel admina fake users jest dedykowany tylko do fake users, nie potrzeba rozróżniania

### Faza 11 — Integracja i testy E2E

- [ ] scenariusz: włączenie `targetOccupancy` → stopniowe dodawanie fake users z buforem 3
- [ ] scenariusz: napływ realnych zgłoszeń (uczestnicy + oczekujący) → obłożenie rośnie → stopniowe wypisywanie fake users
- [ ] scenariusz: wydarzenie płatne — fake user dostaje slot `confirmed=false`, brak rekordów płatności, czyste wypisanie
- [ ] scenariusz: finalny cleanup przed startem — zero fake users
- [ ] scenariusz: wyłączenie `targetOccupancy` → usunięcie wszystkich fake users
- [ ] scenariusz: ban fake usera przez organizatora → persona nieużywana ponownie u tego organizatora
- [ ] scenariusz: feature flag `enableFakeUsers = false`
- [ ] przegląd: brak wycieku fake users do wyszukiwarki, activity-rank, statystyk

## 8. Uwagi projektowe i ryzyka

Wszystkie kwestie blokujące zostały rozstrzygnięte (D1–D3, A1–A7, B1–B4). Poniżej uwagi
projektowe wraz z przyjętym podejściem oraz jedna kwestia procesowa.

- **Wyścig monitor ↔ realne zgłoszenia** — rozstrzygnięte: oprócz bufora 3, częstego
  executora i pomiaru obłożenia na zgłoszeniach, w Fazie 6 wdrażamy reaktywny hook na
  evencie `join` realnego usera (natychmiastowy `FAKE_USER_WITHDRAW` przy braku miejsc).
- **Równoważenie obłożenia person (6.7)** — przyjęte: dynamiczne liczenie aktywnych zgłoszeń
  persony (bez denormalizowanej kolumny). Jeśli profiling przy skali puli ~50 person pokaże
  koszt — optymalizacja przez cache w pamięci serwisu; nie zmienia to modelu danych.
- **`ScheduledJob` bez FK do `Event`** — `payload` to `Json`, więc usunięcie wydarzenia nie
  kaskaduje. Executor obsługuje to wprost: brak zasobu → job `CANCELLED` (nie `FAILED`).
- **Otwarte (procesowe, nie blokujące wdrożenia):** spójność z `docs/tasks/decoy-events.md` —
  przed równoległym wdrażaniem obu zadań uzgodnić wspólną pulę person i mechanizm, by ich
  nie duplikować. Nie blokuje rozpoczęcia prac nad fake users.
