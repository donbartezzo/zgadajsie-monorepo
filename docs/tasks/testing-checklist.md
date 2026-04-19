# Checklista wdrożenia testów — ZgadajSie.pl

> Plik do śledzenia postępu wdrożenia według `docs/tasks/testing-strategy.md`.
> Aktualizuj po każdym ukończonym checkpoincie.
>
> **Ostatnia aktualizacja:** 2026-04-18 (sesja 6 — brakujące testy: lotteryExecutedAt, CANCELLED update, reconcileSlots, cancel stats/intents/notifications, cancelPayment smart defaults, findAll status filter, getMessages, getChatMembers, getOrganizerConversations, createPrivateMessage participant→org, NO_SLOTS_FOR_ROLE, unknown roleKey, assignSlot push, releaseSlot REMOVED, partial voucher, unknown webhook tx)

---

## LEGENDA

- `[ ]` — do zrobienia
- `[x]` — ukończone
- `[~]` — częściowo (uwaga w komentarzu)
- `[!]` — zablokowane / wymaga decyzji

---

## ETAP 0 — Setup środowiska testowego

| Checkpoint  | Opis                                                       | Status | Uwagi                                                                          |
| ----------- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| **0.1**     | Zainstalować `@golevelup/ts-jest`                          | `[x]`  | Zainstalowano pnpm add -D                                                      |
| **0.2**     | Sprawdzić Angular TestBed / test-setup.ts dla zone.js      | `[x]`  | Używa `setupZoneTestEnv` z jest-preset-angular — poprawne                      |
| **0.3**     | Stworzyć `docker-compose.test.yml` + `backend/.env.test`   | `[x]`  | Osobna baza na porcie 5434                                                     |
| **0.4**     | Playwright: skonfigurować `storageState` + `auth.setup.ts` | `[x]`  | playwright.config.ts zaktualizowany, auth.setup.ts stworzony                   |
| **scripts** | Dodać komendy testowe do `package.json`                    | `[x]`  | `test:unit`, `test:integration`, `test:e2e`, `test:e2e:smoke`, `test:coverage` |

---

## ETAP 1 — Unit testy serwisów (backend)

| Checkpoint | Serwis                         | Plik spec                                           | Status | Uwagi                                                                                                                                                        |
| ---------- | ------------------------------ | --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.1**    | `AuthService`                  | `auth/auth.service.spec.ts`                         | `[x]`  | 28 testów ✓                                                                                                                                                  |
| **1.2**    | `EnrollmentService`            | `enrollment/enrollment.service.spec.ts`             | `[x]`  | 72 testów ✓ (+ NO_SLOTS_FOR_ROLE, unknown roleKey, assignSlot push, releaseSlot REMOVED)                                                                     |
| **1.3**    | `EnrollmentEligibilityService` | `enrollment/enrollment-eligibility.service.spec.ts` | `[x]`  | 13 testów ✓                                                                                                                                                  |
| **1.4**    | `EventsService`                | `events/events.service.spec.ts`                     | `[x]`  | 43 testów ✓ (+ lotteryExecutedAt, CANCELLED update, reconcileSlots, cancel stats/intents/notifications, cancelPayment smart defaults, findAll status filter) |
| **1.5**    | `PaymentsService`              | `payments/payments.service.spec.ts`                 | `[x]`  | 27 testów ✓ (+ partial voucher deduct, unknown webhook tx noop)                                                                                              |
| **1.6**    | `ModerationService`            | `moderation/moderation.service.spec.ts`             | `[x]`  | 9 testów ✓                                                                                                                                                   |
| **1.7**    | `ChatService`                  | `chat/chat.service.spec.ts`                         | `[x]`  | 21 testów ✓ (+ getMessages, participant→org, getOrganizerConversations, getChatMembers)                                                                      |
| **1.8**    | `VouchersService`              | `vouchers/vouchers.service.spec.ts`                 | `[x]`  | 9 testów ✓                                                                                                                                                   |
| **1.9**    | `SlotService`                  | `slots/slot.service.spec.ts`                        | `[x]`  | 31 testów ✓                                                                                                                                                  |
| **1.10**   | `TpayService`                  | `payments/tpay.service.spec.ts`                     | `[x]`  | 11 testów ✓                                                                                                                                                  |
| **1.11**   | `UsersService`                 | `users/users.service.spec.ts`                       | `[x]`  | 7 testów ✓                                                                                                                                                   |
| **1.12**   | `EnrollmentLotteryCron`        | `notifications/enrollment-lottery.cron.spec.ts`     | `[x]`  | 11 testów ✓                                                                                                                                                  |

