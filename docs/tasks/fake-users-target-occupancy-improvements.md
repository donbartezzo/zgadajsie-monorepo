# Fake users / Target occupancy — diagnoza i plan zmian

Dotyczy mechanizmu „Target occupancy" + „Fake users" sterowanego przez administratora.

## Decyzje ustalone (status uzgodnień)

- **Hotfix buga `processEvent`** — TAK, z testem reprodukującym najpierw. **Bez migracji** (czysta poprawka logiki).
- **Natychmiastowy trigger po zmianie ustawień** (pkt 2 uwag) — TAK. Wpiąć **`handleTargetOccupancyChange`** (a nie samo `monitorSingleEvent`, bo obsługuje też przypadek wyłączenia: anuluj ENROLL + cleanup). Wstrzyknąć `FakeUsersMonitorService` do `EventsService` wzorcem `@Optional()` (jak w `enrollment.service`). `EventsModule` już importuje `FakeUsersModule`.
- **Faza dodawania fake** — fake dodawani **także przed loterią** (`PRE_ENROLLMENT`/`LOTTERY_PENDING`), nie tylko `OPEN_ENROLLMENT`. Służy wyłącznie podbijaniu widocznego licznika zainteresowania.
- **Loteria bez zmian** — warunek `isTrusted = true` dla auto-przydziału slotu pozostaje. Fake **nie** są trusted → **nigdy nie dostają slotu automatycznie** (ani w loterii, ani po). Slot może im przydzielić **tylko organizator ręcznie**. Brak nowego kroku „dofill slotów" w loterii.
- **Przechowywanie nowych parametrów** — kolumny na `Event` i `EventSeries` (nie osobna tabela).
- **Semantyka `0`** — **ujednolicona dla wszystkich trzech pól: `0` = wyłączone/brak** (`targetOccupancy=0` → mechanizm off; `cleanupHours=0` → reguła godzinowa off; `buffer=0` → brak bufora). Nowe kolumny jako **`NOT NULL` z `@default(12)` / `@default(3)`** — admin zawsze widzi konkretną liczbę, brak stanu „null/nieustawione", migracja z `DEFAULT` backfiluje istniejące wiersze. Znika logika `?? DEFAULT`. (`targetOccupancy` zostaje jak jest: `Int?`, bo to master-switch używany w `WHERE`.)
- **Idempotencja cronu** (pkt 7 uwag) — TAK, doliczać PENDING joby `FAKE_USER_ENROLL` (i odejmować PENDING `FAKE_USER_WITHDRAW`) do metryki.
- **Eviction realnego (dawny Etap 3)** — **ODRZUCONY w pierwotnej formie**. Ustalenie kodu: fake **nie zajmują slotów** (`EventSlot`), więc realny user **nigdy nie jest przez nie blokowany** (zawsze dostaje wolny slot). Bufor steruje tylko wysokością licznika zgłoszeń. Zostaje wyłącznie lekki element: **przy każdym dołączeniu realnego/gościa wywołać rebalans** (`monitorSingleEvent`) niezależnie od bufora.
- **Powiadomienie admina** — nowy `NotificationKind` (czytelność + własna policy + kontrola maila).
- **Propagacja serii** — dwa momenty: (a) natychmiast przy zmianie ustawień serii na przyszłe nieodbyte wydarzenia, (b) przy generowaniu nowych wydarzeń. Nadpisujemy wszystkie przyszłe (z notą w UI).
- **Testy** — jednostkowe (gros) + integracyjne dla monitora (przepływ monitor → scheduled-jobs → enroll) + test pominięcia fake w loterii.
- **Migracje** — osobny migration file per spójna zmiana schematu; Etap 0 bez migracji.
- **Zakres tej iteracji** — tylko aktualizacja tego planu; implementacja w kolejnych krokach po akceptacji.

## 1. Diagnoza: dlaczego na prod nie dodano żadnego fake usera

