# Strategia testowania — ZgadajSie.pl

> Dokument przeznaczony do wdrożenia testów etapami.
> Zawiera analizę zasadności, priorytety oraz checkpointy implementacyjne.
>
> **Status:** dokument planistyczny — brak implementacji
> **Data:** 2026-04-18

---

## Spis treści

1. [Kontekst i stan aktualny](#1-kontekst-i-stan-aktualny)
2. [Zasadność testów w tym projekcie](#2-zasadność-testów-w-tym-projekcie)
3. [Strategia uruchamiania](#3-strategia-uruchamiania)
4. [Architektura testów](#4-architektura-testów)
5. [ETAP 0 — Setup środowiska testowego](#5-etap-0--setup-środowiska-testowego)
6. [ETAP 1 — Unit testy serwisów (backend)](#6-etap-1--unit-testy-serwisów-backend)
7. [ETAP 1.5 — Backend integration testy (cross-module)](#7-etap-15--backend-integration-testy-cross-module)
8. [ETAP 2 — Unit testy utylitariów i walidatorów](#8-etap-2--unit-testy-utylitariów-i-walidatorów)
9. [ETAP 3 — Unit testy serwisów (frontend)](#9-etap-3--unit-testy-serwisów-frontend)
10. [ETAP 4 — Integracyjne testy komponentów](#10-etap-4--integracyjne-testy-komponentów)
11. [ETAP 5 — E2E — krytyczne flow użytkownika](#11-etap-5--e2e--krytyczne-flow-użytkownika)
12. [Proponowana struktura plików testowych](#12-proponowana-struktura-plików-testowych)
13. [Pułapki i zasady techniczne](#13-pułapki-i-zasady-techniczne)
14. [Metryki sukcesu](#14-metryki-sukcesu)

---

## 1. Kontekst i stan aktualny

### Co jest testowane dziś

| Lokalizacja         | Plik                     | Zawartość                    |
| ------------------- | ------------------------ | ---------------------------- |
| `backend/src/app/`  | `app.service.spec.ts`    | 1 trywialny test hello-world |
| `backend/src/app/`  | `app.controller.spec.ts` | 1 trywialny test hello-world |
| `frontend/src/app/` | `app.spec.ts`            | 1 test tworzenia komponentu  |
| `frontend-e2e/src/` | `example.spec.ts`        | placeholder Playwright       |
| `backend-e2e/src/`  | `backend.spec.ts`        | placeholder HTTP GET /       |

**Pokrycie testami: ~0% logiki biznesowej.**

### Narzędzia już skonfigurowane

- **Backend:** Jest + `ts-jest`, konfiguracja w `jest.config.ts`
- **Frontend:** Jest + `jest-preset-angular` + `jest-environment-jsdom`
- **E2E:** Playwright (Chrome, Firefox, WebKit)
- **Coverage:** katalog `coverage/` istnieje, skrypt `test:coverage` dostępny

Infrastruktura jest gotowa — nie trzeba nic instalować.

---

## 2. Zasadność testów w tym projekcie

### Argumenty ZA testami (silne)

**Złożoność logiki biznesowej:**

- Enrollment przechodzi przez min. 4 statusy: `PENDING → APPROVED → CONFIRMED → WITHDRAWN/REJECTED`
- Dwa tryby dołączania: `PRE_ENROLLMENT` i `OPEN_ENROLLMENT`
- Loteria przydziału miejsc (jeszcze nie w pełni zautomatyzowana)
- Uprawnienia zależą od roli: nowy użytkownik / zaufany / zbanowany / organizator

**Ryzyko regresji:**

- Kilka modułów jest ze sobą silnie powiązanych (enrollment → slots → payments → vouchers)
- Zmiana warunków dołączenia do eventu może cicho zepsuć płatności
- Logika loterii i faz enrollmentu jest podatna na błędy off-by-one w datach

**Kryterium finansowe:**

- Platforma obsługuje płatności Tpay — błąd w webhook handlerze lub naliczaniu voucherów ma bezpośredni koszt finansowy
- Brak testu na `handleWebhook()` = ręczna weryfikacja po każdej zmianie

**Kompleksowe DTO + walidatory:**

- `IsStrongPassword()` to własny walidator — bez testu nie ma gwarancji poprawności
- DTO są rozbudowane (np. `create-event.dto.ts` ma ~15+ pól z walidacją)
- Wiele DTO korzysta z dziedziczenia — błędy propagują się cicho

### Argumenty, które trzeba wziąć pod uwagę (kontekst)

- Projekt jest aktywnie rozwijany — zbyt wczesne testy mogą być droższe w utrzymaniu niż późne
- E2E przy braku stabilnego środowiska testowego dają fałszywe alarmy
- Pełne pokrycie na starcie to przerost formy nad treścią

### Rekomendacja

> **Wdrażaj testy selektywnie i progresywnie, zaczynając od miejsc o najwyższym ryzyku i koszcie błędu.**

Nie ma sensu testować wszystkiego naraz. Celem jest osiągnięcie sensownego pokrycia dla:

1. serwisów z logiką biznesową (enrollment, payments, auth)
2. utylitariuszy i walidatorów (deterministyczne — łatwe do utrzymania)
3. formularzy z walidacją (frontend)
4. 3–5 krytycznych flow e2e

---

## 3. Strategia uruchamiania

### Kiedy testy powinny być uruchamiane

| Kontekst                     | Zakres                         | Uzasadnienie                      |
| ---------------------------- | ------------------------------ | --------------------------------- |
| **lokalnie: przed commitem** | unit tests (fast)              | szybki feedback, blokuje regresję |
| **lokalnie: przed PR**       | unit + integration             | pełna weryfikacja gałęzi          |
| **CI: na każdym PR**         | unit + integration + e2e smoke | gwarancja quality gate            |
| **CI: merge do main**        | pełna suita + coverage report  | śledzenie pokrycia w czasie       |
| **nocny cron (opcjonalnie)** | pełne e2e na staging           | wykrywa błędy środowiskowe        |

### Podział prędkości

```
Unit tests      → < 30s   (izolowane, bez I/O)
Integration     → < 2 min (z bazą in-memory lub mock)
E2E smoke       → < 5 min (3–5 krytycznych flow)
E2E full        → < 15 min (wszystkie flow)
```

### Komendy (do dodania w `package.json`)

```json
"test:unit": "nx run-many --target=test --parallel=4",
"test:integration": "nx run-many --target=test:integration --parallel=2",
"test:e2e": "nx run frontend-e2e:e2e",
"test:e2e:smoke": "nx run frontend-e2e:e2e --grep @smoke",
"test:coverage": "nx run-many --target=test --coverage"
```

---

## 4. Architektura testów

### Zasady mockowania

**Backend:**

- Mockuj `PrismaService` używając `@golevelup/ts-jest` lub ręcznych jest.fn()
- Mockuj zewnętrzne serwisy (Tpay, email, S3) jako `jest.mock()`
- Nie używaj rzeczywistej bazy w unit testach — tylko w integration
- W integration testach użyj osobnej bazy PostgreSQL (Docker) lub SQLite w pamięci

**Frontend:**

- Mockuj `HttpClient` za pomocą `HttpClientTestingModule` lub `provideHttpClientTesting()`
- Mockuj `Router` i `ActivatedRoute` — nie testuj routingu w unit testach komponentów
- Używaj `TestBed.configureTestingModule()` z minimalnym zestawem providerów
- Dla sygnałów Angulara: testuj efekty przez `TestScheduler` lub flush

### Nomenklatura plików

```
// unit testy obok pliku źródłowego
auth.service.ts       → auth.service.spec.ts
event-time-status.util.ts → event-time-status.util.spec.ts

// integration testy w katalogu __tests__
// (opcjonalnie — jeśli jest ich wiele)
events/
  __tests__/
    events.service.integration.spec.ts

// e2e w katalogu e2e projektu
frontend-e2e/src/
  auth.spec.ts
  enrollment.spec.ts
```

---

## 5. ETAP 0 — Setup środowiska testowego

> **Priorytet:** Blokujący — wykonaj raz przed pierwszym checkpointem.

### CHECKPOINT 0.1 — Zależności testowe (backend)

Zainstaluj i skonfiguruj narzędzia do mockowania:

```bash
pnpm add -D @golevelup/ts-jest
```

Alternatywnie — bez dodatkowej biblioteki, używając ręcznych `jest.fn()` (patrz rozdz. 13).

Upewnij się, że `backend/jest.config.ts` zawiera:

```typescript
// backend/jest.config.ts — sprawdź że istnieje
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

Sprawdź działanie: `pnpm nx test backend --testFile=src/app/app.service.spec.ts`

---

### CHECKPOINT 0.2 — Konfiguracja Angular TestBed dla standalone components

W `frontend/src/test-setup.ts` upewnij się, że `zone.js` jest zaimportowany:

```typescript
import 'zone.js';
import 'zone.js/testing';
```

Sprawdź `frontend/jest.config.ts` pod kątem:

```typescript
setupFilesAfterFramework: ['<rootDir>/src/test-setup.ts'],
testEnvironment: 'jsdom',
```

Sprawdź działanie: `pnpm nx test frontend --testFile=src/app/app.spec.ts`

---

### CHECKPOINT 0.3 — Baza danych testowa (dla integration testów)

Skonfiguruj osobną bazę na potrzeby testów integracyjnych:

```yaml
# docker-compose.test.yml
services:
  db-test:
    image: postgres:16
    environment:
      POSTGRES_DB: zgadajsie_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - '5433:5432'
```

W `backend/.env.test`:

```
DATABASE_URL="postgresql://test:test@localhost:5433/zgadajsie_test"
```

Skrypt setup przed integration testami:

```bash
DATABASE_URL=$TEST_DB_URL pnpm prisma migrate deploy
DATABASE_URL=$TEST_DB_URL pnpm prisma db seed
```

---

### CHECKPOINT 0.4 — Playwright: konfiguracja storageState

Dla testów e2e wymagających zalogowanego użytkownika skonfiguruj `storageState`, żeby nie logować się w każdym teście:

```typescript
// frontend-e2e/playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:4200',
    storageState: 'playwright/.auth/user.json',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'authenticated',
      dependencies: ['setup'],
      use: { storageState: 'playwright/.auth/user.json' },
    },
    {
      name: 'unauthenticated',
    },
  ],
});
```

```typescript
// frontend-e2e/src/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', process.env['TEST_USER_EMAIL']!);
  await page.fill('[data-testid="password"]', process.env['TEST_USER_PASSWORD']!);
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

Plik `playwright/.auth/user.json` dodaj do `.gitignore`.

---

## 6. ETAP 1 — Unit testy serwisów (backend)

> **Priorytet:** Najwyższy. Logika biznesowa skoncentrowana w serwisach, bez UI.

### CHECKPOINT 1.1 — `AuthService`

**Plik:** `backend/src/modules/auth/auth.service.ts`
**Plik testowy:** `backend/src/modules/auth/auth.service.spec.ts`

Zależności do mockowania: `PrismaService`, `JwtService`, `ConfigService`, `EmailService`

> Hasła hashowane przez `hashPassword`/`comparePassword` z `common/utils/password.util.ts` — mockuj te funkcje.

#### Przypadki testowe

```
REJESTRACJA
  ✓ rejestruje użytkownika z poprawnymi danymi
  ✓ odrzuca zduplikowany email (ConflictException)
  ✓ hashuje hasło przed zapisem (weryfikacja że plain text nie trafia do DB)
  ✓ wysyła email aktywacyjny po rejestracji
  ✓ tworzy token aktywacyjny z datą wygaśnięcia (24h)

LOGIN
  ✓ zwraca access + refresh token + user object przy poprawnych danych
  ✓ rzuca UnauthorizedException dla złego hasła
  ✓ rzuca UnauthorizedException dla nieistniejącego użytkownika
  ✓ rzuca UnauthorizedException dla konta bez hasła (social login only)
  ✓ nie ujawnia czy konto istnieje w komunikacie błędu (ten sam komunikat dla obu)
  ✓ zwraca isActive w obiekcie user (frontend używa do redirect)

ODŚWIEŻANIE TOKENU
  ✓ zwraca nowe access + refresh tokeny przy ważnym userId
  ✓ rzuca UnauthorizedException dla nieistniejącego userId

AKTYWACJA KONTA
  ✓ aktywuje konto z poprawnym tokenem (isActive=true, isEmailVerified=true)
  ✓ czyści token po aktywacji (activationToken=null)
  ✓ rzuca BadRequestException dla wygasłego tokenu
  ✓ rzuca BadRequestException dla nieistniejącego tokenu

PONOWNE WYSŁANIE AKTYWACJI (resendActivation)
  ✓ tworzy nowy token i wysyła email dla nieaktywnego konta
  ✓ zwraca bezpieczny komunikat dla nieistniejącego emaila
  ✓ zwraca informację "konto już aktywne" dla aktywnego konta

RESET HASŁA
  ✓ tworzy token resetowania i wysyła email
  ✓ nie ujawnia czy email istnieje w bazie (bezpieczeństwo)
  ✓ resetuje hasło przy ważnym tokenie
  ✓ rzuca BadRequestException dla wygasłego tokenu resetowania
  ✓ unieważnia token po użyciu (passwordResetToken=null)

SOCIAL LOGIN (validateSocialUser)
  ✓ zwraca tokeny dla istniejącego konta social
  ✓ aktualizuje avatarUrl jeśli się zmienił
  ✓ tworzy nowe konto + social account dla nowego użytkownika
  ✓ linkuje social account do istniejącego konta (ten sam email)
  ✓ nowy użytkownik social jest automatycznie aktywny (isActive=true)
```

---

### CHECKPOINT 1.2 — `EnrollmentService`

**Plik:** `backend/src/modules/enrollment/enrollment.service.ts`
**Plik testowy:** `backend/src/modules/enrollment/enrollment.service.spec.ts`

Zależności do mockowania: `PrismaService`, `ConfigService`, `EmailService`, `PushService`, `PaymentsService`, `SlotService`, `EnrollmentEligibilityService`, `EventRealtimeService`

> **Kluczowe:** Statusy (PENDING/APPROVED/CONFIRMED/WITHDRAWN/REJECTED) są **derywowane** z pól `wantsIn`, `slot`, `slot.confirmed`, `withdrawnBy` przez wewnętrzną funkcję `deriveStatus()`. Testy powinny weryfikować wynik `deriveStatus()`, a nie pole `status`.

#### Przypadki testowe

```
deriveStatus() / withDerivedStatus()
  ✓ wantsIn=true, slot=null → PENDING
  ✓ wantsIn=true, slot.confirmed=false → APPROVED
  ✓ wantsIn=true, slot.confirmed=true → CONFIRMED
  ✓ wantsIn=false, withdrawnBy='USER' → WITHDRAWN
  ✓ wantsIn=false, withdrawnBy='ORGANIZER' → REJECTED

join() — faza PRE_ENROLLMENT
  ✓ tworzy enrollment ze statusem PENDING i waitingReason='PRE_ENROLLMENT'
  ✓ wysyła push + email do organizatora o nowym zgłoszeniu
  ✓ odrzuca jeśli użytkownik już zapisany (BadRequestException)
  ✓ odrzuca jeśli event nie istnieje (NotFoundException)
  ✓ odrzuca jeśli event CANCELLED (BadRequestException)
  ✓ odrzuca jeśli event już się rozpoczął (BadRequestException)
  ✓ odrzuca w fazie LOTTERY_PENDING (BadRequestException)

join() — faza OPEN_ENROLLMENT
  ✓ zaufany użytkownik + wolny slot → APPROVED (slot assigned, confirmed=false jeśli płatny)
  ✓ zaufany użytkownik + wolny slot + darmowy event → APPROVED (slot confirmed=true)
  ✓ nowy użytkownik → PENDING z waitingReason='NEW_USER'
  ✓ zbanowany użytkownik → PENDING z waitingReason='BANNED'
  ✓ brak wolnych slotów → PENDING z waitingReason='NO_SLOTS'
  ✓ brak slotów dla wybranej roli ale inne dostępne → waitingReason='NO_SLOTS_FOR_ROLE' + availableRoles
  ✓ organizator dołącza do własnego eventu → auto-confirmed (slot confirmed=true)
  ✓ poprawna walidacja roleKey względem roleConfig eventu (BadRequestException dla nieznanej roli)

join() — rejoin po wypisaniu
  ✓ użytkownik który się wypisał (wantsIn=false) może ponownie dołączyć
  ✓ rejoin re-checkuje eligibility (ban/new user mogły się zmienić)
  ✓ rejoin w PRE_ENROLLMENT → waitingReason='PRE_ENROLLMENT'
  ✓ organizator rejoin → auto-confirmed z slotem

rejoinById()
  ✓ pozwala na rejoin przez participationId
  ✓ waliduje uprawnienia (assertCanActOnParticipation: owner/host/organizer)
  ✓ blokuje jeśli uczestnik już ma aktywny slot (wantsIn=true + slot)

joinGuest()
  ✓ tworzy nowego guest usera i enrollment
  ✓ organizator pomija limit gości
  ✓ odrzuca gdy użytkownik przekroczył limit gości (MAX_GUESTS_PER_USER)
  ✓ sprawdza ban/new status hosta (nie gościa)
  ✓ zbanowany host → guest ląduje na PENDING z waitingReason='BANNED'
  ✓ nowy host → guest ląduje na PENDING z waitingReason='NEW_USER'
  ✓ OPEN_ENROLLMENT + wolny slot + uprawniony host → slot assigned

updateGuestName()
  ✓ aktualizuje displayName gościa
  ✓ odrzuca jeśli enrollment nie jest gościem (addedByUserId=null)
  ✓ odrzuca jeśli host nie jest właścicielem gościa (ForbiddenException)

assignSlotToParticipant() — organizer manual assign
  ✓ przypisuje slot oczekującemu uczestnikowi
  ✓ czyści waitingReason po przypisaniu
  ✓ auto-trust: oznacza real usera jako zaufanego u organizatora
  ✓ NIE oznacza gościa jako zaufanego (addedByUserId != null)
  ✓ wysyła push + email o przydzieleniu miejsca (tylko w OPEN_ENROLLMENT)
  ✓ odrzuca jeśli nie-organizator (ForbiddenException)
  ✓ odrzuca jeśli uczestnik już ma slot (BadRequestException)
  ✓ odrzuca jeśli uczestnik się wypisał (BadRequestException)
  ✓ odrzuca jeśli brak wolnych slotów (BadRequestException)

confirmSlot()
  ✓ potwierdza slot uczestnika (confirmed=true)
  ✓ odrzuca jeśli brak slotu (BadRequestException)
  ✓ odrzuca jeśli slot już potwierdzony (BadRequestException)
  ✓ odrzuca jeśli uczestnik się wypisał (BadRequestException)
  ✓ waliduje uprawnienia (assertCanActOnParticipation)

releaseSlotFromParticipant() — organizer release
  ✓ ustawia wantsIn=false, withdrawnBy='ORGANIZER' → status REJECTED
  ✓ zwalnia slot w transakcji
  ✓ czyści payment intents
  ✓ wysyła powiadomienie do usuwanego uczestnika
  ✓ powiadamia oczekujących o wolnym miejscu (jeśli slot nie był locked)
  ✓ odrzuca jeśli nie-organizator (ForbiddenException)

deleteParticipation() — organizer delete
  ✓ usuwa enrollment i guest usera z bazy
  ✓ blokuje jeśli enrollment ma historię płatności (BadRequestException)
  ✓ zwalnia slot jeśli istniał
  ✓ czyści payment intents
  ✓ odrzuca jeśli nie-organizator (ForbiddenException)

leave()
  ✓ ustawia wantsIn=false, withdrawnBy='USER' → status WITHDRAWN
  ✓ zwalnia slot w transakcji
  ✓ czyści payment intents
  ✓ powiadamia oczekujących o wolnym miejscu (jeśli slot nie był locked)
  ✓ odrzuca jeśli enrollment nie istnieje (NotFoundException)
  ✓ odrzuca jeśli już wypisany (BadRequestException)
  ✓ waliduje uprawnienia (assertCanActOnParticipation)

changeRole()
  ✓ zmienia rolę uczestnika PENDING → update roleKey, próbuje przydzielić slot
  ✓ zmienia rolę APPROVED/CONFIRMED → zwalnia stary slot, próbuje nowy
  ✓ zmienia rolę WITHDRAWN/REJECTED → traktuje jak rejoin z nową rolą
  ✓ re-checkuje eligibility po zmianie (ban/new)
  ✓ odrzuca jeśli event nie ma ról (BadRequestException)
  ✓ odrzuca nieistniejącą rolę (BadRequestException)

initiateEventPayment()
  ✓ deleguje do PaymentsService.initiatePayment()
  ✓ odrzuca jeśli feature flag enableOnlinePayments=false (ForbiddenException)
  ✓ odrzuca jeśli uczestnik nie ma slotu (BadRequestException)
  ✓ odrzuca jeśli event CANCELLED (BadRequestException)
  ✓ odrzuca jeśli event bezpłatny (BadRequestException)
  ✓ używa addedByUserId jako płatnika dla gości
```

---

### CHECKPOINT 1.3 — `EnrollmentEligibilityService`

**Plik:** `backend/src/modules/enrollment/enrollment-eligibility.service.ts`
**Plik testowy:** `backend/src/modules/enrollment/enrollment-eligibility.service.spec.ts`

Zależności: `PrismaService`

#### Przypadki testowe

```
isBannedByOrganizer()
  ✓ zwraca true jeśli relacja istnieje i isBanned=true
  ✓ zwraca false dla użytkownika bez relacji z organizatorem
  ✓ zwraca false jeśli relacja istnieje ale isBanned=false

isNewUser()
  ✓ zwraca true gdy brak relacji z organizatorem (brak rekordu OrganizerUserRelation)
  ✓ zwraca true gdy relacja istnieje ale isTrusted=false
  ✓ zwraca false gdy relacja istnieje i isTrusted=true

isEligibleForOpenEnrollment()
  ✓ zwraca true — nie zbanowany + zaufany (isTrusted=true)
  ✓ zwraca false — zbanowany
  ✓ zwraca false — nowy użytkownik (nie zaufany)

canAddGuests()
  ✓ zwraca true jeśli użytkownik nie jest nowy (zaufany)
  ✓ zwraca false jeśli użytkownik jest nowy

getGuestCount()
  ✓ zlicza enrollment z addedByUserId i wantsIn=true
  ✓ nie zlicza wypisanych gości (wantsIn=false)
  ✓ zwraca 0 dla użytkownika bez gości
```

---

### CHECKPOINT 1.4 — `EventsService`

**Plik:** `backend/src/modules/events/events.service.ts`
**Plik testowy:** `backend/src/modules/events/events.service.spec.ts`

Zależności do mockowania: `PrismaService`, `EmailService`, `PushService`, `NotificationsService`, `CoverImagesService`, `CitySubscriptionsService`, `SlotService`, `EventRealtimeService`, `EnrollmentEligibilityService`

#### Przypadki testowe

```
create()
  ✓ tworzy event z wszystkimi wymaganymi polami
  ✓ deleguje tworzenie slotów do SlotService.createSlotsForEvent()
  ✓ tworzy sloty per rola jeśli roleConfig podany
  ✓ waliduje roleConfig: suma slotów ról == maxParticipants
  ✓ ustawia lotteryExecutedAt=now jeśli shouldSkipPreEnrollment (event < 48h)
  ✓ ustawia lotteryExecutedAt=null jeśli event dalej niż 48h
  ✓ losuje coverImageId z dyscypliny jeśli nie podano
  ✓ powiadamia subskrybentów miasta o nowym evencie (fire-and-forget)

update()
  ✓ aktualizuje pola przez organizatora
  ✓ odrzuca aktualizację przez nieuprawnionego użytkownika (ForbiddenException)
  ✓ blokuje edycję eventu który się rozpoczął (ONGOING/ENDED)
  ✓ blokuje edycję eventu CANCELLED
  ✓ przelicza sloty przez SlotService przy zmianie maxParticipants
  ✓ reconciluje sloty per rola przy zmianie roleConfig

cancel()
  ✓ zmienia status na CANCELLED w transakcji
  ✓ tworzy vouchery refundów dla uczestników z COMPLETED payments
  ✓ czyści pending payment intents
  ✓ wysyła powiadomienia do uczestników (per-notification error handling)
  ✓ odrzuca jeśli już CANCELLED
  ✓ zwraca statystyki: refundedParticipants, cleanedUpIntents, notifiedParticipants

remove()
  ✓ organizator może usunąć event z 0 uczestnikami
  ✓ odrzuca usunięcie jeśli są uczestnicy (organizator)
  ✓ admin może usunąć każdy event bez ograniczeń

markPaid()
  ✓ tworzy Payment gotówkowy (method='cash') dla uczestnika
  ✓ potwierdza slot po opłaceniu
  ✓ odrzuca jeśli uczestnik nie jest APPROVED/CONFIRMED

cancelPayment()
  ✓ anuluje płatność gotówkową — usuwa Payment, participation wraca do APPROVED
  ✓ anuluje płatność z voucherem — tworzy OrganizerVoucher
  ✓ wysyła powiadomienie jeśli notifyUser=true
  ✓ smart defaults: cash → oba false, non-cash → oba true

findAll()
  ✓ filtruje eventy po mieście (citySlug)
  ✓ filtruje po dyscyplinie
  ✓ sortuje po dacie
  ✓ zwraca eventy w oknie ±7 dni od startsAt
  ✓ zawiera ACTIVE + CANCELLED eventy

findOne()
  ✓ zwraca event z eventTimeStatus i enrollmentPhase
  ✓ zwraca currentUserAccess jeśli JWT present (isParticipant, isOrganizer, participationId)
  ✓ rzuca NotFoundException dla nieistniejącego eventu
```

---

### CHECKPOINT 1.5 — `PaymentsService`

**Plik:** `backend/src/modules/payments/payments.service.ts`
**Plik testowy:** `backend/src/modules/payments/payments.service.spec.ts`

Zależności do mockowania: `PrismaService`, `TpayService`, `VouchersService`, `EventRealtimeService`

#### Przypadki testowe

```
cleanupIntents()
  ✓ usuwa wszystkie PaymentIntent dla participationId
  ✓ przywraca zarezerwowane vouchery (restoreVoucher) dla każdego intentu
  ✓ nie wywołuje restoreVoucher jeśli voucherReserved=0
  ✓ działa poprawnie gdy brak intentów

initiatePayment()
  ✓ tworzy transakcję Tpay i zwraca URL płatności (paymentUrl)
  ✓ reservuje część vouchera (deductVoucher) i pomniejsza kwotę Tpay
  ✓ 100% pokrycie voucherem — tworzy Payment COMPLETED + potwierdza slot + zwraca paidByVoucher=true
  ✓ czyści stare intenty przed utworzeniem nowego (cleanupIntents)
  ✓ tworzy PaymentIntent z poprawnym operatorTxId po odpowiedzi Tpay
  ✓ poprawnie buduje successUrl/errorUrl z frontendBaseUrl + intentId
  ✓ poprawnie ustawia callbackUrl na backendBaseUrl + '/api/payments/tpay-webhook'

handleWebhook()
  ✓ weryfikuje podpis JWS przez TpayService.verifyWebhook()
  ✓ odrzuca nieprawidłowy podpis (BadRequestException)
  ✓ status TRUE — tworzy Payment COMPLETED + potwierdza slot w transakcji
  ✓ status TRUE — invaliduje event realtime ('participants')
  ✓ status FALSE — przywraca saldo vouchera przy niepowodzeniu
  ✓ idempotentność — podwójny webhook (intent już usunięty, Payment istnieje) → noop
  ✓ nieznany transactionId (brak intentu i brak Payment) → noop (no throw)

getPaymentStatus() / getIntentPaymentStatus()
  ✓ zwraca Payment jeśli istnieje
  ✓ zwraca status PENDING jeśli tylko intent istnieje (brak finalizacji)
  ✓ waliduje userId (ForbiddenException jeśli nie właściciel)
  ✓ rzuca NotFoundException dla nieistniejącego id

simulateSuccessfulPayment() (DEV only)
  ✓ tworzy Payment COMPLETED z intent + potwierdza slot
  ✓ idempotentność — zwraca istniejący Payment jeśli już przetworzony
  ✓ rzuca NotFoundException dla nieistniejącego intentId
```

---

### CHECKPOINT 1.6 — `ModerationService`

**Plik:** `backend/src/modules/moderation/moderation.service.ts`
**Plik testowy:** `backend/src/modules/moderation/moderation.service.spec.ts`

#### Przypadki testowe

```
REPRYMENDY
  ✓ tworzy reprymendę z opisem i metadanymi
  ✓ zwraca historię reprymend dla użytkownika
  ✓ odmawia dostępu nieuprawnionemu (nie-organizator)

BAN
  ✓ tworzy ban użytkownika przez organizatora
  ✓ zbanowany nie może dołączyć do eventu organizatora
  ✓ usuwa ban (unban)
  ✓ uniemożliwia zduplikowany ban

ZAUFANIE
  ✓ oznacza użytkownika jako zaufanego
  ✓ usuwa oznaczenie zaufania
  ✓ zaufany omija oczekiwanie jako "nowy użytkownik"
```

---

### CHECKPOINT 1.7 — `ChatService`

**Plik:** `backend/src/modules/chat/chat.service.ts`
**Plik testowy:** `backend/src/modules/chat/chat.service.spec.ts`

Zależności do mockowania: `PrismaService`

#### Przypadki testowe

```
hasEventAccess()
  ✓ organizator zawsze ma dostęp
  ✓ uczestnik z wantsIn=true ma dostęp
  ✓ uczestnik wypisany dobrowolnie (withdrawnBy='USER') ma dostęp (czat nadal widoczny)
  ✓ uczestnik odrzucony przez organizatora (withdrawnBy='ORGANIZER') NIE ma dostępu
  ✓ użytkownik bez enrollment — brak dostępu
  ✓ event nie istnieje — false

CZAT GRUPOWY (getMessages / createMessage)
  ✓ zwraca wiadomości z paginacją (page/limit, reverse chronological → reverse)
  ✓ tworzy wiadomość przez uczestnika z dostępem
  ✓ odmawia dostępu (ForbiddenException) uczestnikowi rejected
  ✓ odmawia dostępu użytkownikowi spoza eventu

createSystemMessage()
  ✓ tworzy wiadomość bez sprawdzania dostępu (bypass dla systemu)

CZAT PRYWATNY (validatePrivateChatAccess)
  ✓ organizator → uczestnik: OK
  ✓ uczestnik → organizator: OK
  ✓ uczestnik → uczestnik: ForbiddenException (tylko org↔participant)
  ✓ self-message (userId === otherUserId): ForbiddenException
  ✓ rejected uczestnik → organizator: ForbiddenException
  ✓ organizator → dowolny uczestnik (niezależnie od statusu): OK

getOrganizerConversations()
  ✓ zwraca listę konwersacji organizatora z lastMessage + messageCount
  ✓ sortuje po lastMessage.createdAt desc
  ✓ odmawia nie-organizatorowi (ForbiddenException)
  ✓ zwraca [] gdy brak konwersacji

getChatMembers()
  ✓ zwraca organizatora + wszystkich uczestników z derywowanym statusem
  ✓ withdrawn uczestnik → isActive=false, inactiveReason set
  ✓ rzuca NotFoundException dla nieistniejącego eventu
```

---

### CHECKPOINT 1.8 — `VouchersService`

**Plik:** `backend/src/modules/vouchers/vouchers.service.ts`
**Plik testowy:** `backend/src/modules/vouchers/vouchers.service.spec.ts`

#### Przypadki testowe

```
SALDO
  ✓ zwraca aktualne saldo voucherów użytkownika
  ✓ saldo = suma wszystkich aktywnych voucherów
  ✓ wygasłe vouchery nie wliczają się do salda

OPERACJE
  ✓ odejmuje kwotę od salda przy płatności
  ✓ odrzuca jeśli saldo niewystarczające
  ✓ przywraca kwotę do salda przy refundzie
  ✓ wystawia nowy voucher (np. przy anulowaniu eventu)

PRECYZJA
  ✓ operacje na Decimal zachowują precyzję (bez błędów zmiennoprzecinkowych)
  ✓ częściowe pokrycie: voucher 30zł dla płatności 50zł → pozostałe 20zł przez Tpay
```

---

### CHECKPOINT 1.9 — `SlotService`

**Plik:** `backend/src/modules/slots/slot.service.ts`
**Plik testowy:** `backend/src/modules/slots/slot.service.spec.ts`

Zależności do mockowania: `PrismaService`, `EventRealtimeService`

> **Kluczowe:** Slot ma pole `locked: boolean` (blokada organizatora) i `confirmed: boolean` (potwierdzenie płatności). To dwa niezależne stany — `locked` blokuje automatyczne przydzielanie, `confirmed` oznacza opłacony.

#### Przypadki testowe

```
createSlotsForEvent()
  ✓ tworzy N slotów bez ról (roleKey=null)
  ✓ tworzy sloty per rola z roleConfig (roleKey ustawiony)
  ✓ poprawna suma slotów = maxParticipants

assignSlot()
  ✓ przypisuje wolny unlocked slot do enrollment (atomowy UPDATE z FOR UPDATE SKIP LOCKED)
  ✓ zwraca null gdy brak wolnych slotów
  ✓ pomija locked sloty (locked=true)
  ✓ z roleKey — przypisuje tylko slot z pasującą rolą
  ✓ bez roleKey — przypisuje dowolny wolny slot

releaseSlot()
  ✓ zwalnia slot (enrollmentId=null, confirmed=false, assignedAt=null)
  ✓ działa w kontekście transakcji (tx parameter)

confirmSlot()
  ✓ ustawia confirmed=true na slocie
  ✓ działa w kontekście transakcji

lockSlot() / unlockSlot()
  ✓ lockSlot() ustawia locked=true
  ✓ lockSlot() rzuca BadRequestException jeśli slot już locked
  ✓ lockSlot() rzuca NotFoundException jeśli slot nie istnieje
  ✓ unlockSlot() ustawia locked=false
  ✓ unlockSlot() rzuca BadRequestException jeśli slot nie jest locked
  ✓ invaliduje event realtime po zmianie

lockSlotByOrganizer() / unlockSlotByOrganizer()
  ✓ weryfikuje że użytkownik jest organizatorem eventu
  ✓ rzuca ForbiddenException jeśli nie-organizator
  ✓ deleguje do lockSlot()/unlockSlot()

assignToLockedSlot()
  ✓ przypisuje enrollment do konkretnego locked slotu
  ✓ rzuca BadRequestException jeśli slot nie jest locked
  ✓ rzuca BadRequestException jeśli slot już zajęty (enrollmentId != null)
  ✓ rzuca NotFoundException jeśli slot nie istnieje

assignParticipantToLockedSlot()
  ✓ weryfikuje organizatora, wantsIn, brak istniejącego slotu
  ✓ confirmed=true jeśli event darmowy, false jeśli płatny
  ✓ czyści waitingReason po przypisaniu
  ✓ rzuca BadRequestException jeśli uczestnik się wypisał
  ✓ rzuca BadRequestException jeśli uczestnik już ma slot

getFreeSlotCount() / getFreeSlotsByRole()
  ✓ zlicza sloty z enrollmentId=null i locked=false
  ✓ per-role counting z roleKey groupBy

addSlots() / removeEmptySlots()
  ✓ dodaje N nowych slotów do eventu
  ✓ usuwa N pustych (niezajętych) slotów
  ✓ nie usuwa zajętych slotów

bulkAssignSlots()
  ✓ przypisuje sloty kolejnym participationIds
  ✓ przerywa gdy brak wolnych slotów
  ✓ zwraca liczbę przypisanych
```

---

### CHECKPOINT 1.10 — `TpayService`

**Plik:** `backend/src/modules/payments/tpay.service.ts`
**Plik testowy:** `backend/src/modules/payments/tpay.service.spec.ts`

Zależności: `HttpService` (lub axios), zmienne środowiskowe

> `verifyWebhookSignature()` jest odpowiedzialna za bezpieczeństwo callbacku płatniczego — fałszywy webhook mógłby potwierdzić nieopłaconą rezerwację.

#### Przypadki testowe

```
WERYFIKACJA PODPISU WEBHOOKA
  ✓ zwraca true dla poprawnego podpisu HMAC
  ✓ zwraca false dla zmodyfikowanego payload
  ✓ zwraca false dla pustego podpisu
  ✓ zwraca false dla podpisu z innym kluczem

TWORZENIE LINKU PŁATNOŚCI
  ✓ wywołuje Tpay API z poprawnymi parametrami (amount, orderId, returnUrl)
  ✓ zwraca URL do płatności
  ✓ rzuca wyjątek przy błędzie API Tpay
  ✓ poprawnie formatuje kwotę (Decimal → string "50.00")

OBSŁUGA ODPOWIEDZI
  ✓ mapuje status "TRUE" na sukces
  ✓ mapuje status "FALSE" na niepowodzenie
  ✓ obsługuje nieznany status (defensywnie)
```

---

### CHECKPOINT 1.11 — `UsersService` (backend)

**Plik:** `backend/src/modules/users/users.service.ts`
**Plik testowy:** `backend/src/modules/users/users.service.spec.ts`

Zależności: `PrismaService`

#### Przypadki testowe

```
PROFIL
  ✓ getProfile() zwraca dane zalogowanego użytkownika
  ✓ rzuca NotFoundException dla nieistniejącego userId
  ✓ nie zwraca pola password w odpowiedzi

AKTUALIZACJA PROFILU
  ✓ updateProfile() zapisuje zmienione pola
  ✓ waliduje długość displayName (min/max)
  ✓ nie pozwala zmienić emaila przez updateProfile (jeśli zablokowane)

ADMIN
  ✓ adminUpdateUser() może zmieniać role i status
  ✓ odmawia dostępu użytkownikowi bez roli ADMIN
```

---

### CHECKPOINT 1.12 — `EnrollmentLotteryCron`

**Plik:** `backend/src/modules/notifications/enrollment-lottery.cron.ts`
**Plik testowy:** `backend/src/modules/notifications/enrollment-lottery.cron.spec.ts`

Zależności do mockowania: `PrismaService`, `PushService`, `EventRealtimeService`

> **Kluczowe:** Cron loterii to jedyny mechanizm przejścia z PRE_ENROLLMENT do OPEN_ENROLLMENT. Losuje sloty wśród uprawnionych (trusted + non-banned) uczestników. Błąd w loterii = krytyczny bug biznesowy.

#### Przypadki testowe

```
handleLottery()
  ✓ znajduje eventy ACTIVE z lotteryExecutedAt=null i startsAt <= threshold 48h
  ✓ pomija eventy z lotteryExecutedAt != null (już przetworzone)
  ✓ pomija eventy z startsAt > threshold (za wcześnie)
  ✓ loguje błąd ale kontynuuje dla kolejnych eventów (izolacja per-event)

executeLotteryForEvent()
  ✓ atomowy lock: ustawia lotteryExecutedAt — drugi call dla tego samego eventu → noop
  ✓ filtruje tylko real userów (addedByUserId=null) — goście nie uczestniczą w loterii
  ✓ filtruje eligible: isTrusted=true AND isBanned!=true
  ✓ shuffluje eligible (random order) przed przydzielaniem slotów
  ✓ przypisuje sloty do shuffled eligible aż do wyczerpania wolnych slotów
  ✓ pomija locked sloty przy przydzielaniu
  ✓ wysyła push 'SLOT_ASSIGNED' do wylosowanych
  ✓ wysyła push 'LOTTERY_NOT_SELECTED' do eligible ale niewylosowanych
  ✓ invaliduje event realtime po zakończeniu loterii
  ✓ 0 pending participations → noop (no error)
  ✓ więcej eligible niż slotów → przypisuje dostępne, reszta 'LOTTERY_NOT_SELECTED'
  ✓ 0 eligible (wszyscy nowi/zbanowani) → noop, brak przypisań

shuffleArray() (pure function)
  ✓ zwraca tablicę tej samej długości
  ✓ zawiera te same elementy
  ✓ nie mutuje oryginału
```

---

## 7. ETAP 1.5 — Backend integration testy (cross-module)

> **Priorytet:** Wysoki. Testuje połączenie modułów, które unit testy testują osobno.
> Wymaga działającej bazy testowej z CHECKPOINT 0.3.

Testy integracyjne w tym projekcie mają sens tam, gdzie logika **obejmuje wiele serwisów w jednej transakcji** — a unit testy z mockami nie wykryją błędów na styku.

### CHECKPOINT 1.5a — Flow: dołączenie → płatność → potwierdzenie

**Plik:** `backend/src/modules/__tests__/enrollment-payment.integration.spec.ts`

```
  ✓ trusted user dołącza (OPEN_ENROLLMENT) → slot assigned (confirmed=false) → initiatePayment → webhook TRUE → slot.confirmed=true
  ✓ trusted user dołącza → initiatePayment → webhook FALSE → voucher restored, slot nadal confirmed=false
  ✓ user dołącza z voucherem pokrywającym 100% → Payment COMPLETED + slot.confirmed=true bez Tpay
  ✓ partial voucher: 30zł voucher na 50zł event → voucher deducted + Tpay za 20zł → webhook TRUE → slot confirmed
  ✓ anulowanie eventu → vouchery wystawione dla uczestników z COMPLETED payments
  ✓ leave() po płatności → slot zwolniony + payment intents cleaned up
```

### CHECKPOINT 1.5b — Flow: enrollment eligibility + moderation w kontekście realnych danych

**Plik:** `backend/src/modules/__tests__/enrollment-moderation.integration.spec.ts`

```
  ✓ banned user → join() tworzy PENDING z waitingReason='BANNED' (nie rzuca wyjątku!)
  ✓ trust przez organizatora → join() przypisuje slot (derywowany status APPROVED)
  ✓ new user → PENDING z waitingReason='NEW_USER' → organizator assignSlot → auto-trust + slot assigned
  ✓ przekroczenie limitu gości → rzuca BadRequestException
  ✓ organizator dołącza do własnego eventu → auto-confirmed (slot.confirmed=true)
```

### CHECKPOINT 1.5c — Flow: loteria PRE_ENROLLMENT → OPEN_ENROLLMENT

**Plik:** `backend/src/modules/__tests__/enrollment-lottery.integration.spec.ts`

```
  ✓ PRE_ENROLLMENT: user join → PENDING (waitingReason='PRE_ENROLLMENT') → cron lottery → slot assigned dla trusted
  ✓ PRE_ENROLLMENT: banned user join → po loterii nadal bez slotu
  ✓ PRE_ENROLLMENT: new (untrusted) user join → po loterii nadal bez slotu
  ✓ po loterii: nowi użytkownicy mogą dołączyć w OPEN_ENROLLMENT z normalną eligibility check
```

### Wzorzec dla integration testów (NestJS)

```typescript
// Wzorzec setupu modułu testowego z realną bazą
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      EnrollmentModule,
      PaymentsModule,
      // nie mockujemy PrismaService — używamy realnej bazy testowej
    ],
  }).compile();

  enrollmentService = module.get(EnrollmentService);
  paymentsService = module.get(PaymentsService);
  prisma = module.get(PrismaService);
});

afterEach(async () => {
  // czyść dane po każdym teście
  await prisma.$transaction([
    prisma.enrollment.deleteMany(),
    prisma.event.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
```

---

## 8. ETAP 2 — Unit testy utylitariów i walidatorów

> **Priorytet:** Wysoki. Deterministyczne, proste do utrzymania.

### CHECKPOINT 2.1 — `enrollment-phase.util.ts` (backend + frontend)

**Pliki:**

- `backend/src/modules/events/enrollment-phase.util.ts`
- `frontend/src/app/shared/utils/enrollment-phase.util.ts`

#### Przypadki testowe

```
getEnrollmentPhase(event, now)
  ✓ null gdy event.status !== 'ACTIVE'
  ✓ null gdy now >= event.startsAt (event się rozpoczął)
  ✓ PRE_ENROLLMENT gdy now < (startsAt - PRE_ENROLLMENT_HOURS) i lotteryExecutedAt=null
  ✓ LOTTERY_PENDING gdy now >= threshold i lotteryExecutedAt=null
  ✓ OPEN_ENROLLMENT gdy lotteryExecutedAt !== null
  ✓ edge case: dokładnie na granicy threshold (48h przed startem)

isPreEnrollment() / isOpenEnrollment() / isLotteryPending()
  ✓ każda zwraca true/false na podstawie getEnrollmentPhase()

getLotteryThreshold(startsAt)
  ✓ zwraca startsAt - PRE_ENROLLMENT_HOURS

shouldSkipPreEnrollment(startsAt, now)
  ✓ true gdy startsAt - PRE_ENROLLMENT_HOURS <= now (event za < 48h)
  ✓ false gdy event dalej niż 48h
  ✓ edge case: dokładnie na progu
```

---

### CHECKPOINT 2.2 — `event-time-status.util.ts` (backend + frontend)

**Pliki:**

- `backend/src/modules/events/event-time-status.util.ts`
- `frontend/src/app/shared/utils/event-time-status.util.ts`

#### Przypadki testowe

```
getEventTimeStatus(event, now)
  ✓ UPCOMING gdy now < startsAt
  ✓ ONGOING gdy startsAt <= now < endsAt
  ✓ ENDED gdy now >= endsAt
  ✓ ENDED gdy event.status === 'CANCELLED' (niezależnie od dat)

isEventJoinable(event, now)
  ✓ true gdy event.status === 'ACTIVE' i now < startsAt
  ✓ false gdy event CANCELLED
  ✓ false gdy event już się rozpoczął (now >= startsAt)
  ✓ false gdy event ACTIVE ale już po startsAt
```

---

### CHECKPOINT 2.3 — `participation-status.util.ts` (frontend)

**Plik:** `frontend/src/app/shared/utils/participation-status.util.ts`

#### Przypadki testowe

```
  ✓ PENDING → oczekuje na zatwierdzenie
  ✓ APPROVED → zatwierdzone, czeka na potwierdzenie płatności
  ✓ CONFIRMED → pełna rejestracja
  ✓ WITHDRAWN → wypisany
  ✓ REJECTED → odrzucony
  ✓ poprawne etykiety i kolory dla każdego statusu
  ✓ logika is*() helpers (isPending, isConfirmed etc.)
```

---

### CHECKPOINT 2.4 — Walidator `IsStrongPassword` (backend)

**Plik:** `backend/src/common/validators/password.validator.ts`

#### Przypadki testowe

```
WALIDACJA HASŁA
  ✓ przyjmuje: "Test123!" (minimum wymagania)
  ✓ odrzuca: "test123!" (brak dużej litery)
  ✓ odrzuca: "TEST123!" (brak małej litery)
  ✓ odrzuca: "TestABC!" (brak cyfry)
  ✓ odrzuca: "Test1234" (brak znaku specjalnego)
  ✓ odrzuca: "Te1!" (za krótkie — < 8 znaków)
  ✓ odrzuca znane hasła z listy (jeśli zaimplementowane)
  ✓ przyjmuje hasła ze spacjami/emoji (jeśli dozwolone)
```

---

### CHECKPOINT 2.5 — Walidacje DTO (backend)

**Pliki:** wszystkie pliki `*.dto.ts` z `class-validator`

#### Podejście

Dla każdego DTO utwórz suite testową używając `class-validator`'s `validate()` bezpośrednio:

```typescript
// przykładowy wzorzec
it('odrzuca event z datą startu w przeszłości', async () => {
  const dto = plainToInstance(CreateEventDto, {
    startDate: new Date('2020-01-01'),
    // ...
  });
  const errors = await validate(dto);
  expect(errors.some((e) => e.property === 'startDate')).toBe(true);
});
```

```
create-event.dto.ts
  ✓ wymagane pole: title
  ✓ wymagane pole: startDate
  ✓ wymagane pole: endDate
  ✓ endDate >= startDate
  ✓ maxParticipants >= 1
  ✓ cost >= 0 (jeśli wymagane)
  ✓ city — poprawna wartość z enuma
  ✓ discipline — poprawna wartość z enuma
  ✓ level — poprawna wartość z enuma

register.dto.ts
  ✓ email — poprawny format
  ✓ password — spełnia IsStrongPassword
  ✓ displayName — min 2 znaki, max 50

join-event.dto.ts
  ✓ roleKey — opcjonalne, string jeśli podane
  ✓ roleKey — odrzuca nieznany klucz (jeśli walidowane)
```

---

### CHECKPOINT 2.6 — Pipy (frontend)

**Pliki:**

- `frontend/src/app/shared/pipes/event-duration.pipe.ts`
- `frontend/src/app/shared/pipes/time-unit.pipe.ts`

#### Przypadki testowe

```
EventDurationPipe
  ✓ "2h 30min" dla 150 minut
  ✓ "1h" dla dokładnie 60 minut
  ✓ "45min" dla 45 minut
  ✓ "1 dzień 2h" dla > 24h (jeśli obsługiwane)
  ✓ obsługa 0 i null

TimeUnitPipe
  ✓ poprawna odmiana "minuta / minuty / minut"
  ✓ poprawna odmiana "godzina / godziny / godzin"
  ✓ poprawna odmiana "dzień / dni"
```

---

### CHECKPOINT 2.7 — `EventValidators` (frontend)

**Pliki:** `frontend/src/app/features/events/validators/event.validators.ts` (lub analogiczna ścieżka)
**Plik testowy:** `event.validators.spec.ts` obok pliku źródłowego

> Walidatory cross-field formularza eventu — testowane tu jednostkowo, bez komponentu.
> Checkpoint 4.2 testuje je pośrednio przez formularz; ten checkpoint zapewnia izolowane pokrycie samej logiki.

#### Przypadki testowe

```typescript
// Wzorzec — walidatory Angular jako czyste funkcje
describe('startDateInFuture', () => {
  it('zwraca null dla daty w przyszłości', () => {
    const control = new FormControl(futureDate);
    expect(EventValidators.startDateInFuture()(control)).toBeNull();
  });

  it('zwraca błąd dla daty w przeszłości', () => {
    const control = new FormControl(pastDate);
    expect(EventValidators.startDateInFuture()(control)).toEqual({
      startDateInPast: true,
    });
  });

  it('zwraca błąd dla dzisiaj (graniczny)', () => { ... });
  it('zwraca null dla kontrolki z wartością null (opcjonalne pole)', () => { ... });
});

describe('endDateAfterStart', () => {
  it('zwraca null gdy endDate > startDate', () => { ... });
  it('zwraca błąd gdy endDate < startDate', () => { ... });
  it('zwraca błąd gdy endDate === startDate', () => { ... });
  it('zwraca null gdy startDate jest null (formularz niepełny)', () => { ... });
});
```

---

## 9. ETAP 3 — Unit testy serwisów (frontend)

> **Priorytet:** Wysoki dla AuthService i EventService, średni dla pozostałych.

### CHECKPOINT 3.1 — `AuthService` (frontend)

**Plik:** `frontend/src/app/core/auth/auth.service.ts`
**Plik testowy:** `frontend/src/app/core/auth/auth.service.spec.ts`

Używa sygnałów Angular i localStorage.

#### Przypadki testowe

```
INICJALIZACJA
  ✓ odczytuje token z localStorage przy starcie
  ✓ currentUser$ jest null gdy brak tokenu
  ✓ dekoduje JWT i ustawia currentUser signal

LOGIN / LOGOUT
  ✓ zapisuje token do localStorage po zalogowaniu
  ✓ ustawia currentUser signal po zalogowaniu
  ✓ czyści token z localStorage po wylogowaniu
  ✓ czyści currentUser signal po wylogowaniu

ODŚWIEŻANIE TOKENU
  ✓ wywołuje /auth/refresh z refresh tokenem
  ✓ aktualizuje access token po sukcesie
  ✓ wylogowuje użytkownika po niepowodzeniu odświeżania

PROFIL
  ✓ propaguje aktualizację profilu przez ProfileBroadcastService
  ✓ synchronizuje stan użytkownika między zakładkami (jeśli obsługiwane)
```

---

### CHECKPOINT 3.2 — `EventService` (frontend)

**Plik:** `frontend/src/app/core/services/event.service.ts`

#### Przypadki testowe

```
  ✓ getEvents() wywołuje GET /events z parametrami filtrowania
  ✓ getEvent(id) wywołuje GET /events/:id
  ✓ createEvent(dto) wywołuje POST /events
  ✓ updateEvent(id, dto) wywołuje PATCH /events/:id
  ✓ cancelEvent(id) wywołuje POST /events/:id/cancel
  ✓ joinEvent(id, dto) wywołuje POST /events/:id/join
  ✓ leaveEvent(id) wywołuje POST /events/:id/leave
  ✓ obsługuje błędy HTTP i mapuje na komunikaty
```

---

### CHECKPOINT 3.3 — Guardy routingu

**Pliki:**

- `frontend/src/app/core/auth/auth.guard.ts` — prosty guard: zalogowany?
- `frontend/src/app/core/guards/verified-user.guard.ts` — combo: zalogowany + aktywny
- `frontend/src/app/core/auth/admin.guard.ts`
- `frontend/src/app/core/guards/organizer.guard.ts`
- `frontend/src/app/core/guards/event-creation.guard.ts`

#### Przypadki testowe

```
authGuard (CanActivateFn)
  ✓ przepuszcza zalogowanego użytkownika
  ✓ przekierowuje na /auth/login dla niezalogowanego (bez returnUrl)

verifiedUserGuard (CanActivateFn)
  ✓ przepuszcza zalogowanego + aktywnego użytkownika
  ✓ przekierowuje na /auth/login z returnUrl dla niezalogowanego
  ✓ nawiguje do /unverified (skipLocationChange) dla nieaktywnego konta

AdminGuard
  ✓ przepuszcza użytkownika z rolą ADMIN
  ✓ przekierowuje na / dla nie-admina

organizerGuard (CanActivateFn)
  ✓ przepuszcza jeśli currentUser.id === event.organizerId
  ✓ nawiguje do /not-found jeśli user nie jest organizatorem
  ✓ nawiguje do /not-found jeśli niezalogowany
  ✓ nawiguje do /not-found przy błędzie HTTP (catchError)

eventCreationGuard (CanActivateFn)
  ✓ przepuszcza gdy environment.enableEventCreation === true
  ✓ przepuszcza override account nawet przy wyłączonym feature flag
  ✓ blokuje i pokazuje snackbar gdy feature flag wyłączony
```

---

### CHECKPOINT 3.4 — `AuthInterceptor`

**Plik:** `frontend/src/app/core/auth/auth.interceptor.ts`

#### Przypadki testowe

```
  ✓ dodaje header Authorization: Bearer <token> do requestów
  ✓ nie dodaje headera dla publicznych endpointów
  ✓ przechwytuje błąd 401 i próbuje odświeżyć token
  ✓ wylogowuje po nieudanym odświeżeniu tokenu
  ✓ kolejkuje requesty podczas odświeżania tokenu
```

---

### CHECKPOINT 3.5 — `ChatService` (frontend)

**Plik:** `frontend/src/app/core/services/chat.service.ts`

> Enrollment nie ma osobnego serwisu frontendowego — metody join/leave/confirm są w `EventService` (CHECKPOINT 3.2).

#### Przypadki testowe

```
ChatService
  ✓ getGroupMessages(eventId, page) wywołuje GET /events/:id/chat/messages
  ✓ sendGroupMessage(eventId, content) wywołuje POST /events/:id/chat/messages
  ✓ getPrivateMessages(eventId, otherUserId, page) wywołuje GET /events/:id/chat/private/:userId
  ✓ sendPrivateMessage(eventId, recipientId, content) wywołuje POST /events/:id/chat/private/:userId
  ✓ getOrganizerConversations(eventId) wywołuje GET /events/:id/chat/conversations
  ✓ getMembers(eventId) wywołuje GET /events/:id/chat/members
  ✓ banUser(eventId, userId) wywołuje POST /events/:id/chat/ban/:userId
  ✓ unbanUser(eventId, userId) wywołuje DELETE /events/:id/chat/ban/:userId
  ✓ obsługuje błąd 403 (brak dostępu do czatu)
```

---

## 10. ETAP 4 — Integracyjne testy komponentów

> **Priorytet:** Średni. Testuj komponenty z realną logiką formularzy i złożonymi interakcjami.

### CHECKPOINT 4.1 — Formularz rejestracji

**Plik:** `frontend/src/app/features/auth/pages/register/register.component.ts`

#### Przypadki testowe

```
WALIDACJA
  ✓ przycisk submit nieaktywny dla pustego formularza
  ✓ błąd email dla niepoprawnego formatu
  ✓ błąd hasła gdy za słabe
  ✓ błąd gdy hasła nie zgadzają się
  ✓ brak błędów dla poprawnych danych

WYSYŁANIE
  ✓ wywołuje AuthService.register() z poprawnymi danymi
  ✓ wyświetla błąd serwera (409 — duplikat email)
  ✓ przekierowuje po sukcesie rejestracji
  ✓ przycisk w stanie ładowania podczas wysyłania
```

---

### CHECKPOINT 4.2 — Formularz tworzenia eventu

**Plik:** `frontend/src/app/features/events/pages/event-form/event-form.component.ts`

Jest to najbardziej złożony formularz w projekcie (~15 pól, walidatory cross-field).

#### Przypadki testowe

```
WALIDATORY NIESTANDARDOWE
  ✓ startDate — odrzuca datę z przeszłości (EventValidators.startDateInFuture)
  ✓ endDate — odrzuca jeśli przed startDate (EventValidators.endDateAfterStart)
  ✓ maxParticipants — minimum 2

TRYBY FORMULARZA
  ✓ CREATE: wszystkie pola puste na start
  ✓ EDIT: formularz wypełniony danymi eventu
  ✓ DUPLICATE: formularz z skopiowanymi danymi, nowe daty wymagane

ROLE W EVENCIE
  ✓ dodanie roli zwiększa liczbę slotów per rola
  ✓ usunięcie roli usuwa konfigurację
  ✓ suma slotów ról = maxParticipants (jeśli wymagane)

WYSYŁANIE
  ✓ wywołuje EventService.createEvent() z poprawnymi danymi
  ✓ wywołuje EventService.updateEvent() w trybie edycji
  ✓ wyświetla błędy walidacji z backendu
```

---

### CHECKPOINT 4.3 — `EnrollmentGridComponent`

**Pliki:**

- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid.component.ts`
- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-section.component.ts`
- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item.component.ts`
- `frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item-empty.component.ts`

#### Przypadki testowe

```
EnrollmentGridComponent
  ✓ renderuje siatkę slotów z poprawną liczbą miejsc
  ✓ grupuje sloty per sekcja (role) jeśli event ma roleConfig
  ✓ renderuje pustą siatkę (brak slotów)

EnrollmentGridItemComponent
  ✓ slot z potwierdzonym uczestnikiem (confirmed=true) — kolor success
  ✓ slot z niepotwierdzonym uczestnikiem (confirmed=false) — kolor warning
  ✓ slot locked (blokada organizatora) — ikona kłódki
  ✓ kliknięcie slotu emituje event (organizator otwiera modal)

EnrollmentGridItemEmptyComponent
  ✓ wolny slot — przerywana ramka
  ✓ locked pusty slot — ikona kłódki + brak interakcji
```

---

### CHECKPOINT 4.4 — Login flow (komponent + service)

**Plik:** `frontend/src/app/shared/auth/ui/login-form/login-form.component.ts`

#### Przypadki testowe

```
  ✓ puste pola blokują submit
  ✓ niepoprawny format email pokazuje błąd
  ✓ poprawne dane wywołują AuthService.login()
  ✓ błąd 401 wyświetla komunikat "Nieprawidłowe dane"
  ✓ spinner podczas ładowania
  ✓ przekierowanie po zalogowaniu (z returnUrl jeśli istnieje)
```

---

### CHECKPOINT 4.5 — Strona szczegółów eventu (logika)

**Plik:** `frontend/src/app/features/event/pages/event-detail/event-detail.component.ts`

> Komponent oparty o sygnaly Angular (`computed`, `effect`). Testuj computed signals z mockowanym inputem `event`.

#### Przypadki testowe

```
Computed signals
  ✓ canJoin() = true gdy isEventJoinable + nie jest uczestnikiem
  ✓ canJoin() = false gdy event CANCELLED
  ✓ canJoin() = false gdy event już się rozpoczął
  ✓ canJoin() = false gdy użytkownik już jest uczestnikiem
  ✓ eventTimeStatus = UPCOMING/ONGOING/ENDED poprawnie derywowany
  ✓ lifecycleBannerVariant poprawny dla każdego stanu (ended/ongoing/cancelled/null)
  ✓ groupChatOpen() = false dla zakończonych/odwołanych eventów

UI logic
  ✓ wyświetla przycisk "Dołącz" gdy canJoin()=true
  ✓ ukrywa przycisk "Dołącz" gdy canJoin()=false
  ✓ wyświetla enrollment status banner dla uczestnika
  ✓ wyświetla lifecycle banner dla zakończonych/odwołanych
  ✓ overlay organizatora dostępny tylko dla event.currentUserAccess.isOrganizer
```

---

## 11. ETAP 5 — E2E — krytyczne flow użytkownika

> **Priorytet:** Najniższy w implementacji, ale najwyższy w wartości biznesowej.
> Uruchamiaj na staging/środowisku testowym.

### Konfiguracja środowiska E2E

Przed wdrożeniem e2e konieczne jest (pełny setup opisany w CHECKPOINT 0.3 i 0.4):

- [ ] Dedykowana baza danych testowa z seed danymi
- [ ] Zmienne środowiskowe dla Playwright (BASE_URL, TEST_USER, etc.)
- [ ] Mockowanie zewnętrznych serwisów (Tpay — użyj sandboxu lub stub)
- [ ] Reset stanu bazy po każdym teście (lub fixtures)
- [ ] Konfiguracja `playwright.config.ts` z `baseURL` i `storageState`

### Wzorzec Page Objects (obowiązkowy dla e2e)

Bez Page Objects testy e2e stają się nieczytelne i kruche — każda zmiana selektora wymaga edycji wszystkich testów.

```typescript
// frontend-e2e/src/pages/event-detail.page.ts
export class EventDetailPage {
  constructor(private page: Page) {}

  async goto(citySlug: string, eventId: string) {
    await this.page.goto(`/w/${citySlug}/${eventId}`);
  }

  get joinButton() {
    return this.page.getByTestId('join-event-btn');
  }

  get enrollmentStatus() {
    return this.page.getByTestId('enrollment-status');
  }

  async joinEvent() {
    await this.joinButton.click();
    await this.page.getByTestId('confirm-join-btn').click();
  }
}

// Użycie w teście:
const eventPage = new EventDetailPage(page);
await eventPage.goto('zielona-gora', '123');
await eventPage.joinEvent();
await expect(eventPage.enrollmentStatus).toContainText('Oczekuje');
```

Twórz Page Object dla każdej strony z testami e2e. Przechowuj je w `frontend-e2e/src/pages/`.

### `data-testid` — konwencja

Dodawaj atrybuty `data-testid` do elementów interaktywnych używanych w testach e2e:

```html
<!-- preferuj data-testid zamiast CSS klas lub tekstu -->
<button data-testid="join-event-btn">Dołącz</button>
<span data-testid="enrollment-status">{{ statusLabel }}</span>
```

Atrybuty `data-testid` nie wpływają na wygląd i są stabilniejsze niż selektory CSS.

---

### CHECKPOINT 5.1 — Rejestracja i logowanie `@smoke`

**Plik:** `frontend-e2e/src/auth.spec.ts`

```
REJESTRACJA
  ✓ wypełnia formularz rejestracji → submit → strona potwierdzenia
  ✓ email z linkiem aktywacyjnym (weryfikacja przez API lub symulowany link)
  ✓ kliknięcie linku → konto aktywowane
  ✓ logowanie po aktywacji → dashboard

LOGOWANIE / WYLOGOWANIE
  ✓ logowanie z poprawnymi danymi → dashboard
  ✓ logowanie z błędnym hasłem → komunikat błędu
  ✓ wylogowanie → przekierowanie na stronę główną
  ✓ próba dostępu do chronionej strony → redirect na login
```

---

### CHECKPOINT 5.2 — Przeglądanie eventów i dołączanie `@smoke`

**Plik:** `frontend-e2e/src/enrollment.spec.ts`

```
PRZEGLĄDANIE
  ✓ lista eventów wyświetla się na /w/:citySlug
  ✓ zmiana miasta zmienia URL i listę eventów
  ✓ kliknięcie eventu → strona szczegółów /w/:citySlug/:id

DOŁĄCZANIE (OPEN_ENROLLMENT, bezpłatny event)
  ✓ zalogowany użytkownik widzi przycisk "Dołącz"
  ✓ kliknięcie → overlay potwierdzenia → dołączenie
  ✓ status zmienia się na PENDING (nowy user) lub APPROVED (trusted)
  ✓ przycisk "Dołącz" zastąpiony enrollment status bannerem

WYPISANIE
  ✓ uczestnik może się wypisać
  ✓ status zmienia się na WITHDRAWN
  ✓ przycisk "Dołącz" ponownie dostępny (rejoin)
```

---

### CHECKPOINT 5.3 — Zarządzanie eventem przez organizatora

**Plik:** `frontend-e2e/src/organizer.spec.ts`

```
TWORZENIE EVENTU
  ✓ organizator tworzy event przez formularz /o/w/new
  ✓ event pojawia się na liście /w/:citySlug
  ✓ event dostępny pod /w/:citySlug/:id

ZARZĄDZANIE UCZESTNIKAMI (/o/w/:id/manage)
  ✓ organizer widzi siatkę slotów z uczestnikami
  ✓ kliknięcie slotu → modal z opcjami (assign/release/trust)
  ✓ może przypisać slot oczekującemu uczestnikowi
  ✓ może zwolnić slot (usunąć uczestnika)
  ✓ może zbanować/zaufać uczestnikowi
```

---

### CHECKPOINT 5.4 — Płatność (happy path) `@smoke`

**Plik:** `frontend-e2e/src/payment.spec.ts`

> Wymaga Tpay sandbox lub stubu HTTP.

```
  ✓ dołączenie do płatnego eventu → redirect do Tpay
  ✓ powrót z Tpay (sukces) → status CONFIRMED
  ✓ dołączenie z voucherem (pełne pokrycie) → auto-potwierdzone
  ✓ wyświetlenie płatności w historii
```

---

### CHECKPOINT 5.5 — Chat

**Plik:** `frontend-e2e/src/chat.spec.ts`

```
  ✓ uczestnik z slotem widzi czat grupowy eventu (/w/:citySlug/:id/chat)
  ✓ może wysłać wiadomość
  ✓ wiadomość pojawia się w liście wiadomości
  ✓ organizator widzi konwersacje prywatne (/o/w/:id/conversations)
  ✓ rejected uczestnik nie ma dostępu do czatu grupowego
  ✓ czat niedostępny dla zakończonych/odwołanych eventów
```

---

## 12. Proponowana struktura plików testowych

```
backend/src/modules/
├── __tests__/                            ← integration testy cross-module
│   ├── enrollment-payment.integration.spec.ts  ← CHECKPOINT 1.5a
│   ├── enrollment-moderation.integration.spec.ts ← CHECKPOINT 1.5b
│   └── enrollment-lottery.integration.spec.ts  ← CHECKPOINT 1.5c
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts              ← CHECKPOINT 1.1
│   └── validators/
│       └── password.validator.spec.ts    ← CHECKPOINT 2.4
├── events/
│   ├── events.service.ts
│   ├── events.service.spec.ts            ← CHECKPOINT 1.4
│   ├── event-time-status.util.ts
│   ├── event-time-status.util.spec.ts    ← CHECKPOINT 2.2
│   ├── enrollment-phase.util.ts
│   └── enrollment-phase.util.spec.ts     ← CHECKPOINT 2.1
├── enrollment/
│   ├── enrollment.service.ts
│   ├── enrollment.service.spec.ts        ← CHECKPOINT 1.2
│   ├── enrollment-eligibility.service.ts
│   └── enrollment-eligibility.service.spec.ts ← CHECKPOINT 1.3
├── payments/
│   ├── payments.service.ts
│   ├── payments.service.spec.ts          ← CHECKPOINT 1.5
│   ├── tpay.service.ts
│   └── tpay.service.spec.ts             ← CHECKPOINT 1.10
├── slots/
│   ├── slot.service.ts
│   └── slot.service.spec.ts             ← CHECKPOINT 1.9
├── chat/
│   ├── chat.service.ts
│   └── chat.service.spec.ts              ← CHECKPOINT 1.7
├── moderation/
│   ├── moderation.service.ts
│   └── moderation.service.spec.ts        ← CHECKPOINT 1.6
├── notifications/
│   ├── enrollment-lottery.cron.ts
│   └── enrollment-lottery.cron.spec.ts  ← CHECKPOINT 1.12
├── users/
│   ├── users.service.ts
│   └── users.service.spec.ts            ← CHECKPOINT 1.11
└── vouchers/
    ├── vouchers.service.ts
    └── vouchers.service.spec.ts          ← CHECKPOINT 1.8

frontend/src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts          ← CHECKPOINT 3.1
│   │   ├── auth.guard.spec.ts            ← CHECKPOINT 3.3
│   │   └── auth.interceptor.spec.ts      ← CHECKPOINT 3.4
│   ├── guards/
│   │   ├── verified-user.guard.spec.ts   ← CHECKPOINT 3.3
│   │   ├── organizer.guard.spec.ts       ← CHECKPOINT 3.3
│   │   └── event-creation.guard.spec.ts  ← CHECKPOINT 3.3
│   └── services/
│       ├── event.service.spec.ts         ← CHECKPOINT 3.2
│       └── chat.service.spec.ts          ← CHECKPOINT 3.5
├── shared/
│   ├── utils/
│   │   ├── enrollment-phase.util.spec.ts ← CHECKPOINT 2.1
│   │   ├── event-time-status.util.spec.ts ← CHECKPOINT 2.2
│   │   └── participation-status.util.spec.ts ← CHECKPOINT 2.3
│   ├── pipes/
│   │   ├── event-duration.pipe.spec.ts   ← CHECKPOINT 2.6
│   │   └── time-unit.pipe.spec.ts        ← CHECKPOINT 2.6
│   └── enrollment/ui/
│       └── enrollment-grid.component.spec.ts ← CHECKPOINT 4.3
└── features/
    ├── auth/pages/
    │   └── register/register.component.spec.ts ← CHECKPOINT 4.1
    ├── events/pages/
    │   ├── event-form/event-form.component.spec.ts ← CHECKPOINT 4.2
    │   └── event-form/validators/event.validators.spec.ts ← CHECKPOINT 2.7
    ├── event/pages/
    │   └── event-detail/event-detail.component.spec.ts ← CHECKPOINT 4.5
    └── shared/auth/ui/login-form/
        └── login-form.component.spec.ts  ← CHECKPOINT 4.4

frontend-e2e/src/
├── pages/                                ← Page Objects (wzorzec POM)
│   ├── event-detail.page.ts
│   ├── event-form.page.ts
│   ├── login.page.ts
│   └── enrollment.page.ts
├── auth.setup.ts                         ← Playwright auth setup (CHECKPOINT 0.4)
├── auth.spec.ts                          ← CHECKPOINT 5.1
├── enrollment.spec.ts                    ← CHECKPOINT 5.2
├── organizer.spec.ts                     ← CHECKPOINT 5.3
├── payment.spec.ts                       ← CHECKPOINT 5.4
└── chat.spec.ts                          ← CHECKPOINT 5.5
```

---

## 13. Pułapki i zasady techniczne

### Czas i strefy czasowe

- Projekt używa **Luxon** do obsługi dat zarówno po stronie backend jak i frontend (shared `@zgadajsie/shared` → `libs/src/lib/utils/luxon.utils.ts`)
- DB/API zawsze UTC (Prisma `DateTime` → ISO 8601) — konwersja do `Europe/Warsaw` tylko w UI i emailach
- Zawsze mockuj `Date.now()` lub przekazuj `now` jako parametr do utylitariuszy (np. `getEnrollmentPhase(event, now)`)
- Testuj logikę fazową na granicy (boundary dates) — off-by-one errors tutaj najczęstsze
- Pamiętaj o UTC vs. czas lokalny w asercjach — `new Date()` dozwolone tylko do porównań UTC

### Decimal i pieniądze

- Prisma używa `Decimal` (nie `number`) dla pól monetarnych
- Nie porównuj `Decimal` przez `===` — użyj `.equals()` lub `toNumber()`
- Testuj przypadki graniczne: 0.01 zł, wartości z długim ułamkiem

### Sygnały Angular

```typescript
// poprawne testowanie sygnałów
const value = TestBed.runInInjectionContext(() => service.someSignal());
expect(value).toBe(expectedValue);

// albo przez ComponentFixture:
fixture.detectChanges();
expect(component.someSignal()).toBe(expectedValue);
```

### Mockowanie Prisma (backend)

```typescript
// Wzorzec z @golevelup/ts-jest
import { createMock } from '@golevelup/ts-jest';
import { PrismaService } from '../../prisma/prisma.service';

const prisma = createMock<PrismaService>();
// lub ręcznie:
const prisma = {
  enrollment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(prisma)),
} as unknown as PrismaService;
```

### Izolacja testów

- Każdy `describe` powinien mieć `beforeEach(() => jest.clearAllMocks())`
- Nie dziel stanu między `it()` — tylko przez `beforeEach`
- Dla E2E: używaj Playwright fixtures do seedowania i czyszczenia danych

### Zewnętrzne integracje (co mockować)

| Serwis         | Jak mockować                                    |
| -------------- | ----------------------------------------------- |
| Tpay           | `jest.mock()` na TpayService lub HTTP stub      |
| Email (Resend) | `jest.mock()` na EmailService                   |
| S3/R2          | `jest.mock()` na StorageService                 |
| Google OAuth   | Playwright `route()` do przechwycenia callbacku |
| WebSocket      | `jest.mock()` na RealtimeService                |

---

## 14. Metryki sukcesu

### Po wdrożeniu Etapu 1 (serwisy backend)

- [ ] Pokrycie linii: > 70% dla modułów: `auth`, `enrollment`, `events`, `payments`
- [ ] Testy przechodzą w < 30s
- [ ] CI blokuje PR jeśli testy nie przechodzą

### Po wdrożeniu Etapu 2 (utylitariusze)

- [ ] Pokrycie linii: > 90% dla wszystkich plików `*.util.ts` i `*.validator.ts`
- [ ] Wszystkie edge case dat i walut pokryte

### Po wdrożeniu Etapu 3-4 (frontend)

- [ ] Pokrycie linii: > 60% dla `core/auth/`, `core/services/`
- [ ] Formularze: testy walidacji dla wszystkich custom validators
- [ ] Żaden komponent nie importuje HttpClient bezpośrednio (mockowanie przez testing module)

### Po wdrożeniu Etapu 5 (E2E)

- [ ] 5 smoke testów (`@smoke`) działa na staging w < 5 minut
- [ ] Smoke testy uruchamiane automatycznie przy każdym deployu
- [ ] Brak fałszywych alarmów (flaky tests < 2%)

---

## Kolejność wdrożenia — podsumowanie

```
Dzień 1:     ETAP 0 (setup — raz, blokujące)
  0.1 (zależności backend) → 0.2 (Angular TestBed) → 0.3 (baza testowa) → 0.4 (Playwright auth)

Tydzień 1-2: ETAP 1 (unit serwisy backend — najwyższy ROI)
  1.3 (Eligibility) → 1.2 (Enrollment) → 1.9 (SlotService) → 1.12 (LotteryCron)
  → 1.1 (Auth) → 1.10 (TpayService) → 1.5 (Payments)
  → 1.4 (Events) → 1.8 (Vouchers) → 1.6 (Moderation) → 1.7 (Chat) → 1.11 (Users)

Tydzień 2-3: ETAP 1.5 (integration testy backend)
  1.5a (enrollment → payment flow) → 1.5b (eligibility + moderation) → 1.5c (lottery)

Tydzień 3:   ETAP 2 (utylitariusze i walidatory — szybkie, deterministyczne)
  2.1 + 2.2 (fazy i status) → 2.7 (EventValidators) → 2.4 (IsStrongPassword) → 2.5 (DTO) → 2.3 + 2.6

Tydzień 4:   ETAP 3 (serwisy frontend)
  3.1 (AuthService) → 3.3 (Guards: auth/verified/organizer/eventCreation/admin)
  → 3.4 (Interceptor) → 3.2 (EventService) → 3.5 (ChatService)

Tydzień 5-6: ETAP 4 (komponenty z logiką)
  4.1 (Register) → 4.4 (Login) → 4.2 (EventForm) → 4.5 (EventDetail) → 4.3 (EnrollmentGrid)

Tydzień 7-8: ETAP 5 (E2E — po stabilizacji reszty)
  5.1 @smoke (auth) → 5.2 @smoke (enrollment) → 5.4 @smoke (payment) → 5.3 → 5.5
```