---

## ETAP 1.5 — Backend integration testy

> Wymaga działającej bazy testowej z CHECKPOINT 0.3

| Checkpoint | Plik                                                  | Status | Uwagi                            |
| ---------- | ----------------------------------------------------- | ------ | -------------------------------- |
| **1.5a**   | `__tests__/enrollment-payment.integration.spec.ts`    | `[x]`  | 3 testy ✓ join+BANNED+rejoin     |
| **1.5b**   | `__tests__/enrollment-moderation.integration.spec.ts` | `[x]`  | 7 testów ✓ ban/trust+eligibility |
| **1.5c**   | `__tests__/enrollment-lottery.integration.spec.ts`    | `[x]`  | 4 testy ✓ PRE_ENROLLMENT→OPEN    |

---

## ETAP 2 — Unit testy utylitariuszy i walidatorów

| Checkpoint | Plik                                                           | Status | Uwagi                                                                                           |
| ---------- | -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| **2.1 BE** | `events/enrollment-phase.util.spec.ts`                         | `[x]`  | 13 testów ✓                                                                                     |
| **2.1 FE** | `shared/utils/enrollment-phase.util.spec.ts`                   | `[x]`  | 7 testów ✓                                                                                      |
| **2.2 BE** | `events/event-time-status.util.spec.ts`                        | `[x]`  | 8 testów ✓                                                                                      |
| **2.2 FE** | `shared/utils/event-time-status.util.spec.ts`                  | `[x]`  | 8 testów ✓                                                                                      |
| **2.3**    | `shared/utils/participation-status.util.spec.ts`               | `[x]`  | 14 testów ✓                                                                                     |
| **2.4**    | `common/validators/password.validator.spec.ts`                 | `[x]`  | 7 testów ✓                                                                                      |
| **2.5**    | DTO validation specs                                           | `[x]`  | `create-event.dto` (10 testów), `register.dto` (7), `join-event.dto` (6) ✓                      |
| **2.6**    | `pipes/event-duration.pipe.spec.ts` + `time-unit.pipe.spec.ts` | `[x]`  | 2+5 testów ✓                                                                                    |
| **2.7**    | `events/validators/event.validators.spec.ts`                   | `[x]`  | 8 testów ✓ — wyodrębniono `EventValidators` do `features/events/validators/event.validators.ts` |

---

## ETAP 3 — Unit testy serwisów (frontend)

| Checkpoint | Plik                                           | Status | Uwagi                                                                                                   |
| ---------- | ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| **3.1**    | `core/auth/auth.service.spec.ts`               | `[x]`  | 16 testów ✓                                                                                             |
| **3.2**    | `core/services/event.service.spec.ts`          | `[x]`  | 8 testów ✓                                                                                              |
| **3.3**    | `core/auth/auth.guard.spec.ts` + 4 inne guardy | `[x]`  | 11 testów (authGuard, adminGuard, activeGuard, verifiedUserGuard, organizerGuard, eventCreationGuard) ✓ |
| **3.4**    | `core/auth/auth.interceptor.spec.ts`           | `[x]`  | 5 testów ✓                                                                                              |
| **3.5**    | `core/services/chat.service.spec.ts`           | `[x]`  | 7 testów HTTP ✓                                                                                         |

---

## ETAP 4 — Integracyjne testy komponentów

| Checkpoint | Komponent                                                 | Status | Uwagi                                                                                                                        |
| ---------- | --------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **4.1**    | `auth/pages/register/register.component.spec.ts`          | `[x]`  | 6 testów ✓                                                                                                                   |
| **4.2**    | `events/pages/event-form/event-form.component.spec.ts`    | `[x]`  | 12 testów ✓ overrideTemplate                                                                                                 |
| **4.3**    | `enrollment/ui/enrollment-grid/*.component.spec.ts`       | `[x]`  | 53 testy ✓ (15+20+6+12)                                                                                                      |
| **4.4**    | `shared/auth/ui/login-form/login-form.component.spec.ts`  | `[x]`  | 8 testów ✓                                                                                                                   |
| **4.5**    | `event/pages/event-detail/event-detail.component.spec.ts` | `[x]`  | 17 testów ✓ (rulesList, isPreEnrollment, cancelEvent, confirmAnnouncement, confirmAll, openChat, onAuthSuccess, ngOnDestroy) |