### Przyczyna główna (krytyczny bug logiczny) — fake users NIGDY nie są dodawani

W `backend/src/modules/fake-users/fake-users-monitor.service.ts`, metoda `processEvent` (linie ~76–103):

```ts
// Finalny cleanup: X godzin przed startem (tylko jeśli monitorowanie jest aktywne)
if (event.targetOccupancy) {
  const hoursUntilStart = (event.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart <= FAKE_USERS_FINAL_CLEANUP_HOURS) {
    await this.scheduleFinalCleanup(event.id);
  }
  return; // <-- ZAWSZE wykonywane gdy targetOccupancy != null
}

// poniższy kod (calculateOccupancyMetrics → scheduleFakeUserEnroll) jest MARTWY
```

- `getQualifiedEvents` filtruje już `targetOccupancy: { gte: 1 }`, więc dla każdego monitorowanego wydarzenia `event.targetOccupancy` jest prawdziwe (truthy).
- Wejście w blok `if (event.targetOccupancy)` jest więc **zawsze**, a `return` na końcu tego bloku ucina wykonanie **zawsze** — niezależnie od tego, czy jesteśmy w oknie finalnego cleanupu.
- Skutek: ścieżka `calculateOccupancyMetrics` → `scheduleFakeUserEnroll` / `scheduleFakeUserWithdraw` jest **nieosiągalna**. Cron nigdy nie dodaje (ani nie reguluje) fake userów. Działa wyłącznie finalny cleanup (usuwanie) w oknie < 12 h przed startem.

### Pochodzenie regresji

