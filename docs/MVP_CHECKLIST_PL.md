# MVP Checklista – ZgadajSię

Kompletna, liniowa checklista implementacji MVP. Po zatwierdzeniu plik zostanie skopiowany do `docs/MVP_CHECKLIST_PL.md`.

## Decyzje technologiczne

- **Płatności**: Tpay (BLIK)
- **Storage**: Cloudflare R2
- **Chat**: Socket.IO (własna impl.)
- **Mapy**: Nominatim + Leaflet/MapLibre + OSM
- **Weryfikacja**: Tylko email
- **Komunikatory**: Poza MVP

## Stan projektu

- Monorepo Nx: `frontend/` (Angular 20), `backend/` (NestJS 11), `libs/` (@zgadajsie/shared)
- PostgreSQL 16 (docker-compose, port 5433), Prisma 5
- Istniejące: User/Event/Participation (uproszczone), EventController, layout, IconComponent, routing (/, /events, /event/:id)

---

## FAZA 0 – Zależności i konfiguracja

### 0.1 Zależności backend

- [x] `pnpm add @nestjs/config`
- [x] `pnpm add @nestjs/passport passport passport-jwt passport-local @nestjs/jwt`
- [x] `pnpm add bcrypt && pnpm add -D @types/bcrypt`
- [x] `pnpm add class-validator class-transformer`
- [x] `pnpm add @nestjs/platform-socket.io @nestjs/websockets socket.io`
- [x] `pnpm add nodemailer && pnpm add -D @types/nodemailer`
- [x] `pnpm add web-push && pnpm add -D @types/web-push`
- [x] `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- [x] `pnpm add multer && pnpm add -D @types/multer`
- [x] `pnpm add uuid && pnpm add -D @types/uuid`
- [x] `pnpm add passport-google-oauth20 && pnpm add -D @types/passport-google-oauth20`
- [x] `pnpm add passport-facebook && pnpm add -D @types/passport-facebook`

### 0.2 Zależności frontend

- [x] `pnpm add leaflet && pnpm add -D @types/leaflet`
- [x] `pnpm add socket.io-client`
- [x] `pnpm add @angular/service-worker`

### 0.3 Env backend – utworzyć `backend/.env.example`

- [x] Dodać zmienne: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRATION=15m`, `JWT_REFRESH_EXPIRATION=7d`
- [x] Dodać zmienne: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- [x] Dodać zmienne: `FRONTEND_URL=http://localhost:4200`
- [x] Dodać zmienne: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- [x] Dodać zmienne: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- [x] Dodać zmienne: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL`
- [x] Dodać zmienne: `TPAY_CLIENT_ID`, `TPAY_CLIENT_SECRET`, `TPAY_MERCHANT_ID`, `TPAY_API_URL`, `TPAY_NOTIFICATION_URL`
- [x] Dodać zmienne: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [x] Dodać `ConfigModule.forRoot({ isGlobal: true })` do `backend/src/app/app.module.ts`

### 0.4 Env frontend

- [x] Utworzyć `frontend/src/environments/environment.ts`: `apiUrl: '/api'`, `wsUrl: 'http://localhost:3000'`, `vapidPublicKey: ''`
- [x] Utworzyć `frontend/src/environments/environment.prod.ts` z produkcyjnymi wartościami

### 0.5 Shared library

- [x] Usunąć placeholder z `libs/src/lib/libs.ts`
- [x] Utworzyć `libs/src/lib/enums/role.enum.ts` – `USER`, `ADMIN`
- [x] Utworzyć `libs/src/lib/enums/event-status.enum.ts` – `ACTIVE`, `CANCELLED`, `COMPLETED`, `ARCHIVED`
- [x] Utworzyć `libs/src/lib/enums/event-visibility.enum.ts` – `PUBLIC`, `PRIVATE`
- [x] Utworzyć `libs/src/lib/enums/event-gender.enum.ts` – `MALE`, `FEMALE`, `ANY`
- [x] Utworzyć `libs/src/lib/enums/participation-status.enum.ts` – `APPLIED`, `ACCEPTED`, `PARTICIPANT`, `WITHDRAWN`
- [x] Utworzyć `libs/src/lib/enums/wallet-transaction-type.enum.ts` – `TOPUP`, `EVENT_FEE`, `EVENT_REFUND`, `EVENT_CREATION_FEE`, `ADMIN_CREDIT`, `ADMIN_DEBIT`
- [x] Utworzyć `libs/src/lib/enums/notification-type.enum.ts` – `EMAIL`, `PUSH`
- [x] Utworzyć `libs/src/lib/enums/social-provider.enum.ts` – `GOOGLE`, `FACEBOOK`
- [x] Utworzyć `libs/src/lib/enums/activity-rank.enum.ts` – `OCCASIONAL` (0–3), `ACTIVE` (4–11), `REGULAR` (12–23), `VETERAN` (≥24)
- [x] Utworzyć `libs/src/lib/enums/index.ts` – reeksport
- [x] Zaktualizować `libs/src/index.ts` – `export * from './lib/enums'`

---

## FAZA 1 – Baza danych

### 1.1 Schema Prisma

- [x] Zastąpić `backend/prisma/schema.prisma` nowym schematem z modelami:
  - **User**: id(uuid), email(unique), passwordHash?, displayName, avatarUrl?, role(default USER), isActive(default false), isEmailVerified(default false), activationToken?, activationTokenExpiresAt?, passwordResetToken?, passwordResetTokenExpiresAt?, createdAt, updatedAt
  - **SocialAccount**: id, userId→User, provider, providerUserId, createdAt; @@unique([provider, providerUserId])
  - **City**: id, name, slug(unique), isActive(default true)
  - **EventDiscipline**: id, name, slug(unique)
  - **EventFacility**: id, name, slug(unique)
  - **EventLevel**: id, name, slug(unique)
  - **Event**: id, title, description?, coverImageUrl?, disciplineId→EventDiscipline, facilityId→EventFacility, levelId→EventLevel, cityId→City, organizerId→User, startsAt, endsAt, costPerPerson(Decimal default 0), minParticipants?, maxParticipants?, ageMin?, ageMax?, gender(default ANY), visibility(default PUBLIC), autoAccept(default false), status(default ACTIVE), address, lat(Float), lng(Float), isRecurring(default false), recurringRule?, parentEventId?(self), createdAt, updatedAt; @@index([cityId,status,startsAt])
  - **EventParticipation**: id, eventId→Event, userId→User, status(default APPLIED), paidAmount(Decimal default 0), addedByUserId?→User, isGuest(default false), createdAt, updatedAt; @@unique([eventId,userId])
  - **Wallet**: id, userId→User(unique), balance(Decimal default 0)
  - **WalletTransaction**: id, walletId→Wallet, type, amount(Decimal), description?, relatedEventId?→Event, adminUserId?→User, createdAt; @@index([walletId,createdAt])
  - **MediaFile**: id, userId→User, url, originalName, mimeType, sizeBytes(Int), createdAt
  - **ChatMessage**: id, eventId→Event, userId→User, content, createdAt; @@index([eventId,createdAt])
  - **Reprimand**: id, fromUserId→User, toUserId→User, eventId→Event, reason, expiresAt, createdAt
  - **OrganizerBan**: id, organizerUserId→User, bannedUserId→User, reason?, createdAt; @@unique([organizerUserId,bannedUserId])
  - **Notification**: id, userId→User, type, title, body, isRead(default false), relatedEventId?→Event, createdAt; @@index([userId,isRead,createdAt])
  - **PushSubscription**: id, userId→User, endpoint, p256dh, auth, createdAt; @@unique([userId,endpoint])
  - **SystemSetting**: key(@id), value
  - **UserEventLimit**: id, userId→User(unique), maxActiveEvents(Int)

### 1.2 Migracja i seed

- [x] Usunąć `backend/prisma/migrations/`
- [x] Uruchomić `cd backend && npx prisma migrate dev --name init`
- [x] Uruchomić `cd backend && npx prisma generate`
- [x] Zastąpić `backend/prisma/seed.ts`:
  - City: `Zielona Góra` / `zielona-gora`
  - Dyscypliny: Piłka nożna, Siatkówka, Koszykówka, Tenis, Badminton, Squash, Bieganie, Kolarstwo, Pływanie
  - Obiekty: Orlik, Hala sportowa, Balon, Boisko syntetyczne, Boisko trawiaste, Kort, Stadion
  - Poziomy: Rekreacyjny, Amatorski, Półzaawansowany, Zaawansowany, Półzawodowy
  - Admin: email `admin@zgadajsie.pl`, hasło `Admin123!` (bcrypt), role ADMIN, isActive=true, isEmailVerified=true + Wallet
  - SystemSetting: `event_creation_fee=0`, `default_active_event_limit=1`
- [x] Uruchomić seed: `cd backend && npx prisma db seed`

---

## FAZA 2 – Backend: moduły NestJS

### 2.1 Restrukturyzacja

- [x] Utworzyć `backend/src/modules/prisma/prisma.module.ts` (Global, exports PrismaService)
- [x] Przenieść `prisma.service.ts` → `backend/src/modules/prisma/prisma.service.ts`
- [x] Usunąć `backend/src/app/event.controller.ts` i `event.service.ts`
- [x] Zaktualizować `app.module.ts` – usunąć stare importy

### 2.2 Moduł Auth

- [x] Utworzyć `backend/src/modules/auth/auth.module.ts`
- [x] Utworzyć `auth.service.ts`: register, login, refreshToken, activateAccount, resendActivation, forgotPassword, resetPassword, validateGoogleUser, validateFacebookUser
- [x] Utworzyć `auth.controller.ts`: POST register, POST login, POST refresh, GET activate, POST resend-activation, POST forgot-password, POST reset-password, GET google, GET google/callback, GET facebook, GET facebook/callback
- [x] Utworzyć `dto/register.dto.ts`: email, password(min 8), displayName(min 2)
- [x] Utworzyć `dto/login.dto.ts`: email, password
- [x] Utworzyć `dto/refresh-token.dto.ts`: refreshToken
- [x] Utworzyć `dto/forgot-password.dto.ts`: email
- [x] Utworzyć `dto/reset-password.dto.ts`: token, newPassword
- [x] Utworzyć `strategies/jwt.strategy.ts`
- [x] Utworzyć `strategies/jwt-refresh.strategy.ts`
- [x] Utworzyć `strategies/google.strategy.ts`
- [x] Utworzyć `strategies/facebook.strategy.ts`
- [x] Utworzyć `guards/jwt-auth.guard.ts`
- [x] Utworzyć `guards/jwt-refresh.guard.ts`
- [x] Utworzyć `guards/is-active.guard.ts` – 403 jeśli !user.isActive
- [x] Utworzyć `guards/roles.guard.ts`
- [x] Utworzyć `decorators/roles.decorator.ts`
- [x] Utworzyć `decorators/current-user.decorator.ts`

### 2.3 Moduł Users

- [x] Utworzyć `backend/src/modules/users/users.module.ts`
- [x] Utworzyć `users.service.ts`
- [x] Utworzyć `users.controller.ts`: GET me, PATCH me, GET me/events, GET me/participations, GET me/reprimands, GET :id(admin), PATCH :id(admin), GET /(admin, paginated)
- [x] Utworzyć `dto/update-profile.dto.ts`: displayName?, avatarUrl?, email?, currentPassword?, newPassword?
- [x] Utworzyć `dto/admin-update-user.dto.ts`: displayName?, role?, isActive?, maxActiveEvents?

### 2.4 Moduł Events

- [x] Utworzyć `backend/src/modules/events/events.module.ts`
- [x] Utworzyć `events.service.ts`: create, findAll(filters+pagination), findOne, update, cancel(+zwroty+powiadomienia), archive, duplicate, remove, toggleAutoAccept, getParticipants(+rangi+badge NOWY)
- [x] Utworzyć `events.controller.ts`: POST /, GET /(public), GET :id, PATCH :id, POST :id/cancel, POST :id/archive, POST :id/duplicate, DELETE :id(admin), PATCH :id/auto-accept, GET :id/participants
- [x] Utworzyć `dto/create-event.dto.ts`: title, description?, disciplineId, facilityId, levelId, cityId, startsAt, endsAt, costPerPerson?, min/maxParticipants?, ageMin/Max?, gender?, visibility?, autoAccept?, address, lat, lng, coverImageUrl?, isRecurring?, recurringRule?
- [x] Utworzyć `dto/update-event.dto.ts`: PartialType(CreateEventDto)
- [x] Utworzyć `dto/event-query.dto.ts`: page?, limit?, citySlug?, disciplineSlug?, sortBy?
- [ ] Utworzyć `guards/is-owner-or-admin.guard.ts` *(pominięty – logika w serwisie)*

### 2.5 Moduł Participation

- [x] Utworzyć `backend/src/modules/participation/participation.module.ts`
- [x] Utworzyć `participation.service.ts`: join(+autoakceptacja), joinGuest(max 2), accept(→opłata→PARTICIPANT), reject, leave(+zwrot jeśli >3h), isNewUserForOrganizer, autoAcceptIfEligible
- [x] Utworzyć `participation.controller.ts`: POST events/:eventId/join, POST events/:eventId/join-guest, POST participations/:id/accept, POST participations/:id/reject, POST events/:eventId/leave
- [x] Utworzyć `dto/join-guest.dto.ts`: displayName

### 2.6 Moduł Wallet

- [x] Utworzyć `backend/src/modules/wallet/wallet.module.ts`
- [x] Utworzyć `wallet.service.ts`: getBalance, getTransactions(paginated), initTopup, confirmTopup, debit(atomic), credit(atomic), adminAdjust
- [x] Utworzyć `wallet.controller.ts`: GET me, GET me/transactions, POST me/topup, POST tpay-notification(webhook), GET :userId(admin), GET :userId/transactions(admin), POST :userId/adjust(admin)
- [x] Utworzyć `tpay.service.ts`: createTransaction, verifyNotification
- [x] Utworzyć `dto/topup.dto.ts`: amount(min 1, max 10000)
- [x] Utworzyć `dto/admin-adjust.dto.ts`: amount, description

### 2.7 Moduł Chat

- [x] Utworzyć `backend/src/modules/chat/chat.module.ts`
- [x] Utworzyć `chat.gateway.ts`: WebSocket (Socket.IO, namespace /chat), events: joinRoom, leaveRoom, sendMessage, typing; autoryzacja JWT w handshake
- [x] Utworzyć `chat.controller.ts`: GET events/:eventId/chat/messages (paginated, auth+isParticipant)
- [x] Utworzyć `chat.service.ts`: getMessages, createMessage, isParticipant

### 2.8 Moduł Media

- [x] Utworzyć `backend/src/modules/media/media.module.ts`
- [x] Utworzyć `media.service.ts`: upload(max 10 per user), getMyMedia, delete(+R2+placeholder)
- [x] Utworzyć `media.controller.ts`: POST upload(multer, max 5MB), GET me, DELETE :id
- [x] Utworzyć `r2-storage.service.ts`: upload(key,buffer,contentType), delete(key), getPublicUrl(key)

### 2.9 Moduł Moderation

- [x] Utworzyć `backend/src/modules/moderation/moderation.module.ts`
- [x] Utworzyć `moderation.service.ts`: createReprimand(expiresAt=+90d), getActiveReprimands, createBan, removeBan, getMyBans, isUserBannedByOrganizer
- [x] Utworzyć `moderation.controller.ts`: POST events/:eventId/reprimands, POST organizer-bans, DELETE organizer-bans/:id, GET organizer-bans/me
- [x] Utworzyć `dto/create-reprimand.dto.ts`: toUserId, reason
- [x] Utworzyć `dto/create-ban.dto.ts`: bannedUserId, reason?

### 2.10 Moduł Notifications

- [x] Utworzyć `backend/src/modules/notifications/notifications.module.ts`
- [x] Utworzyć `notifications.service.ts`: create, getMyNotifications(paginated), markAsRead, getUnreadCount
- [x] Utworzyć `notifications.controller.ts`: GET me, PATCH :id/read, POST push-subscription, DELETE push-subscription
- [ ] Utworzyć `email.service.ts`: sendActivationEmail, sendPasswordResetEmail, sendParticipationStatusEmail, sendEventUpdateEmail, sendEventCancelledEmail, sendTopupConfirmationEmail
- [ ] Utworzyć `push.service.ts`: subscribe, unsubscribe, sendPush, sendPushToEventParticipants

### 2.11 Moduł Activity Rank

- [x] Utworzyć `backend/src/modules/activity-rank/activity-rank.module.ts`
- [x] Utworzyć `activity-rank.service.ts`: getRank(userId) – policz Participation(PARTICIPANT) na Event(COMPLETED, endsAt>now-90d); getRankLabel(count); getRanksForEvent(eventId)

### 2.12 Moduł Dictionaries

- [x] Utworzyć `backend/src/modules/dictionaries/dictionaries.module.ts`
- [x] Utworzyć `dictionaries.controller.ts`: GET cities, GET disciplines, GET facilities, GET levels
- [x] Utworzyć `dictionaries.service.ts`

### 2.13 Moduł Admin

- [ ] Utworzyć `backend/src/modules/admin/admin.module.ts` *(odłożone do FAZY 13)*
- [ ] Utworzyć `admin.controller.ts`: GET dashboard, GET/PATCH settings/:key, CRUD disciplines, CRUD facilities, CRUD levels
- [ ] Utworzyć `admin.service.ts`
- [ ] Utworzyć `dto/update-setting.dto.ts`: value

### 2.14 Rejestracja w AppModule

- [x] Zaktualizować `backend/src/app/app.module.ts` – imports: ConfigModule, PrismaModule, AuthModule, UsersModule, EventsModule, ParticipationModule, WalletModule, ChatModule, MediaModule, ModerationModule, NotificationsModule, ActivityRankModule, DictionariesModule, AdminModule

### 2.15 Global config

- [x] Dodać `ValidationPipe({ whitelist: true, transform: true })` globalnie w `main.ts`
- [ ] Utworzyć `backend/src/common/filters/http-exception.filter.ts`
- [ ] Zarejestrować filtr w `main.ts`
- [x] Dodać CORS w `main.ts`: `app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })`

---

## FAZA 3 – Frontend: services, guards, routing

### 3.1 Shared types

- [x] Utworzyć `frontend/src/app/shared/types/user.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/event.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/event-list-item.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/participation.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/wallet.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/chat-message.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/notification.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/dictionary.interface.ts`
- [x] Utworzyć `frontend/src/app/shared/types/index.ts`

### 3.2 Auth

- [x] Utworzyć `frontend/src/app/core/auth/auth.service.ts`: signals currentUser/isLoggedIn/isAdmin; login, register, logout, refreshToken, fetchUser, activateAccount, resendActivation, forgotPassword, resetPassword, getAccessToken, initOnAppStart
- [x] Utworzyć `frontend/src/app/core/auth/auth.interceptor.ts`: dodaj Bearer token, obsłuż 401→refresh→retry
- [x] Utworzyć `frontend/src/app/core/auth/auth.guard.ts`: !isLoggedIn → /auth/login
- [x] Utworzyć `frontend/src/app/core/auth/active.guard.ts`: !isActive → /profile
- [x] Utworzyć `frontend/src/app/core/auth/admin.guard.ts`: !isAdmin → /
- [x] Zarejestrować interceptor w `app.config.ts`: `provideHttpClient(withInterceptors([authInterceptor]))`
- [x] Dodać `APP_INITIALIZER` w `app.config.ts` → `authService.initOnAppStart()`

### 3.3 Services

- [x] Utworzyć `frontend/src/app/core/services/event.service.ts`: getEvents, getEvent, createEvent, updateEvent, cancelEvent, archiveEvent, duplicateEvent, toggleAutoAccept, getParticipants, joinEvent, joinGuest, leaveEvent, acceptParticipation, rejectParticipation
- [x] Utworzyć `frontend/src/app/core/services/wallet.service.ts`: getBalance, getTransactions, initTopup
- [x] Utworzyć `frontend/src/app/core/services/chat.service.ts`: connect(Socket.IO), disconnect, sendMessage, onMessage(Observable), getHistory
- [x] Utworzyć `frontend/src/app/core/services/notification.service.ts`: getNotifications, markAsRead, getUnreadCount(signal), subscribeToPush, unsubscribeFromPush
- [x] Utworzyć `frontend/src/app/core/services/media.service.ts`: upload(FormData), getMyMedia, delete
- [x] Utworzyć `frontend/src/app/core/services/dictionary.service.ts`: getCities, getDisciplines, getFacilities, getLevels
- [x] Utworzyć `frontend/src/app/core/services/user.service.ts`: updateProfile, getMyEvents, getMyParticipations, getMyReprimands
- [x] Utworzyć `frontend/src/app/core/services/admin.service.ts`: getDashboard, getUsers, getUser, updateUser, getUserWallet, getUserTransactions, adjustWallet, getSettings, updateSetting, CRUD dictionaries
- [x] Utworzyć `frontend/src/app/core/services/moderation.service.ts`: createReprimand, createBan, removeBan, getMyBans
- [ ] Usunąć stary `frontend/src/app/features/event/event.service.ts` *(do usunięcia)*

### 3.4 Routing

- [x] Zastąpić `frontend/src/app/app.routes.ts` pełnym routingiem (lazy-loaded):
  - `''` → HomeComponent
  - `'events'` → EventListComponent
  - `'events/new'` → EventFormComponent [authGuard, activeGuard]
  - `'events/:id'` → EventDetailComponent
  - `'events/:id/edit'` → EventFormComponent [authGuard, activeGuard]
  - `'events/:id/manage'` → EventManageComponent [authGuard, activeGuard]
  - `'events/:id/chat'` → EventChatComponent [authGuard, activeGuard]
  - `'auth/login'` → LoginComponent
  - `'auth/register'` → RegisterComponent
  - `'auth/activate'` → ActivateComponent
  - `'auth/forgot-password'` → ForgotPasswordComponent
  - `'auth/reset-password'` → ResetPasswordComponent
  - `'profile'` → ProfileComponent [authGuard]
  - `'profile/events'` → MyEventsComponent [authGuard, activeGuard]
  - `'profile/participations'` → MyParticipationsComponent [authGuard, activeGuard]
  - `'profile/media'` → MediaGalleryComponent [authGuard, activeGuard]
  - `'wallet'` → WalletComponent [authGuard, activeGuard]
  - `'admin'` → AdminDashboardComponent [adminGuard]
  - `'admin/users'` → AdminUsersComponent [adminGuard]
  - `'admin/users/:id'` → AdminUserDetailComponent [adminGuard]
  - `'admin/events'` → AdminEventsComponent [adminGuard]
  - `'admin/settings'` → AdminSettingsComponent [adminGuard]
  - `'faq'` → FaqComponent
  - `'contact'` → ContactComponent
  - `'privacy'` → PrivacyComponent
  - `'terms'` → TermsComponent
  - `'**'` → redirect `''`

---

## FAZA 4 – Frontend: shared UI

- [x] Rozbudować `IconComponent` o ikony: plus, minus, check, x, heart, share, send, message-circle, bell, bell-off, map-pin, clock, dollar-sign, credit-card, wallet, upload, trash, edit, copy, users, user-plus, user-x, shield, shield-alert, star, trophy, flag, arrow-left, arrow-right, arrow-up, arrow-down, external-link, log-in, log-out, eye, eye-off, lock, mail, phone, image, camera, filter, sort
- [x] Utworzyć `shared/ui/button/button.component.ts` + `.html`: variant(primary/secondary/outline/danger/ghost), size(sm/md/lg), disabled, loading, fullWidth
- [x] Utworzyć `shared/ui/card/card.component.ts` + `.html`: wrapper div z Tailwind (bg-white dark:bg-slate-800 rounded-2xl shadow-sm), ng-content
- [x] Utworzyć `shared/ui/event-card/event-card.component.ts` + `.html`: input event, output selected; grafika, data, tytuł, lokalizacja, cena, avatary
- [x] Utworzyć `shared/ui/user-avatar/user-avatar.component.ts` + `.html`: input avatarUrl/displayName/size/rank/isNew; avatar img lub inicjały + badge
- [x] Utworzyć `shared/ui/dialog/dialog.component.ts` + `.html`: CDK Overlay, input isOpen/title, output closed, ng-content
- [x] Utworzyć `shared/ui/snackbar/snackbar.service.ts` + `snackbar.component.ts` + `.html`: show(message, type, duration)
- [x] Utworzyć `shared/ui/loading-spinner/loading-spinner.component.ts` + `.html`
- [x] Utworzyć `shared/ui/empty-state/empty-state.component.ts` + `.html`: input icon/title/message
- [x] Utworzyć `shared/ui/pagination/pagination.component.ts` + `.html`: input currentPage/totalPages, output pageChange
- [x] Utworzyć `shared/ui/file-upload/file-upload.component.ts` + `.html`: input accept/maxSizeMb, output fileSelected; drag&drop + preview
- [x] Utworzyć `shared/ui/map/map.component.ts` + `.html`: input lat/lng/zoom/markers/interactive, output markerMoved; Leaflet + OSM

---

## FAZA 5 – Frontend: layout + strona główna

- [x] Zaktualizować `app.html`: odkomentować `<app-header>`, dodać `pt-14 pb-16` na content
- [x] Zaktualizować `header.component.html`: logo ZgadajSię→/, zalogowany→avatar+dropdown(profil,portfel,moje eventy,wyloguj)+bell z badge, niezalogowany→"Zaloguj się"→/auth/login
- [x] Zaktualizować `header.component.ts`: inject AuthService, NotificationService
- [x] Zaktualizować `footer.component.html`: 4 pozycje: Start(/), Wydarzenia(/events), Dodaj(/events/new ukryj jeśli niezalogowany), Profil(/profile)
- [x] Zaktualizować `footer.component.ts`: inject AuthService
- [x] Zaktualizować `home.component.html`: hero z logo ZgadajSię, hasło "Dołącz do lokalnej społeczności sportowej w Zielonej Górze", CTA "Przeglądaj wydarzenia"→/events, "Zaloguj się"→/auth/login (jeśli niezalogowany), 3 USP ikony
- [x] Zaktualizować `home.component.ts`: inject AuthService

---

## FAZA 6 – Frontend: auth pages

- [x] Utworzyć `features/auth/login/login.component.ts` + `.html`: email, hasło, "Zaloguj", Google/Facebook, linki register/forgot-password
- [x] Utworzyć `features/auth/register/register.component.ts` + `.html`: displayName, email, hasło, potw. hasła, "Utwórz konto", Google/Facebook, link login
- [x] Utworzyć `features/auth/activate/activate.component.ts` + `.html`: token z query, sukces→/auth/login, błąd→"Wyślij ponownie"
- [x] Utworzyć `features/auth/forgot-password/forgot-password.component.ts` + `.html`: email, "Wyślij link"
- [x] Utworzyć `features/auth/reset-password/reset-password.component.ts` + `.html`: token z query, nowe hasło, potw., sukces→/auth/login

---

## FAZA 7 – Frontend: listing + karta wydarzenia

- [x] Zastąpić `features/events/events.component.ts` + `.html`: fetch z EventService, sortowanie po dacie, infinite scroll, loading/error/empty states
- [x] Usunąć `event-item.component.ts` + `.html` (zastąpiony EventCardComponent) *(do usunięcia ręcznie)*
- [x] Zastąpić `features/event/event.component.ts` + `.html`: fetch event+participants, hero grafika, info org, opis, szczegóły (data, lokalizacja+mapa, obiekt, poziom, płeć, wiek, koszt), lista uczestników (avatary+rangi+NOWY), sticky bottom bar (Dołącz/Wypisz się), przycisk Chat (jeśli PARTICIPANT), Udostępnij

---

## FAZA 8 – Frontend: formularz wydarzenia

- [x] Utworzyć `features/events/event-form/event-form.component.ts` + `.html`: reactive form, fetch słowników, tryb create/edit/duplicate, upload grafiki (FileUpload), pola: title, description, disciplineId(select), facilityId(select), levelId(select), startsAt(datetime-local), endsAt, costPerPerson, min/maxParticipants, ageMin/Max, gender(select), visibility(select), autoAccept(toggle), MapComponent(interactive) + input adresu + geokodowanie Nominatim, przycisk submit

---

## FAZA 9 – Frontend: profil użytkownika

- [x] Utworzyć `features/user/profile/profile.component.ts` + `.html`: avatar(lg)+zmiana, displayName, email, ranga, formularz edycji (nazwa, email, hasło), info aktywacja (jeśli nieaktywny→"Wyślij link ponownie"), linki: Moje wydarzenia, Uczestnictwa, Galeria, Portfel
- [x] Utworzyć `features/user/my-events/my-events.component.ts` + `.html`: lista organizowanych eventów, zarządzanie: edycja, anuluj, archiwizuj, duplikuj
- [x] Utworzyć `features/user/my-participations/my-participations.component.ts` + `.html`: lista uczestnictw z ich statusami, przycisk Wypisz się
- [x] Utworzyć `features/user/media-gallery/media-gallery.component.ts` + `.html`: grid grafik, upload (FileUpload, limit 10), usuwanie

---

## FAZA 10 – Frontend: portfel

- [x] Utworzyć `features/wallet/wallet.component.ts` + `.html`: saldo, przycisk "Doładuj"→formularz kwoty+Tpay redirect, historia transakcji (typ, kwota, data, opis, event), filtrowanie, paginacja

---

## FAZA 11 – Frontend: chat

- [x] Utworzyć `features/chat/event-chat.component.ts` + `.html`: nagłówek (nazwa eventu, avatary), bąbelki (lewe/prawe), input+wysyłanie, Socket.IO real-time, scroll do najnowszych, ładowanie starszych (infinite scroll up)

---

## FAZA 12 – Frontend: panel organizatora

- [x] Utworzyć `features/organizer/event-manage.component.ts` + `.html`: lista zgłoszeń (avatar, nazwa, ranga/NOWY, status, Akceptuj/Odrzuć), lista uczestników (reprymenda, ban), toggle autoakceptacji, statystyki (zgłoszenia, uczestnicy, przychód)

---

## FAZA 13 – Frontend: panel admina

- [x] Utworzyć `features/admin/admin-dashboard.component.ts` + `.html`: statystyki (userzy, eventy, aktywne, wpłaty)
- [x] Utworzyć `features/admin/admin-users.component.ts` + `.html`: tabela userów (filtr, sort, paginacja), link do szczegółów
- [x] Utworzyć `features/admin/admin-user-detail.component.ts` + `.html`: pełny profil, edycja, portfel (saldo+historia+adjust), limit eventów
- [x] Utworzyć `features/admin/admin-events.component.ts` + `.html`: tabela eventów (filtr, sort, paginacja), edycja, usunięcie, zmiana statusu
- [x] Utworzyć `features/admin/admin-settings.component.ts` + `.html`: lista ustawień systemowych (edycja), CRUD dyscyplin/obiektów/poziomów

---

## FAZA 14 – Frontend: strony statyczne

- [x] Utworzyć `features/static/faq/faq.component.ts` + `.html`: accordion (CDK CdkAccordion + Tailwind), pytania/odpowiedzi statyczne
- [x] Utworzyć `features/static/contact/contact.component.ts` + `.html`: formularz (imię, email, wiadomość), dane kontaktowe, mapa
- [x] Utworzyć `features/static/privacy/privacy.component.ts` + `.html`: treść polityki prywatności
- [x] Utworzyć `features/static/terms/terms.component.ts` + `.html`: treść regulaminu

---

## FAZA 15 – Powiadomienia

- [ ] Zintegrować EmailService we wszystkich przepływach: rejestracja, aktywacja, zmiana statusu uczestnictwa, edycja/anulowanie eventu, doładowanie portfela, reprymenda
- [ ] Zintegrować PushService: nowe zgłoszenie (do org.), zmiana statusu uczestnictwa (do usera), nowa wiadomość chat, przypomnienie 24h i 2h przed eventem, anulowanie eventu
- [ ] Dodać cron job (NestJS @Cron) do wysyłki przypomnień o zbliżających się wydarzeniach

---

## FAZA 16 – Wydarzenia cykliczne

- [ ] Rozbudować `events.service.ts`: logika tworzenia serii (recurringRule → generowanie instancji)
- [ ] Dodać edycję: pojedyncza instancja vs. cała seria
- [ ] Powiązanie parentEventId między instancjami

---

## FAZA 17 – PWA

- [ ] Dodać Angular Service Worker (`ng add @angular/service-worker` lub ręczna konfiguracja)
- [ ] Skonfigurować `ngsw-config.json`: caching assets, API
- [ ] Dodać `manifest.webmanifest`: name "ZgadajSię", ikony, theme_color, background_color, display "standalone"
- [ ] Dodać meta tagi PWA w `index.html`
- [ ] Zarejestrować service worker w `app.config.ts`
- [ ] Skonfigurować Web Push: generowanie VAPID keys, rejestracja subskrypcji w PushService

---

## FAZA 18 – Social login

- [ ] Skonfigurować Google OAuth2 (Google Cloud Console: client ID + secret, authorized redirect URI)
- [ ] Skonfigurować Facebook OAuth2 (Facebook Developers: app ID + secret, redirect URI)
- [ ] Przetestować flow: frontend→backend GET /api/auth/google → redirect Google → callback → JWT → redirect frontend z tokenem

---

## FAZA 19 – Testy manualne i poprawki

- [ ] Przetestować pełny flow rejestracji (email + aktywacja)
- [ ] Przetestować logowanie (email/hasło)
- [ ] Przetestować tworzenie wydarzenia (z uploadem grafiki i lokalizacją)
- [ ] Przetestować listing wydarzeń
- [ ] Przetestować kartę wydarzenia
- [ ] Przetestować dołączanie do wydarzenia (3-etapowy flow)
- [ ] Przetestować autoakceptację (nie-nowy użytkownik)
- [ ] Przetestować badge NOWY i rangę aktywności
- [ ] Przetestować doładowanie portfela (Tpay sandbox)
- [ ] Przetestować opłatę za wydarzenie
- [ ] Przetestować zwrot (wypisanie >3h przed)
- [ ] Przetestować brak zwrotu (wypisanie ≤3h przed)
- [ ] Przetestować chat wydarzenia
- [ ] Przetestować dodawanie gości (max 2)
- [ ] Przetestować reprymendę i ban
- [ ] Przetestować panel organizatora
- [ ] Przetestować panel admina (dashboard, userzy, eventy, portfele, ustawienia)
- [ ] Przetestować galerię multimediów (upload, limit 10, usunięcie)
- [ ] Przetestować strony statyczne (FAQ, kontakt, regulamin, polityka)
- [ ] Przetestować powiadomienia email
- [ ] Przetestować powiadomienia push
- [ ] Przetestować PWA (instalacja, offline)
- [ ] Przetestować responsywność na mobile
- [ ] Przetestować dark mode
- [ ] Poprawić znalezione błędy

---

## FAZA 20 – Deploy

- [ ] Przygotować konfigurację produkcyjną backendu (env vars, CORS, rate limiting)
- [ ] Przygotować build frontendu: `pnpm frontend:build`
- [ ] Przygotować build backendu: `pnpm backend:build`
- [ ] Skonfigurować Cloudflare R2 bucket (CORS, public access)
- [ ] Skonfigurować Tpay (konto produkcyjne, notyfikacje)
- [ ] Skonfigurować domenę i SSL
- [ ] Deploy na serwer współdzielony
- [ ] Uruchomić migrację produkcyjną: `prisma migrate deploy`
- [ ] Uruchomić seed produkcyjny
- [ ] Zweryfikować działanie na produkcji