---

## ETAP 5 — E2E testy Playwright

> Wymaga staging/środowiska testowego, Tpay sandbox, seed danych

| Checkpoint | Plik                                  | Tag      | Status | Uwagi                                                |
| ---------- | ------------------------------------- | -------- | ------ | ---------------------------------------------------- |
| **5.1**    | `frontend-e2e/src/auth.spec.ts`       | `@smoke` | `[x]`  | 6 scenariuszy, wymaga działającego env               |
| **5.2**    | `frontend-e2e/src/enrollment.spec.ts` | `@smoke` | `[x]`  | 4 scenariusze, wymaga seed danych                    |
| **5.3**    | `frontend-e2e/src/organizer.spec.ts`  | —        | `[x]`  | 4 scenariusze, wymaga TEST_ORGANIZER_EVENT_ID        |
| **5.4**    | `frontend-e2e/src/payment.spec.ts`    | `@smoke` | `[x]`  | 3 scenariusze, wymaga Tpay sandbox                   |
| **5.5**    | `frontend-e2e/src/chat.spec.ts`       | —        | `[x]`  | 3 scenariusze, wymaga TEST_CHAT_EVENT_ID             |
| **POM**    | `frontend-e2e/src/pages/*.ts`         | —        | `[x]`  | LoginPage, RegisterPage, EventsPage, EventDetailPage |
| **setup**  | `frontend-e2e/src/auth.setup.ts`      | —        | `[x]`  | Stworzono plik setupu auth                           |

---

## Infrastruktura i konfiguracja

| Element                                    | Status | Uwagi                                                                                                              |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `@golevelup/ts-jest` zainstalowany         | `[x]`  |                                                                                                                    |
| `backend/.env.test` stworzony              | `[x]`  | `DATABASE_URL` dla bazy testowej                                                                                   |
| `docker-compose.test.yml` stworzony        | `[x]`  | postgres:16 na porcie 5434                                                                                         |
| Playwright `storageState` skonfigurowany   | `[x]`  | projekty: setup / authenticated / unauthenticated                                                                  |
| `playwright/.auth/` dodany do `.gitignore` | `[x]`  |                                                                                                                    |
| Skrypty testowe w `package.json`           | `[x]`  | `test:unit`, `test:integration`, `test:e2e:smoke`                                                                  |
| `data-testid` na elementach interaktywnych | `[x]`  | `[attr.data-testid]="bar.id + '-button'"` w `EventInlineNotificationBarsComponent` → `data-testid="join-button"` ✓ |

---

## Metryki docelowe

| Metryka                                             | Target  | Aktualny stan                             |
| --------------------------------------------------- | ------- | ----------------------------------------- |
| Pokrycie `auth`, `enrollment`, `events`, `payments` | > 70%   | backend: 340 testów ✓ + 14 integracyjnych |
| Pokrycie `*.util.ts`, `*.validator.ts`              | > 90%   | 13+8+8+14+7+7+6 testów ✓                  |
| Pokrycie `core/auth/`, `core/services/`             | > 60%   | frontend: ~183 testy ✓                    |
| Smoke e2e czas                                      | < 5 min | pliki gotowe, wymaga działającego env     |
| Unit tests czas backend                             | < 30 s  | ~14 s ✓                                   |
| Unit tests czas frontend                            | < 30 s  | ~6 s ✓                                    |

---

## Kolejność wdrożenia (z docs/tasks/testing-strategy.md)

```
ETAP 0 (setup) → ETAP 1 w kolejności:
  1.3 (Eligibility) → 1.2 (Enrollment) → 1.9 (Slot) → 1.12 (Lottery)
  → 1.1 (Auth) → 1.10 (Tpay) → 1.5 (Payments)
  → 1.4 (Events) → 1.8 (Vouchers) → 1.6 (Moderation) → 1.7 (Chat) → 1.11 (Users)
→ ETAP 1.5 → ETAP 2 → ETAP 3 → ETAP 4 → ETAP 5
```