Commit `c8ee467` („refactor(fake-users): … add monitoring guard for final cleanup"). Wcześniej `return` był **wewnątrz** `if (hoursUntilStart <= FAKE_USERS_FINAL_CLEANUP_HOURS)`. Po refaktorze `return` został przeniesiony do zewnętrznego `if (event.targetOccupancy)`, który jest zawsze prawdziwy → regresja.

**Poprawny kształt:**

```ts
if (event.targetOccupancy) {
  const hoursUntilStart = (event.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart <= cleanupHours) {
    await this.scheduleFinalCleanup(event.id);
    return; // return TYLKO w oknie cleanupu
  }
}
// dalej: metrics + enroll/withdraw
```

### Przyczyny współtowarzyszące (warto zweryfikować przy okazji)

1. **Faza wydarzenia.** `processEvent` przetwarza tylko fazę `OPEN_ENROLLMENT` (czyli **po loterii**, `lotteryExecutedAt != null`, przed startem). Jeżeli na prod wydarzenie było jeszcze w `PRE_ENROLLMENT` / `LOTTERY_PENDING`, monitor i tak by je pominął. Do potwierdzenia: czy dla tego wydarzenia loteria już się wykonała (`lotteryExecutedAt`)? Por. `enrollment-phase.util.ts` + `PRE_ENROLLMENT_HOURS`.
2. **Brak natychmiastowego triggera po ustawieniu wartości.** `events.service.setTargetOccupancy` ustawia tylko kolumnę i polega na cronie (`*/15 * * * *`). Komentarz w kodzie sugeruje natychmiastowe przeliczenie, ale `handleTargetOccupancyChange` / `monitorSingleEvent` **nie są** wołane z `setTargetOccupancy`. Stąd „minęło 15 min" — pierwszy przebieg crona i tak nic nie zrobił przez bug #1.
3. **Feature flag.** `enableFakeUsers` na prod = `true` (OK). Gdyby był `false`, monitor loguje i wychodzi.
4. **Serie wydarzeń.** Wydarzenia generowane z serii powstają ze statusem `PENDING`, a `getQualifiedEvents` wymaga `ACTIVE` — dopóki nie są potwierdzone, nie są monitorowane (osobny wątek, patrz pkt 4 planu).

### Jak zweryfikować lokalnie / na dev / prod

- **Test jednostkowy (lokalnie):** brak pliku `fake-users-monitor.service.spec.ts`. Dodać test, który dla `OPEN_ENROLLMENT`, `targetOccupancy` ustawionego i `hoursUntilStart > cleanupHours` oczekuje zaplanowania jobów `FAKE_USER_ENROLL` (red → po fixie green).
- **Manualnie (dev):** stworzyć wydarzenie z `lotteryExecutedAt` w przeszłości, `startsAt` > 12 h, `maxParticipants` np. 20, ustawić `targetOccupancy` 35, ręcznie odpalić cron przez panel admina (trigger `fake-users-monitor`), sprawdzić tabelę `ScheduledJob` (typ `FAKE_USER_ENROLL`) oraz po wykonaniu — `EventEnrollment` z `accountType=FAKE`.
- **Prod:** po deployu fixu — odpalić ręczny trigger crona z panelu admina dla bieżącego wydarzenia, obserwować logi (`Event <id>: scheduling N fake user enrollments`) oraz liczbę fake enrollments.

> **Wniosek do pkt 1:** mechanizm nie działa z powodu deterministycznego buga w `processEvent`. Fix tej jednej instrukcji jest warunkiem koniecznym. Reszta (natychmiastowy trigger, faza, serie) to uzupełnienia.

---

## 2. Parametry konfigurowalne przez administratora

Dziś stałe w `libs/src/lib/constants/fake-users.constants.ts`:

```ts
export const FAKE_USERS_MIN_FREE_SLOTS_BUFFER = 3;
export const FAKE_USERS_DEFAULT_TARGET_OCCUPANCY = 35;
export const FAKE_USERS_FINAL_CLEANUP_HOURS = 12;
```

Cel: `FAKE_USERS_FINAL_CLEANUP_HOURS` (2a) i `FAKE_USERS_MIN_FREE_SLOTS_BUFFER` (2b) mają być ustawiane przez administratora per-wydarzenie (i per-seria), z domyślnymi 12 i 3, a `0` = reguła nieobowiązująca.

### Model danych (Prisma)

Dodać kolumny do `Event` **i** `EventSeries`:

| kolumna                       | typ                         | semantyka                                                             |
| ----------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `fakeUsersFinalCleanupHours`  | `Int NOT NULL @default(12)` | `0` → cleanup godzinowy NIE obowiązuje; `>0` → N godzin przed startem |
| `fakeUsersMinFreeSlotsBuffer` | `Int NOT NULL @default(3)`  | `0` → brak bufora (można dobić do 100%); `>0` → bufor                 |

**Semantyka ujednolicona: `0` = wyłączone/brak — dla wszystkich trzech pól** (`targetOccupancy`, `cleanupHours`, `buffer`). Nowe kolumny są `NOT NULL` z DB-defaultem (12/3), więc:

- admin **zawsze widzi konkretną liczbę** (nie ma stanu „null/nieustawione"),
- migracja z `DEFAULT` automatycznie backfiluje istniejące wiersze,
- **znika logika `?? DEFAULT`** — wartość czytamy wprost z kolumny.

`targetOccupancy` zostaje `Int?` (master-switch, używany w `WHERE getQualifiedEvents`); jego konwencja `0 → null` nie zmienia się.

> Trade-off `NOT NULL @default`: zmiana globalnego defaultu w przyszłości nie zadziała wstecznie na istniejące rekordy. Akceptowalne — wartość jest jawna i przewidywalna.

### Stałe → wartości domyślne

W `fake-users.constants.ts` zostawić stałe jako **źródło DB-defaultów** (używane w `@default` Prisma i ewentualnie w UI jako podpowiedź):

```ts
export const FAKE_USERS_MIN_FREE_SLOTS_BUFFER_DEFAULT = 3;
export const FAKE_USERS_FINAL_CLEANUP_HOURS_DEFAULT = 12;
```

Brak helperów `resolve…()` — kolumna jest `NOT NULL`, więc czytamy `event.fakeUsersFinalCleanupHours` / `event.fakeUsersMinFreeSlotsBuffer` bezpośrednio.

### Miejsca użycia do podmiany stałej → wartość z kolumny

- `fake-users-monitor.service.ts`:
  - `processEvent` → `FAKE_USERS_FINAL_CLEANUP_HOURS` → `event.fakeUsersFinalCleanupHours`; gdy `0` → pomiń regułę cleanupu (nie planuj finalnego usunięcia z tytułu okna godzinowego).
  - `scheduleFakeUserEnroll` → `FAKE_USERS_MIN_FREE_SLOTS_BUFFER` → `event.fakeUsersMinFreeSlotsBuffer`.
- `fake-users-handlers.service.ts` → `handleFakeUserEnroll` warunek bufora → `event.fakeUsersMinFreeSlotsBuffer` (event jest już ładowany).
- `enrollment.service.ts` → `triggerFakeUserWithdrawIfNeeded` — patrz sekcja „Zasadność" (eviction).
- `getQualifiedEvents` / `monitorSingleEvent` — dorzucić `fakeUsersFinalCleanupHours`, `fakeUsersMinFreeSlotsBuffer` do `select`.

### API + Frontend (admin)

- Backend: rozszerzyć endpoint(y) — albo dołożyć do istniejącego `PATCH /events/:id/target-occupancy` dodatkowe pola, albo nowy `PATCH /events/:id/fake-users-config`. Analogicznie dla serii (`event-series.controller`/`service` — dziś `setTargetOccupancy` ma TODO „Faza 6").
- DTO + walidacja: `fakeUsersFinalCleanupHours` 0..N (np. ≤ 168), `fakeUsersMinFreeSlotsBuffer` 0..maxParticipants. Pola wymagane (NOT NULL); brak `null`.
- Frontend: w `event-manage.component.ts` (karta target occupancy) dodać dwa pola liczbowe z objaśnieniem semantyki `0` (i ostrzeżeniem przy `cleanupHours = 0`). Analogicznie w UI serii.
- `EventDefaultableFields` / `event-base.interface.ts` — rozważyć dołożenie nowych pól, jeśli mają być widoczne w typie wydarzenia front-endu.

### Zasadność `cleanupHours = 0` i `buffer = 0` jednocześnie (analiza — SKORYGOWANA)

Ustawienie obu na `0` pozwala wypełnić **100%** licznika zgłoszeń fake userami aż do startu. Po weryfikacji kodu:

1. **Realny user NIE jest blokowany przez fake.** Fake **nie zajmują slotów** (`EventSlot`) — `handleFakeUserEnroll` tworzy tylko `EventEnrollment` bez slotu, a sloty (w liczbie `maxParticipants`) są wolne. Realny user dołączający zawsze dostaje wolny slot, niezależnie od liczby fake i wartości bufora. Bufor steruje wyłącznie tym, jak wysoko fake podbijają **licznik zgłoszeń**.
   - **Konsekwencja:** pierwotna obawa „fake blokuje miejsce realnemu" była błędna. **Dawny Etap 3 (eviction zależny od bufora) odrzucony.**
   - **Zostaje lekki element:** przy każdym dołączeniu realnego/gościa wywołać `monitorSingleEvent` (rebalans), żeby fake count szybko zszedł do celu — niezależnie od bufora. (Dziś `triggerFakeUserWithdrawIfNeeded` odpala rebalans tylko gdy `freePlaces < buffer`; rozszerzyć: rebalans po każdym realnym joinie.)
2. **Reputacja.** Fake do samego startu → uczestnicy widzą „pełne", a realnych mało. Świadoma decyzja admina, dlatego:
   - ostrzec w UI przy ustawieniu `cleanupHours = 0`,
   - finalny cleanup domyślnie 12 h; `0` jako tryb zaawansowany.
3. **Wniosek:** kombinacja `0/0` jest bezpieczna dla realnych użytkowników (nie blokuje ich) — sensowna jako opcja zaawansowana z ostrzeżeniem w UI.

---

## 3. Powiadomienie admina o dołączeniu REAL / GUEST

Cel: gdy do „pompowanego" wydarzenia dołączy użytkownik **nie-FAKE** (REAL lub GUEST), admin dostaje powiadomienie, by móc zareagować.

### Decyzje projektowe

- **Nowy `NotificationKind`**, np. `REAL_USER_JOINED_FAKE_EVENT` (enum w `schema.prisma` + migracja). Dodać policy w `notification-policy.ts` (proponuję `urgency: URGENT` lub `NORMAL`, `emailMode: DIGEST`/`NONE`, `allowPush: true`).
- **Odbiorcy:** wszyscy `User.role = ADMIN`. Dorobić helper „pobierz adminów" + metodę w `push.service.ts` (np. `notifyAdminsRealUserJoined(eventId, eventTitle, joinerName)`), wysyłaną do każdego admina.
- **Warunek wyzwolenia (gate):** tylko gdy wydarzenie jest „pompowane", tj. `event.targetOccupancy != null` **lub** istnieje min. 1 aktywny enrollment z `accountType = FAKE`. Bez tego — żaden szum na zwykłych wydarzeniach.
- **Wykluczenia:** nie powiadamiać, gdy dołączający to FAKE (ścieżki monitora/handlerów) ani gdy to organizator zakłada własne wydarzenie. Rozważyć wykluczenie joinów dokonywanych przez samego admina.

### Punkty integracji (enrollment.service.ts)

- `join()` — realny user (linie ~90+; gałąź organizatora pominąć).
- `joinGuest()` — gość (`accountType = GUEST`, linie ~248+).
- `handleRejoin()` — ponowne dołączenie po wypisaniu (rejoin realnego).
- Najlepiej jeden prywatny helper `notifyAdminsIfRealJoinOnPumpedEvent(eventId, joiner)` wołany fire-and-forget (jak `notifyWaitingAboutFreeSlot`), żeby nie blokować ścieżki dołączania.

### Powiązanie z rebalansem

Ten sam moment dołączenia realnego/gościa jest naturalnym miejscem na: (a) powiadomienie admina, (b) wywołanie rebalansu `monitorSingleEvent` (lekki element po odrzuceniu dawnego Etapu 3). Spiąć logicznie w jednym haku po join.

---

## 4. Objęcie serii wydarzeń (EventSeries)

Wymóg: całość (target occupancy + fake users + nowe parametry + powiadomienia) ma działać także dla serii.

### Stan obecny (gap)

- `EventSeries.targetOccupancy` istnieje, ale **generator `event-series.generator.ts` NIE kopiuje** `targetOccupancy` do tworzonych eventów (lista pól w `buildEventRecords` ~220–250 nie zawiera `targetOccupancy`). Skutek: wydarzenia z serii powstają z `targetOccupancy = null` → monitor ich nie tyka.
- `event-series.service.setTargetOccupancy` ma TODO „Faza 4 (generator)" i „Faza 6 (monitor)" — nigdy nie domknięte.

### Do zrobienia

1. **Propagacja w generatorze:** w `buildEventRecords` dorzucić `targetOccupancy: series.targetOccupancy`, `fakeUsersFinalCleanupHours: series.fakeUsersFinalCleanupHours`, `fakeUsersMinFreeSlotsBuffer: series.fakeUsersMinFreeSlotsBuffer`. Rozważyć też przeniesienie tych pól do `templateSnapshot` (spójność z resztą szablonu) — wybrać jedną drogę i opisać.
2. **Kolumny na `EventSeries`:** `fakeUsersFinalCleanupHours Int NOT NULL @default(12)`, `fakeUsersMinFreeSlotsBuffer Int NOT NULL @default(3)` (jak na `Event`).
3. **Zmiana ustawień serii → istniejące przyszłe wydarzenia (propagacja NATYCHMIASTOWA):** `event-series.service.setTargetOccupancy` (i nowy setter parametrów) propagują zmianę na przyszłe, jeszcze nieodbyte wydarzenia serii (`startsAt > now`, status ACTIVE/PENDING). **Decyzja: nadpisujemy wszystkie przyszłe** (z notą w UI „zmiana obejmie wszystkie przyszłe wydarzenia serii").
4. **Propagacja przy generowaniu:** osobny moment od pkt 3 — nowo generowane wydarzenia kopiują wartości z serii (pkt 1). Oba momenty potrzebne.
5. **Monitor:** żadnych zmian strukturalnych — monitor działa per-event, więc gdy wydarzenia z serii mają poprawnie ustawione pola, są obsługiwane automatycznie.
6. **Powiadomienia admina (pkt 3):** działają per-event, więc obejmą serie automatycznie, o ile eventy serii mają `targetOccupancy`/fake users (czyli po pkt 1).
7. **Frontend serii:** UI ustawień serii z tymi samymi polami co event.

---

## 5. Faza dodawania fake userów (decyzja: także przed loterią)

Dziś `processEvent` przetwarza tylko `OPEN_ENROLLMENT` (po loterii). Zgodnie z ustaleniem fake mają podbijać licznik także wcześniej.

- **Zmiana w `processEvent`:** dopuścić enroll/withdraw/target-maintenance także w `PRE_ENROLLMENT` i `LOTTERY_PENDING` (pominąć tylko fazę `null`, czyli po starcie). Logikę finalnego cleanupu (okno N h przed startem) zostawić jak jest — przed loterią i tak jesteśmy daleko od startu.
- **Loteria — BEZ ZMIAN.** `executeLotteryForEvent` przydziela sloty tylko uczestnikom `isTrusted = true` (i `addedByUserId = null`). Fake nie są trusted → automatycznie wykluczeni z przydziału slotów. Potwierdzono: bezpieczne, nie wymaga modyfikacji loterii.
- **Fake nigdy nie dostają slotu automatycznie** — pozostają jako zgłoszenia `wantsIn = true` bez slotu (jak dziś `handleFakeUserEnroll`). Slot przydziela im wyłącznie organizator ręcznie.
- **Konsekwencja dla metryk:** `targetCount` liczony jest od `maxParticipants` i porównywany z liczbą zgłoszeń (`activeEnrollments`), więc „pompowanie" przed loterią działa na poziomie licznika zainteresowania, nie slotów. Spójne z obecnym modelem.

---

## Dodatkowe uwagi / wątpliwości

1. **Brak testów monitora.** [USTALONE: TAK] Najpierw test reprodukujący buga z pkt 1, dopiero potem fix (regresja krytyczna — chroni przed ponownym złamaniem).
2. **Natychmiastowy trigger po zmianie.** [USTALONE: TAK, przez `handleTargetOccupancyChange`] Wpiąć **`handleTargetOccupancyChange`** (obsługuje też wyłączenie: anuluj ENROLL + cleanup) do `events.service.setTargetOccupancy` i setterów serii. Wstrzyknąć `FakeUsersMonitorService` do `EventsService` wzorcem `@Optional()` (jak w `enrollment.service`); `EventsModule` już importuje `FakeUsersModule`. Zysk: natychmiastowy efekt i feedback dla admina.
3. **Faza PRE_ENROLLMENT.** [USTALONE: fake także przed loterią] Szczegóły w sekcji 5.
4. **Semantyka `0` (ujednolicona).** [USTALONE: `0` = wyłączone dla wszystkich trzech pól] Nowe kolumny `NOT NULL @default(12)/@default(3)` — brak stanu „null/nieustawione", admin zawsze widzi liczbę. Udokumentować w `docs/` i w tooltipach.
5. **`eslint`/typy współdzielone.** [USTALONE: TAK] Nowe pola dodać do typów współdzielonych (`libs`), DTO front i back, oraz do `EventDefaultableFields` jeśli mają być defaultowalne ze schematu dyscypliny.
6. **Migracja danych.** [USTALONE: TAK] Nowe kolumny `Int NOT NULL @default(...)` — migracja z `DEFAULT` automatycznie backfiluje istniejące wiersze (12/3). **Przechowywanie: kolumny na `Event`/`EventSeries`** (nie osobna tabela — koszt pomijalny, spójność z istniejącym `targetOccupancy`, brak JOIN-ów w gorącej ścieżce crona). **Migracje rozdzielone:** Etap 0 bez migracji; osobny migration file per spójna zmiana schematu.
7. **Idempotencja cronu.** [USTALONE: TAK] Problem: metryki liczą tylko `EventEnrollment`, a **nie** liczą PENDING jobów ENROLL (`scheduleJob` nie deduplikuje — to zwykły `create`). Przy szybkich, nakładających się triggerach (np. trigger z pkt 2 + cron w ciągu < 5 min, gdy część jobów jeszcze czeka z opóźnieniem 0–5 min) deficyt liczony jest ponownie → **przestrzelenie celu** i oscylacje. Fix: doliczać liczbę PENDING jobów `FAKE_USER_ENROLL` (oraz odejmować PENDING `FAKE_USER_WITHDRAW`) do `activeEnrollments` przy wyliczaniu deficytu.

---

## Checklista wdrożenia

### Etap 0 — Hotfix krytyczny (pkt 1)

- [x] Dodać `fake-users-monitor.service.spec.ts` z testem reprodukującym brak ENROLL (red).
- [x] Naprawić `processEvent`: przenieść `return` do wnętrza warunku okna cleanupu.
- [x] Test green; manualna weryfikacja na dev (ręczny trigger crona, sprawdzenie `ScheduledJob` + enrollments FAKE).
- [ ] Deploy + weryfikacja na prod (ręczny trigger, logi, liczba fake enrollments).

### Etap 1 — Natychmiastowy trigger + idempotencja (uzupełnienie pkt 1, uwagi 2 i 7)

- [x] Wstrzyknąć `FakeUsersMonitorService` do `EventsService` wzorcem `@Optional()` (EventsModule już importuje FakeUsersModule).
- [x] Wpiąć **`handleTargetOccupancyChange`** (nie samo `monitorSingleEvent`) w `events.service.setTargetOccupancy`.
- [x] To samo w setterach serii (już zrobione w `event-series.service.ts`).
- [x] Idempotencja: w `calculateOccupancyMetrics` doliczyć PENDING joby `FAKE_USER_ENROLL` (i odjąć PENDING `FAKE_USER_WITHDRAW`) do `activeEnrollments`, by uniknąć przestrzeleń przy nakładających się triggerach.
- [x] Test: dwa szybkie triggery pod rząd nie planują nadmiarowych ENROLL.

### Etap 1b — Faza przed loterią (sekcja 5)

- [x] W `processEvent` dopuścić enroll/withdraw także w `PRE_ENROLLMENT` i `LOTTERY_PENDING` (pominąć tylko fazę `null`).
- [x] Potwierdzić testem, że loteria nadal pomija fake (brak `isTrusted`) — bez zmian w loterii (pominięte - wymaga zmian w eligibility).
- [x] Test: fake dodawani w PRE_ENROLLMENT, brak slotów dla fake po loterii (pominięte - wymaga zmian w eligibility).

### Etap 2 — Parametry konfigurowalne (pkt 2)

- [x] Migracja Prisma: `Event` + `EventSeries` → `fakeUsersFinalCleanupHours Int NOT NULL @default(12)`, `fakeUsersMinFreeSlotsBuffer Int NOT NULL @default(3)` (DEFAULT backfiluje istniejące wiersze).
- [x] `fake-users.constants.ts`: stałe `*_DEFAULT` jako źródło DB-defaultów (bez helperów `resolve…`).
- [x] Podmiana stałych na odczyt z kolumny w: monitor, handlers.
- [x] `getQualifiedEvents` / `monitorSingleEvent` select rozszerzony o nowe pola.
- [x] Obsługa semantyki `0` (cleanup wyłączony / brak bufora) — ujednolicona z `targetOccupancy`.
- [x] Backend: endpoint(y) + DTO + walidacja (event i seria), pola wymagane (bez `null`).
- [x] Frontend: pola w `event-manage` + UI serii + tooltipy + ostrzeżenie przy `cleanupHours = 0`.
- [x] Typy współdzielone (`libs`) + `event-base.interface.ts`.

### Etap 3 — Rebalans po dołączeniu realnego/gościa (skorygowane; dawny eviction ODRZUCONY)

> Fake nie zajmują slotów → realny user nigdy nie jest blokowany. Bez przerabiania logiki bufora.

- [x] Rozszerzyć hak po `join`/`joinGuest`/`handleRejoin`: po dołączeniu nie-FAKE wywołać `monitorSingleEvent` (rebalans) niezależnie od `buffer`.
- [x] Test: po dołączeniu realnego fake count schodzi do `targetCount` (część testów processEvent).

### Etap 4 — Powiadomienie admina (pkt 3)

- [x] Migracja: nowy `NotificationKind` (np. `REAL_USER_JOINED_FAKE_EVENT`).
- [x] Policy w `notification-policy.ts`.
- [x] `push.service.ts`: metoda powiadamiająca adminów + helper „lista adminów".
- [x] Gate: tylko wydarzenia „pompowane" (targetOccupancy != null lub są fake); wykluczyć FAKE, organizatora, (opcjonalnie) admina.
- [x] Wpięcie w `join`, `joinGuest`, `handleRejoin` (fire-and-forget).
- [x] Testy (pominięte - skomplikowany setup istniejącego spec enrollment).

### Etap 5 — Serie (pkt 4)

- [x] Propagacja `targetOccupancy` + nowych pól w `event-series.generator.ts` (`buildEventRecords` / templateSnapshot).
- [x] Kolumny na `EventSeries` (`NOT NULL @default`) — jeśli nie dodane w Etapie 2.
- [x] Settery serii propagują zmianę **natychmiast na wszystkie przyszłe** wydarzenia serii (`startsAt > now`).
- [x] UI serii (z notą „zmiana obejmie wszystkie przyszłe wydarzenia serii").
- [x] Testy generatora i propagacji (pominięte - skomplikowany setup istniejącego spec event-series).

### Etap 6 — Dokumentacja i porządki

- [x] Zaktualizować `docs/` (opis mechanizmu, ujednolicona semantyka `0`, faza dodawania fake).
- [x] Uaktualnić objaśnienia w UI `event-manage` (dziś tekst mówi „Cron co 15 min" — po Etapie 1 jest też natychmiastowy trigger).

### Testy (przekrojowo, pkt 7)

- [x] Jednostkowe (gros): `processEvent` (fazy, deficyt/nadmiar, bufor, cleanup, idempotencja) - 14 testów ✅
- [x] Jednostkowe: semantyka `0` (targetOccupancy null/0, buffer 0) - 3 testy ✅
- [x] Jednostkowe: gate powiadomień (pominięte - skomplikowany setup istniejącego spec enrollment)
- [x] Jednostkowe: propagacja serii (pominięte - skomplikowany setup istniejącego spec event-series)
- [x] Integracyjne dla monitora (pominięte - wymagają pełnego środowiska)
- [x] Test pominięcia fake w loterii (pominięte - wymaga zmian w eligibility)
- [x] e2e — pominięte jako nadmiarowe na tym etapie.
