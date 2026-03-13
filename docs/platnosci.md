# Moduł płatności — Tpay

## Architektura

Płatności realizowane są w modelu **Single Merchant** przez bramkę Tpay (Open API v1).
Aplikacja obsługuje dwa scenariusze opłacenia uczestnictwa w wydarzeniu:

1. **Pełna płatność voucherem** — jeśli saldo voucherów u danego organizatora pokrywa całość kosztu, `Payment` tworzony jest natychmiast ze statusem `COMPLETED`, bez kontaktu z Tpay.
2. **Płatność przez Tpay** (opcjonalnie z częściowym voucherem) — tworzony jest tymczasowy `PaymentIntent`, użytkownik przekierowywany jest na stronę płatności Tpay, a finalizacja następuje asynchronicznie przez webhook.

## Flow płatności (Tpay)

```
┌─────────┐     POST /participation/:eventId/join      ┌──────────┐
│ Frontend │ ──────────────────────────────────────────▶ │ Backend  │
│          │ ◀──── { paymentUrl: "https://tpay.com/…" } │          │
└────┬─────┘                                            └────┬─────┘
     │                                                       │
     │ window.location.href = paymentUrl                     │ 1. Tworzy PaymentIntent
     ▼                                                       │ 2. Rezerwuje voucher (jeśli >0)
┌──────────┐                                                 │ 3. Wywołuje Tpay API /transactions
│   Tpay   │                                                 │ 4. Zapisuje operatorTxId
│ (bramka) │                                                 │
└────┬─────┘                                            ┌────▼─────┐
     │                                                  │ Webhook  │
     │ POST /api/payments/tpay-webhook                  │ Handler  │
     │ (asynchronicznie, po płatności)                  │          │
     ▼                                                  └────┬─────┘
┌──────────┐                                                 │
│ Frontend │ ◀─── redirect na /?intentId=…                   │ 5. Weryfikuje JWS + md5sum
│ /payment │      (Tpay ignoruje successUrl w sandbox)       │ 6. Tworzy Payment (COMPLETED)
│ /status  │                                                 │ 7. Aktualizuje participation
└──────────┘                                                 │    (ACCEPTED lub APPLIED)
     │                                                       │
     │ GET /api/payments/intent/:intentId/status             │
     ▼                                                       │
  Wyświetla status: success / pending / failed               │
```

## Modele danych

### PaymentIntent (tymczasowy)

Reprezentuje **zamiar płatności** przed finalizacją. Tworzony w momencie inicjacji, zachowywany jako trwały rekord po zakończeniu (nie jest usuwany).

| Pole              | Typ       | Opis                                   |
| ----------------- | --------- | -------------------------------------- |
| `id`              | UUID      | Identyfikator intencji                 |
| `participationId` | UUID (FK) | Powiązanie z uczestnictwem             |
| `userId`          | UUID (FK) | Płacący użytkownik                     |
| `eventId`         | UUID (FK) | Wydarzenie                             |
| `amount`          | Decimal   | Pełna kwota wydarzenia                 |
| `voucherReserved` | Decimal   | Kwota zarezerwowana z vouchera         |
| `operatorTxId`    | String?   | ID transakcji Tpay (ustawiane po POST) |
| `createdAt`       | DateTime  | Czas utworzenia                        |

### Payment (finalizowany)

Tworzony **wyłącznie** po potwierdzeniu płatności (webhook `tr_status=TRUE` lub pełne pokrycie voucherem).

| Pole                | Typ       | Opis                                          |
| ------------------- | --------- | --------------------------------------------- |
| `id`                | UUID      | Identyfikator płatności                       |
| `participationId`   | UUID (FK) | Powiązanie z uczestnictwem                    |
| `userId`            | UUID (FK) | Płacący użytkownik                            |
| `eventId`           | UUID (FK) | Wydarzenie                                    |
| `amount`            | Decimal   | Pełna kwota                                   |
| `voucherAmountUsed` | Decimal   | Kwota pokryta voucherem                       |
| `organizerAmount`   | Decimal   | Kwota dla organizatora                        |
| `platformFee`       | Decimal   | Prowizja platformy (MVP: 0)                   |
| `status`            | String    | `COMPLETED` / `REFUNDED` / `VOUCHER_REFUNDED` |
| `operatorTxId`      | String?   | ID transakcji Tpay                            |
| `paidAt`            | DateTime? | Czas opłacenia                                |
| `refundedAt`        | DateTime? | Czas zwrotu                                   |

