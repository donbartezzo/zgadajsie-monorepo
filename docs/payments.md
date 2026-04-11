# Moduł płatności i voucherów

Ten dokument opisuje **aktualnie zaimplementowany** model płatności w projekcie. W przypadku rozbieżności nadrzędne są `payments.service.ts`, `tpay.service.ts`, `events.service.ts`, `participation.service.ts` i `schema.prisma`.

## Założenia architektoniczne

- model płatności: **Tpay Single Merchant**
- aplikacja nie trzyma własnego portfela użytkownika
- użytkownik może zapłacić:
  - w pełni voucherem organizatora
  - częściowo voucherem i częściowo przez Tpay
  - w całości przez Tpay
- organizator może też ręcznie oznaczyć uczestnika jako opłaconego gotówką
- po anulowaniu płatności organizator może zwrócić środki jako voucher organizatora albo anulować płatność bez vouchera

## Główne obiekty domenowe

### `PaymentIntent`

Tymczasowy rekord tworzony przed finalizacją płatności online.

Najważniejsze pola:

- `participationId`
- `userId`
- `eventId`
- `amount`
- `voucherReserved`
- `operatorTxId`
- `createdAt`

Zastosowanie:

- reprezentuje próbę płatności wymagającą przejścia przez Tpay
- przechowuje tymczasowo kwotę zarezerwowaną z voucherów
- pozwala odpytać status po `intentId`

### `Payment`

Docelowy rekord płatności po finalizacji albo płatności gotówkowej.

Najważniejsze pola:

- `participationId`
- `userId`
- `eventId`
- `amount`
- `voucherAmountUsed`
- `organizerAmount`
- `platformFee`
- `status`
- `operatorTxId`
- `method`
- `paidAt`
- `refundedAt`

Statusy spotykane w aktualnym kodzie:

- `COMPLETED`
- `VOUCHER_REFUNDED`
- `CANCELLED`
- syntetyczne `PENDING` zwracane przez endpoint statusu po `intentId`, gdy finalny `Payment` jeszcze nie istnieje

### `OrganizerVoucher`

Voucher przypisany do konkretnego organizatora.

Najważniejsze pola:

- `recipientUserId`
- `organizerUserId`
- `eventId`
- `amount`
- `remainingAmount`
- `source`
- `status`
- `sourcePaymentId`

Voucher jest używany:

- jako częściowe lub pełne źródło płatności
- jako zwrot po anulowaniu płatności
- jako zwrot po odwołaniu wydarzenia

## Kiedy uruchamia się płatność

Dołączenie do wydarzenia **nie zawsze** od razu tworzy płatność.

Aktualny flow wygląda tak:

1. użytkownik dołącza do wydarzenia przez `POST /api/events/:eventId/join`
2. jeśli dostanie slot w płatnym wydarzeniu, slot jest przypisany z `confirmed=false`
3. właściwa inicjacja płatności odbywa się przez `POST /api/participations/:id/pay`
4. backend wywołuje `PaymentsService.initiatePayment(...)`

To oznacza, że w aktualnym systemie:

- `join` odpowiada za zgłoszenie / przydział slotu
- `pay` odpowiada za start właściwego procesu płatności

## Scenariusze płatności

### 1. Pełna płatność voucherem

Jeśli saldo voucherów użytkownika u organizatora pokrywa całość ceny wydarzenia:

- tworzony jest od razu `Payment`
- `status = COMPLETED`
- `voucherAmountUsed = amount`
- slot uczestnika zostaje potwierdzony (`confirmed = true`)
- Tpay nie jest wywoływany

Odpowiedź backendu może zawierać:

- `paymentId`
- `paidByVoucher = true`

### 2. Płatność mieszana: voucher + Tpay

Jeśli użytkownik ma voucher, ale nie na pełną kwotę:

- tworzony jest `PaymentIntent`
- część voucherowa jest od razu rezerwowana i odliczana
- brakująca część trafia do transakcji Tpay
- po sukcesie webhooka powstaje finalny `Payment`

### 3. Płatność wyłącznie przez Tpay

Jeśli użytkownik nie ma voucherów:

- tworzony jest `PaymentIntent`
- backend tworzy transakcję w Tpay
- frontend dostaje `paymentUrl`
- użytkownik jest przekierowywany do Tpay

### 4. Płatność gotówkowa oznaczana przez organizatora

Organizator może oznaczyć uczestnika jako opłaconego przez:

- `POST /api/events/:id/mark-paid/:participationId`

Wtedy backend:

- tworzy `Payment`
- ustawia `method = 'cash'`
- ustawia `status = COMPLETED`
- potwierdza slot uczestnika

## Flow Tpay

### Inicjacja

Endpoint:

- `POST /api/participations/:id/pay`

Backend:

1. sprawdza, czy uczestnik ma przydzielony slot
2. sprawdza, czy wydarzenie nie jest odwołane i jest płatne
3. czyści stare `PaymentIntent` dla tego uczestnictwa
4. w razie potrzeby przywraca wcześniej zarezerwowane vouchery
5. tworzy nowy `PaymentIntent`
6. tworzy transakcję w Tpay
7. zapisuje `operatorTxId`
8. zwraca `paymentUrl`

### Finalizacja przez webhook

Endpoint:

- `POST /api/payments/tpay-webhook`

Po statusie `TRUE`:

- webhook weryfikuje podpis
- backend znajduje `PaymentIntent` po `operatorTxId`
- tworzy finalny `Payment`
- potwierdza slot uczestnika

Po statusie `FALSE`:

- jeśli jakaś część voucherów była zarezerwowana, zostaje przywrócona jako nowy voucher
- finalny `Payment` nie jest tworzony

## Weryfikacja webhooka Tpay

