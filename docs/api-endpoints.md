# Dokumentacja API ZgadajSie.pl

Ten dokument jest **mapą aktywnych endpointów** i ich odpowiedzialności. Nie zastępuje kodu kontrolerów ani DTO.

## Źródła prawdy

W przypadku rozbieżności nadrzędne są:

1. `backend/src/modules/**/**.controller.ts`
2. `backend/src/modules/**/dto/**`
3. `backend/src/main.ts` (global prefix `/api`)
4. ten dokument

## Podstawowe informacje

- Bazowy prefix API: `/api`
- Format danych: JSON, z wyjątkiem webhooka Tpay zwracającego plain text `TRUE`
- Główna autoryzacja: Bearer Token (JWT)
- Globalna walidacja: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`

## Skróty guardów używane w tym dokumencie

- `auth` - `JwtAuthGuard`
- `active` - `IsActiveGuard`
- `optional-auth` - `OptionalJwtAuthGuard`
- `admin` - `Roles('ADMIN')`

## Auth (`/api/auth`)

### Publiczne

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/activate?token=...`
- `POST /auth/resend-activation`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /auth/facebook`
- `GET /auth/facebook/callback`

### Chronione

- `POST /auth/refresh` - `auth` przez refresh guard

## Users (`/api/users`)

### Konto bieżącego użytkownika

- `GET /users/me` - `auth`
- `PATCH /users/me` - `auth`
- `GET /users/me/events` - `auth + active`
- `GET /users/me/participations` - `auth + active`
- `GET /users/me/reprimands` - `auth + active`

### Administracja użytkownikami

- `GET /users` - `auth + admin`
- `GET /users/:id` - `auth + admin`
- `PATCH /users/:id` - `auth + admin`

## Dictionaries (`/api/dictionaries`)

Publiczne endpointy słownikowe:

- `GET /dictionaries/cities`
- `GET /dictionaries/cities/:slug`
- `GET /dictionaries/disciplines`
- `GET /dictionaries/disciplines/:slug/schema`
- `GET /dictionaries/facilities`
- `GET /dictionaries/levels`

## City subscriptions (`/api/cities`)

- `GET /cities/:cityId/subscription` - `auth`
- `POST /cities/:cityId/subscribe` - `auth`
- `DELETE /cities/:cityId/subscribe` - `auth`

## Events (`/api/events`)

### Publiczne / częściowo publiczne

- `GET /events`
- `GET /events/:id` - `optional-auth`
- `GET /events/:id/participants`

### Dla zalogowanego aktywnego użytkownika

- `POST /events`
- `PATCH /events/:id`
- `DELETE /events/:id`
- `POST /events/:id/cancel`
- `POST /events/:id/duplicate`
- `GET /events/:id/participants/manage`
- `POST /events/:id/mark-paid/:participationId`
- `POST /events/:id/cancel-payment/:paymentId`
- `POST /events/series`
- `PATCH /events/:id/series`

## Participation (`/api`)

Kontroler participation nie ma własnego prefixu kontrolera - endpointy są wystawiane bezpośrednio pod `/api/...`.

- `POST /events/:eventId/join` - `auth + active`
- `POST /events/:eventId/join-guest` - `auth + active`
- `GET /events/:eventId/my-guests` - `auth + active`
- `POST /participations/:id/assign-slot` - `auth + active`
- `POST /participations/:id/confirm-slot` - `auth + active`
- `POST /participations/:id/release-slot` - `auth + active`
- `POST /participations/:id/leave` - `auth + active`
- `POST /participations/:id/pay` - `auth + active`

## Chat (`/api/events/:eventId/chat`)

- `GET /events/:eventId/chat/messages` - `auth + active`
- `GET /events/:eventId/chat/members` - `auth + active`
- `POST /events/:eventId/chat/ban/:userId` - `auth + active`
- `DELETE /events/:eventId/chat/ban/:userId` - `auth + active`
- `GET /events/:eventId/chat/private/conversations` - `auth + active`
- `GET /events/:eventId/chat/private/:userId/messages` - `auth + active`

### Realtime

- WebSocket namespace: `/chat`

## Announcements (`/api`)

Kontroler announcement używa mieszanych ścieżek bez wspólnego prefixu kontrolera.

- `POST /events/:eventId/announcements` - `auth`
- `GET /events/:eventId/announcements` - `optional-auth`
- `GET /announcements/confirm/:token` - publiczne
- `POST /announcements/confirm-all/:eventId` - `auth`
- `POST /announcements/:announcementId/confirm` - `auth`
- `GET /announcements/:announcementId/stats` - `auth`

## Notifications (`/api/notifications`)

- `GET /notifications` - `auth`
- `GET /notifications/unread-count` - `auth`
- `PATCH /notifications/:id/read` - `auth`
- `PATCH /notifications/read-all` - `auth`
- `POST /notifications/push/subscribe` - `auth`
- `POST /notifications/push/unsubscribe` - `auth`
- `POST /notifications/email/test-connection` - `auth`
- `POST /notifications/email/send-test` - `auth`

## Moderation (`/api/moderation`)

- `POST /moderation/reprimands` - `auth + active`
- `GET /moderation/reprimands/:userId` - `auth + active`
- `POST /moderation/ban` - `auth + active`
- `DELETE /moderation/ban/:targetUserId` - `auth + active`
- `POST /moderation/trust/:targetUserId` - `auth + active`
- `DELETE /moderation/trust/:targetUserId` - `auth + active`
- `GET /moderation/relations` - `auth + active`
- `GET /moderation/relation/:targetUserId` - `auth + active`

## Media (`/api/media`)

- `POST /media/upload` - `auth + active`
- `GET /media/me` - `auth + active`
- `DELETE /media/:id` - `auth + active`

## Cover images (`/api/cover-images`)

- `GET /cover-images` - `auth + active`
- `GET /cover-images/:id` - `auth + active`
- `GET /cover-images/:id/usage` - `auth + active + admin`
- `POST /cover-images` - `auth + active + admin`
- `PUT /cover-images/:id/image` - `auth + active + admin`
- `PUT /cover-images/:id/discipline` - `auth + active + admin`
- `DELETE /cover-images/:id` - `auth + active + admin`

## Payments (`/api/payments`)

- `POST /payments/tpay-webhook` - publiczny webhook
- `POST /payments/simulate-success/:intentId` - `auth + admin`
- `GET /payments/my-payments` - `auth + active`
- `GET /payments/:id/status` - `auth + active`
- `GET /payments/intent/:intentId/status` - `auth + active`
- `GET /payments/admin/all` - `auth + admin`
- `GET /payments/admin/:id` - `auth + admin`

## Vouchers (`/api/vouchers`)

- `GET /vouchers/my` - `auth + active`
- `GET /vouchers/balance/:organizerId` - `auth + active`

## Activity rank (`/api/activity-rank`)

- `GET /activity-rank/me` - `auth`

## Uwaga dla AI

- Nie zakładaj shape requestów i response’ów wyłącznie na podstawie tego dokumentu.
- Przy implementacji nowych konsumentów API zawsze czytaj właściwy kontroler, DTO i serwis.
- Jeśli zmieniasz kontrakt endpointu, oceń wpływ na frontend, `libs/`, dokumentację i testy.