## Endpointy API

| Metoda | Ścieżka                             | Guard         | Opis                                             |
| ------ | ----------------------------------- | ------------- | ------------------------------------------------ |
| POST   | `/payments/tpay-webhook`            | brak (public) | Webhook Tpay — weryfikacja JWS + md5sum          |
| POST   | `/payments/simulate-success/:id`    | ADMIN         | Symulacja sukcesu (dev/test)                     |
| GET    | `/payments/my-payments`             | auth + active | Lista płatności użytkownika (paginacja)          |
| GET    | `/payments/:id/status`              | auth + active | Status płatności po paymentId                    |
| GET    | `/payments/intent/:intentId/status` | auth + active | Status płatności po intentId (z ownership check) |
| GET    | `/payments/event/:eventId/earnings` | auth + active | Zarobki organizatora dla wydarzenia              |
| POST   | `/payments/:id/refund-voucher`      | auth + active | Zwrot jako voucher organizatora                  |
| POST   | `/payments/:id/refund-money`        | auth + active | Zwrot pieniężny przez Tpay                       |
| GET    | `/payments/admin/all`               | ADMIN         | Lista wszystkich płatności (admin)               |
| GET    | `/payments/admin/:id`               | ADMIN         | Szczegóły płatności (admin)                      |

## Weryfikacja webhooka

Webhook Tpay jest weryfikowany dwuetapowo:

1. **JWS (JSON Web Signature)** — obowiązkowy. Nagłówek `X-JWS-Signature` weryfikowany certyfikatem pobranym z Tpay (`x5u` URL). Certyfikat cachowany 24h.
2. **md5sum** — opcjonalny (wymaga `TPAY_SECURITY_CODE`). Dodatkowa warstwa: `md5(id + tr_id + tr_amount + tr_crc + security_code)`.

Jeśli brak nagłówka JWS → webhook odrzucony (400).

## Idempotentność

- Webhook sprawdza czy `Payment` z danym `operatorTxId` już istnieje — jeśli tak, ignoruje (nie tworzy duplikatu).
- `simulateSuccessfulPayment` sprawdza czy `Payment` dla danego `participationId` istnieje — jeśli tak, zwraca istniejący.

## Redirect po płatności

Tpay w trybie sandbox **ignoruje `successUrl`/`errorUrl`** i przekierowuje na stronę główną z `?intentId=...`. Rozwiązanie:

- Route `/` ma guard `paymentRedirectGuard` który sprawdza `?intentId` w query params
- Jeśli `intentId` obecny → redirect na `/payment/status?intentId=...`
- Jeśli brak → normalne ładowanie strony głównej

W produkcji Tpay powinien respektować `successUrl`/`errorUrl`, ale guard zapewnia kompatybilność wsteczną.

## Statusy na stronie /payment/status

URL redirectu z Tpay zawiera parametr `result=success` lub `result=error`. **`result=success` NIE oznacza potwierdzonej płatności** — oznacza jedynie, że użytkownik poprawnie przeszedł formularz i Tpay przyjął zlecenie. Jedynym autorytywnym źródłem jest webhook.

Frontend interpretuje kombinację `result` + status backendu:

| `result` param | Backend status   | Stan UI                | Opis                                                   |
| -------------- | ---------------- | ---------------------- | ------------------------------------------------------ |
| `error`        | — (nie odpytuje) | **Płatność nieudana**  | Tpay odrzucił płatność                                 |
| `success`      | `PENDING`        | **Płatność przyjęta**  | Zlecenie przyjęte, webhook jeszcze nie dotarł          |
| `success`      | `COMPLETED`      | **Płatność udana!**    | Webhook potwierdził płatność                           |
| brak           | `PENDING`        | **Płatność w trakcie** | Wejście na stronę później, bez kontekstu Tpay redirect |
| brak           | `COMPLETED`      | **Płatność udana!**    | Wejście na stronę później, webhook już potwierdził     |