Webhook jest weryfikowany dwuetapowo:

1. `JWS` - warstwa obowiązkowa
2. `md5sum` - dodatkowa warstwa, tylko gdy skonfigurowano `TPAY_SECURITY_CODE`

Ważne cechy implementacji:

- brak nagłówka `X-JWS-Signature` powoduje odrzucenie webhooka
- certyfikat JWS jest pobierany z zaufanej domeny Tpay i cachowany
- token OAuth2 do Tpay jest cachowany z marginesem bezpieczeństwa

## Redirect po płatności

Frontend ma route:

- `/payment/status`

oraz guard:

- `paymentRedirectGuard`

Jeśli route `/` dostanie query `?intentId=...`, guard przekierowuje na:

- `/payment/status?intentId=...`

Status strony płatności jest wyliczany z dwóch rzeczy:

- query params z redirectu Tpay
- odpowiedzi backendu z `GET /api/payments/intent/:intentId/status` albo `GET /api/payments/:id/status`

Stany UI w aktualnym frontendzie:

- `success`
- `accepted`
- `pending`
- `failed`
- `not_found`
- `invalid`

W praktyce:

- `result=error` ustawia od razu stan porażki
- `result=success` + backendowe `PENDING` oznacza "płatność przyjęta", ale jeszcze niepotwierdzoną webhookiem
- backendowe `COMPLETED` oznacza płatność zaksięgowaną

## Anulowanie płatności przez organizatora

Aktualny endpoint:

- `POST /api/events/:id/cancel-payment/:paymentId`

Body:

```json
{
  "refundAsVoucher": true,
  "notifyUser": true
}
```

Pole `refundAsVoucher` i `notifyUser` są opcjonalne.

Domyślne zachowanie:

- dla gotówki: oba pola domyślnie `false`
- dla płatności niegotówkowych: oba pola domyślnie `true`

Scenariusze:

### Gotówka bez vouchera

- rekord `Payment` jest usuwany
- slot pozostaje przypisany, ale `confirmed = false`
- użytkownik musi opłacić udział ponownie, jeśli ma wrócić do potwierdzonego stanu

### Zwrot jako voucher

- `Payment.status = VOUCHER_REFUNDED`
- tworzony jest `OrganizerVoucher`
- ustawiane jest `sourcePaymentId`
- slot pozostaje przypisany, ale `confirmed = false`

### Anulowanie bez vouchera dla płatności niegotówkowej

- `Payment.status = CANCELLED`
- slot pozostaje przypisany, ale `confirmed = false`

### Powiadomienie użytkownika

Jeśli `notifyUser = true`, backend tworzy powiadomienie `PAYMENT_CANCELLED`.

## Automatyczne vouchery po odwołaniu wydarzenia

Przy odwołaniu wydarzenia backend może masowo wygenerować vouchery dla uczestników z opłaconymi płatnościami. To jest osobny mechanizm od ręcznego anulowania pojedynczej płatności.

## Endpointy związane z płatnościami i voucherami

### Płatności

- `POST /api/participations/:id/pay`
- `POST /api/payments/tpay-webhook`
- `POST /api/payments/simulate-success/:intentId` - admin/dev
- `GET /api/payments/my-payments`
- `GET /api/payments/:id/status`
- `GET /api/payments/intent/:intentId/status`
- `GET /api/payments/admin/all`
- `GET /api/payments/admin/:id`

### Zarządzanie płatnością przez organizatora

- `POST /api/events/:id/mark-paid/:participationId`
- `POST /api/events/:id/cancel-payment/:paymentId`

### Vouchery

- `GET /api/vouchers/my`
- `GET /api/vouchers/balance/:organizerId`

## Konfiguracja środowiska

Wymagane zmienne dla Tpay:

- `TPAY_API_URL`
- `TPAY_CLIENT_ID`
- `TPAY_CLIENT_SECRET`
- `TPAY_MERCHANT_ID`

Opcjonalne:

- `TPAY_SECURITY_CODE`

Ogólne:

- `FRONTEND_URL`
- `BACKEND_URL`

`TpayService` używa `getOrThrow`, więc brak wymaganych zmiennych zatrzymuje aplikację na starcie.

## Serializacja kwot

Kwoty są przechowywane w Prisma jako `Decimal`, a następnie serializowane globalnie do `number` przez `DecimalSerializationInterceptor`.

## Pliki źródłowe

### Backend

- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/payments/tpay.service.ts`
- `backend/src/modules/vouchers/vouchers.controller.ts`
- `backend/src/modules/vouchers/vouchers.service.ts`
- `backend/src/modules/events/events.service.ts`
- `backend/src/modules/participation/participation.service.ts`
- `backend/prisma/schema.prisma`

### Frontend

- `frontend/src/app/core/services/payment.service.ts`
- `frontend/src/app/core/services/event.service.ts`
- `frontend/src/app/core/services/voucher.service.ts`
- `frontend/src/app/features/payments/guards/payment-redirect.guard.ts`
- `frontend/src/app/features/payments/pages/payment-status/payment-status.component.ts`
- `frontend/src/app/features/payments/pages/my-payments/my-payments.component.ts`
- `frontend/src/app/features/vouchers/pages/my-vouchers/my-vouchers.component.ts`

## Uwaga dla AI

- Nie zakładaj istnienia endpointów refundowych pod `/payments/:id/refund-*` - w aktualnym kodzie zarządzanie anulowaniem płatności odbywa się przez `events/:id/cancel-payment/:paymentId`.
- Nie traktuj starego modelu `wallet` jako obowiązującego - aktywne są `payments` i `vouchers`.
- Jeśli zmieniasz flow płatności, sprawdź wpływ na backend, frontend, enumy w `libs/` i dokumentację.