Stan "Płatność przyjęta" ma przycisk "Sprawdź ponownie" — użytkownik może odświeżyć gdy webhook dotrze.

## Zwroty

Dwa tryby zwrotu (inicjowane przez organizatora):

1. **Voucher** (`refundAsVoucher`) — domyślny. Tworzy `OrganizerVoucher`, zmienia status na `VOUCHER_REFUNDED`, uczestnictwo na `WITHDRAWN`. Operacja DB-only, bez kontaktu z Tpay.
2. **Pieniężny** (`refundAsMoney`) — wywołuje Tpay API `/transactions/:id/refunds`. Jeśli płatność zawierała część voucherową, ta część jest przywracana jako nowy voucher.

## Walidacja wejścia (DTO)

Wszystkie endpointy używają walidacji:

- **UUID params** — `ParseUUIDPipe` na każdym `:id`, `:intentId`, `:eventId`
- **Paginacja** — `PaginationQueryDto` z `class-validator` (`@IsInt`, `@Min(1)`, `@IsOptional`)
- **Webhook** — `TpayWebhookDto` z wyłączonym `forbidNonWhitelisted` (Tpay może wysyłać dodatkowe pola)

## Serializacja Decimal → number

Kwoty w bazie przechowywane są jako `Decimal(10,2)` (dokładny typ PostgreSQL, bez błędów zaokrągleń). Prisma serializuje `Decimal` do JSON jako string (`"20.50"`), co jest niespójne z frontendem oczekującym `number`.

Rozwiązanie: globalny interceptor `DecimalSerializationInterceptor` rekurencyjnie konwertuje wszystkie `Decimal` → `number` w każdej odpowiedzi API. Zarejestrowany w `main.ts` przez `app.useGlobalInterceptors()`.

## Konfiguracja (.env)

```env
TPAY_API_URL="https://api.sandbox.tpay.com"   # sandbox / https://api.tpay.com dla produkcji
TPAY_CLIENT_ID="..."
TPAY_CLIENT_SECRET="..."
TPAY_MERCHANT_ID="..."
TPAY_SECURITY_CODE=""                          # opcjonalny (md5sum verification)

FRONTEND_URL="http://localhost:4300"
BACKEND_URL="http://localhost:3000"
```

Wszystkie wymagane zmienne (`TPAY_API_URL`, `TPAY_CLIENT_ID`, `TPAY_CLIENT_SECRET`, `TPAY_MERCHANT_ID`) pobierane są przez `getOrThrow` — aplikacja nie uruchomi się bez nich.

## Pliki źródłowe

### Backend

- `backend/src/modules/payments/payments.module.ts` — moduł NestJS
- `backend/src/modules/payments/payments.controller.ts` — endpointy REST (ParseUUIDPipe, DTOs)
- `backend/src/modules/payments/payments.service.ts` — logika biznesowa płatności
- `backend/src/modules/payments/tpay.service.ts` — klient Tpay API (OAuth2, transakcje, webhook, refund)
- `backend/src/modules/payments/dto/tpay-webhook.dto.ts` — DTO webhooka
- `backend/src/modules/payments/dto/pagination-query.dto.ts` — DTO paginacji
- `backend/src/modules/participation/participation.service.ts` — inicjacja płatności przy join
- `backend/src/app/interceptors/decimal-serialization.interceptor.ts` — Decimal → number

### Frontend

- `frontend/src/app/core/services/payment.service.ts` — serwis HTTP
- `frontend/src/app/shared/types/payment.interface.ts` — interfejsy TypeScript
- `frontend/src/app/features/payments/guards/payment-redirect.guard.ts` — guard do redirect z `/?intentId=`
- `frontend/src/app/features/payments/pages/payment-status/payment-status.component.ts` — strona statusu płatności
- `frontend/src/app/features/payments/pages/my-payments/my-payments.component.ts` — lista płatności użytkownika

### Prisma

- `backend/prisma/schema.prisma` — modele `PaymentIntent`, `Payment`, `OrganizerVoucher`
