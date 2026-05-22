# Komunikacja organizator-uczestnik - plan wdrozenia

## Cel

Organizator musi miec pelna mozliwosc kontaktu z kazdym zgloszonym/uczestnikiem (w tym weryfikacji nieznanych osob). Komunikacja jest kluczowa funkcja aplikacji - wspiera flow weryfikacyjny i nie generuje spamu emailowego.

---

## Decyzje projektowe

| Temat                        | Decyzja                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| Kontakt z uczestnikiem       | Przez `enrollment-slot-modal` -> akcja organizatora "Napisz wiadomosc" -> nawigacja do prywatnego chatu |
| Dostepnosc chatu             | Dla WSZYSTKICH statusow enrollment oprocz banned (PENDING, APPROVED, CONFIRMED, WITHDRAWN)              |
| CTA "Napisz do organizatora" | Istniejacy przycisk "Napisz" w sekcji organizatora na stronie wydarzenia - wystarczajacy                |
| Auto-wiadomosc powitalna     | Per organizator (profil), domyslny systemowy tekst, wylaczalna per event                                |
| Kolejka emaili               | NIE - domain-specific `PendingChatNotification` dla czatu, nie generyczna kolejka                       |
| Push notification            | Natychmiast przy przejsciu 0->1+ unread, cooldown 5 min                                                 |
| Email notification           | Opozniony 5 min, cron co 1 min sprawdza i wysyla jesli wciaz unread                                     |
| Badge "nowy"                 | "Nigdy nie mial CONFIRMED enrollment u tego organizatora"                                               |

---

## Stan obecny

| Mechanizm                                                               | Status                   |
| ----------------------------------------------------------------------- | ------------------------ |
| Private chat organizator-uczestnik (WebSocket + HTTP)                   | OK                       |
| Backend `validatePrivateChatAccess()` - organizator -> kazdy enrollment | OK                       |
| "Napisz wiadomosc" w enrollment-slot-modal                              | Tylko APPROVED/CONFIRMED |
| "Napisz" button na stronie wydarzenia (uczestnik -> organizator)        | OK                       |
| Komunikaty / announcements (mass broadcast)                             | OK                       |
| Czat grupowy                                                            | OK                       |
| Powiadomienia o prywatnych wiadomosciach (push/email)                   | BRAK                     |
| Tracking odczytu prywatnych wiadomosci                                  | BRAK                     |
| Auto-wiadomosc powitalna                                                | BRAK                     |
| Badge "nowy u organizatora"                                             | BRAK                     |
| Badge unread count                                                      | BRAK                     |

---

## Kolejnosc wdrazania

```
Etap 1 (chat dla PENDING)          -> niezalezny
Etap 2 (tracking odczytu)          -> niezalezny
Etap 3 (powiadomienia push+email)  -> WYMAGA etapu 2
Etap 4 (badge unread)              -> WYMAGA etapu 2
Etap 5 (badge "nowy")              -> niezalezny
Etap 6 (auto-wiadomosc powitalna)  -> WYMAGA etapu 3
```

**Rekomendowana kolejnosc: 1 -> 2 -> 3 -> 4 -> 5 -> 6**

---

## Etap 1: Przycisk "Napisz" dla wszystkich statusow

**Cel:** Organizator moze napisac do KAZDEGO uczestnika z poziomu enrollment-slot-modal.

**Backend:** Brak zmian - `validatePrivateChatAccess()` juz pozwala.

### Checklist

- [x] **F1.1** `enrollment-slot-modal.component.ts` - w `organizerActionGroups`, sekcja "Komunikacja": zmienic warunek z `if (isActive)` na `if (!isBanned)` dla akcji `chat`
- [x] **F1.2** Weryfikacja: otworzyc slot modal dla uczestnika w statusie PENDING -> akcja "Napisz wiadomosc" widoczna
- [x] **F1.3** Weryfikacja: otworzyc slot modal dla uczestnika WITHDRAWN (nie-banned) -> akcja "Napisz wiadomosc" widoczna
- [x] **F1.4** Weryfikacja: banned uczestnik -> akcja "Napisz wiadomosc" NIE widoczna
- [x] **F1.5** Build frontend

---

## Etap 2: Tracking odczytu prywatnych wiadomosci

**Cel:** Sledzenie kiedy uzytkownik ostatnio czytal dana prywatna konwersacje. Fundament pod powiadomienia (etap 3) i badge unread (etap 4).

### Checklist - Schema

- [x] **S2.1** Prisma: dodac model `PrivateChatReadReceipt`

  ```prisma
  model PrivateChatReadReceipt {
    id          String   @id @default(uuid())
    eventId     String
    userId      String
    otherUserId String
    lastReadAt  DateTime @default(now())

    @@unique([eventId, userId, otherUserId])
    @@index([userId, eventId])
  }
  ```

- [x] **S2.2** Relacje na `User` i `Event` (opcjonalnie - bez relacji jesli nie potrzeba cascade)
- [x] **S2.3** Migracja: `npx prisma migrate dev --name add_private_chat_read_receipt`
- [x] **S2.4** `npx prisma generate`

### Checklist - Backend

- [x] **B2.1** `ChatService.markConversationRead(eventId, userId, otherUserId)` - upsert `PrivateChatReadReceipt` z `lastReadAt = now()`
- [x] **B2.2** `ChatService.getUnreadCount(eventId, userId, otherUserId)` - count messages from `otherUserId` where `createdAt > lastReadAt` (null receipt = count all)
- [x] **B2.3** `ChatService.getUnreadCountsForUser(eventId, userId)` - bulk query: zwraca `Map<otherUserId, unreadCount>` (do listy konwersacji)
- [x] **B2.4** `ChatController` - `POST /events/:eventId/chat/private/:userId/read` -> wywoluje `markConversationRead`
- [ ] **B2.5** Unit testy `markConversationRead`, `getUnreadCount`
- [x] **B2.6** Build backend

### Checklist - Frontend

- [x] **F2.1** `ChatService` (Angular) - nowa metoda `markAsRead(eventId, otherUserId): Observable<void>`
- [x] **F2.2** `UnifiedChatComponent` - przy inicjalizacji prywatnego chatu wywolaj `markAsRead(eventId, otherUserId)`
- [x] **F2.3** `UnifiedChatComponent` - przy otrzymaniu nowej wiadomosci na otwartym chacie -> ponownie `markAsRead` (zeby nie triggerowac powiadomienia)
- [x] **F2.4** Build frontend

---

## Etap 3: Powiadomienia o prywatnych wiadomosciach (push + email)

**Cel:** Odbiorca prywatnej wiadomosci dostaje push natychmiast i email po 5 min (jesli nie przeczytal).

**Strategia anti-spam: "first-unread + delayed email"**

| Kanal | Kiedy       | Logika                                                             |
| ----- | ----------- | ------------------------------------------------------------------ |
| Push  | Natychmiast | 0->1+ unread w konwersacji, cooldown 5 min                         |
| Email | Po 5 min    | Cron sprawdza `PendingChatNotification`, wysyla jesli wciaz unread |

### Checklist - Schema

- [x] **S3.1** Prisma: dodac model `PendingChatNotification`

  ```prisma
  model PendingChatNotification {
    id          String    @id @default(uuid())
    eventId     String
    recipientId String
    senderId    String
    scheduledAt DateTime
    processedAt DateTime?
    cancelled   Boolean   @default(false)
    createdAt   DateTime  @default(now())

    @@index([processedAt, scheduledAt])
    @@index([recipientId, eventId, senderId])
  }
  ```

- [x] **S3.2** Migracja (razem z etapem 2 jesli realizowane lacznie): `npx prisma migrate dev --name add_pending_chat_notification`
- [x] **S3.3** `npx prisma generate`

### Checklist - Backend: nowe serwisy

- [x] **B3.1** Utworzyc `chat-notification.service.ts` w `modules/chat/`
- [x] **B3.2** `ChatNotificationService.onNewPrivateMessage(eventId, senderId, recipientId)`:
  1. Policz unread (z `ChatService.getUnreadCount`)
  2. Jesli unread === 1 (przejscie 0->1): push natychmiast + utworz `PendingChatNotification(scheduledAt = now + 5min)`
  3. Jesli unread > 1: nic (brak cooldown - push tylko przy 0->1)
- [x] **B3.3** `ChatNotificationService.cancelPendingForConversation(eventId, userId, otherUserId)`:
  - Ustaw `cancelled = true` na pending notifications gdzie `recipientId = userId AND senderId = otherUserId AND processedAt IS NULL`
- [x] **B3.4** Utworzyc `chat-notification.cron.ts` w `modules/chat/`
- [x] **B3.5** `ChatNotificationCron.processPendingNotifications()` - `@Cron(CronExpression.EVERY_MINUTE)`:
  1. Query: `processedAt IS NULL AND cancelled = false AND scheduledAt <= now()`
  2. Grupuj po `(recipientId, eventId)` (deduplikacja: 1 email per konwersacja)
  3. Dla kazdej grupy: sprawdz aktualny unread -> jesli > 0, wyslij email
  4. Oznacz `processedAt = now()`
- [ ] **B3.6** Zarejestrowac cron w `CronStatusService` (jesli istnieje monitorowanie cronow)

### Checklist - Backend: push + email

- [x] **B3.7** `PushService.notifyNewPrivateMessage(userId, senderName, eventTitle, eventId, chatUrl)` - nowa metoda
- [x] **B3.8** `EmailService.sendPrivateChatEmail(email, displayName, senderName, eventTitle, unreadCount, chatUrl)` - nowa metoda
- [x] **B3.9** Shared `libs/email/` - nowy komponent `PrivateChatEmail.tsx` ("Masz X nieprzeczytanych wiadomosci od Y w wydarzeniu Z")
- [x] **B3.10** Barrel export w `libs/email/`

### Checklist - Backend: integracja

- [x] **B3.11** `ChatGateway.handleSendPrivateMessage()` - po zapisaniu wiadomosci, fire-and-forget: `this.chatNotificationService.onNewPrivateMessage(...)` (try-catch, nie blokuje WebSocket response)
- [x] **B3.12** `ChatGateway` - pobrac senderName + eventTitle (join w query lub oddzielne query) do przekazania do notification service
- [x] **B3.13** `ChatService.markConversationRead()` - po upsert, wywolaj `chatNotificationService.cancelPendingForConversation(...)`
- [x] **B3.14** `ChatModule` - zarejestrowac `ChatNotificationService`, `ChatNotificationCron`, importy: `PushService`, `EmailService`

### Checklist - Testy

- [ ] **T3.1** Unit test: `ChatNotificationService.onNewPrivateMessage` - push przy 0->1 unread
- [ ] **T3.2** Unit test: cooldown - brak push gdy < 5 min od ostatniego
- [ ] **T3.3** Unit test: `cancelPendingForConversation` - ustawia cancelled
- [ ] **T3.4** Unit test: `ChatNotificationCron.processPendingNotifications` - wysyla email, pomija przeczytane
- [x] **T3.5** Build backend

---

## Etap 4: Badge unread count

**Cel:** Organizator widzi ile ma nieprzeczytanych wiadomosci - na liscie konwersacji, przy uczestnikach i na przycisku "Konwersacje".

### Checklist - Backend

- [x] **B4.1** `ChatService.getOrganizerConversations()` - dodac `unreadCount` per konwersacja (JOIN z `PrivateChatReadReceipt`)
- [x] **B4.2** `ChatController` - nowy endpoint: `GET /events/:eventId/chat/private/unread-summary` -> `{ totalUnread, conversations: [{ userId, unreadCount }] }`
- [ ] **B4.3** Unit test dla unread count w `getOrganizerConversations`

### Checklist - Frontend

- [x] **F4.1** Typ `OrganizerConversation` - dodac `unreadCount: number`
- [x] **F4.2** `ChatService` (Angular) - nowa metoda `getUnreadSummary(eventId): Observable<UnreadSummary>`
- [x] **F4.3** `HostChatComponent` - badge z liczba unread przy kazdej konwersacji na liscie
- [x] **F4.4** `OrganizerChatsOverlayComponent` - analogiczny badge
- [ ] **F4.5** `event-manage.component.ts` - w sekcji pending list: dot/badge przy uczestnikach z nieprzeczytanymi wiadomosciami (pominięte - wymaga większych zmian w enrollment grid)
- [ ] **F4.6** `event-detail.component.html` - badge na przycisku "Konwersacje" z laczna liczba unread (pominięte - wymaga integracji z event detail)
- [x] **F4.7** Build frontend

---

## Etap 5: Badge "nowy u organizatora"

**Cel:** Organizator widzi, czy zglaszajacy sie uczestnik kiedykolwiek uczestniczyl w jego wydarzeniu.

**Definicja:** Uzytkownik bez zadnego CONFIRMED enrollment w dowolnym innym wydarzeniu tego organizatora.

### Checklist - Backend

- [x] **B5.1** `EnrollmentEligibilityService` - nowa metoda `isNewToOrganizer(userId, organizerId): Promise<boolean>`: sprawdz `eventEnrollment.findFirst({ userId, event: { organizerId }, slot: { confirmed: true } })`
- [x] **B5.2** `EnrollmentService` / endpoint `getParticipants()` - dodac `isNewToOrganizer: boolean` do response. Optymalizacja: jedno `groupBy` query dla wszystkich uczestnikow zamiast N zapytan
- [ ] **B5.3** Unit test

### Checklist - Frontend

- [x] **F5.1** `EnrollmentItem` typ - dodac `isNewToOrganizer?: boolean`
- [x] **F5.2** `user-profile-card` - badge "Nowy" jako `app-status-indicator` (typ `new_to_organizer` w shared, input `isNewToOrganizer`, dodany do `_allStatusBadges`)
- [x] **F5.3** `event-manage.component.ts` - badge "Nowy" w sekcji pending list obok nazwy
- [x] **F5.4** Build frontend

---

## Etap 6: Auto-wiadomosc powitalna

**Cel:** Organizator moze ustawic automatyczna wiadomosc wysylana do kazdego nowego uczestnika po zgloszeniu.

**Konfiguracja:** Per organizator (profil) z mozliwoscia wylaczenia per event.

**Domyslny tekst:**

> "Czesc! Dziekuje za zgloszenie na moje wydarzenie. Jesli sie nie znamy - przedstaw sie prosze w kilku slowach, zebym wiedzial kogo moge sie spodziewac. Do zobaczenia!"

### Checklist - Schema

- [x] **S6.1** Prisma: dodac na modelu `User`:
  - `welcomeMessage String?`
  - `welcomeMessageEnabled Boolean @default(true)`
- [x] **S6.2** Prisma: dodac na modelu `Event`:
  - `welcomeMessageEnabled Boolean @default(true)`
- [x] **S6.3** Migracja: `npx prisma migrate dev --name add_welcome_message_fields`
- [x] **S6.4** `npx prisma generate`

### Checklist - Shared

- [x] **L6.1** `libs/src/lib/constants/welcome-message.constants.ts` - `DEFAULT_WELCOME_MESSAGE`
- [x] **L6.2** Barrel export w `libs/src/lib/constants/index.ts`

### Checklist - Backend

- [x] **B6.1** `EnrollmentService.join()` - po utworzeniu enrollment:
  1. Pobierz organizatora z `welcomeMessageEnabled` i `welcomeMessage`
  2. Pobierz event z `welcomeMessageEnabled`
  3. Jesli oba enabled -> `ChatService.createPrivateMessage(eventId, organizerId, userId, text)` z tekstem `welcomeMessage ?? DEFAULT_WELCOME_MESSAGE`
  4. Fire-and-forget (try-catch, nie blokuje join flow)
  5. Powitalka automatycznie triggeruje powiadomienia z etapu 3
- [x] **B6.2** `UsersController` / `UsersService` - endpoint `PATCH /users/me/organizer-settings` (lub rozszerzenie istniejacego profil update): obsluga `welcomeMessage` i `welcomeMessageEnabled`
- [x] **B6.3** `CreateEventDto` / `UpdateEventDto` - dodac `welcomeMessageEnabled?: boolean` (default `true`)
- [x] **B6.4** `EventsService.create()` / `update()` - obsluga nowego pola
- [ ] **B6.5** Unit test: join -> welcome message sent (mock ChatService)
- [ ] **B6.6** Unit test: join -> welcome disabled on event -> no message
- [x] **B6.7** Build backend

### Checklist - Frontend

- [x] **F6.1** Profil organizatora / panel organizatora - sekcja "Wiadomosc powitalna":
  - Toggle wlacz/wylacz
  - Textarea z custom tekstem (placeholder = domyslny tekst systemowy)
  - Hint wyjasniajacy dzialanie
- [x] **F6.2** Formularz wydarzenia (`event-form`) - checkbox "Wyslij auto-wiadomosc powitalna do nowych uczestnikow" (domyslnie zaznaczony)
- [x] **F6.3** Typy: dodac `welcomeMessageEnabled` do `Event` interface
- [x] **F6.4** Build frontend

---

## Diagram przeplywu powiadomien

```
Nadawca wysyla wiadomosc (WebSocket)
|
+- ChatGateway.handleSendPrivateMessage()
|  +- ChatService.createPrivateMessage() -> DB
|  +- emit('newPrivateMessage') -> WebSocket do pokoju
|  +- ChatNotificationService.onNewPrivateMessage() [fire-and-forget]
|     |
|     +- unread === 1 (przejscie 0->1)?
|     |  +- TAK -> push natychmiast + PendingChatNotification (scheduledAt +5 min)
|     |  +- NIE -> cooldown check
|     |     +- < 5 min od ostatniego push -> nic
|     |     +- >= 5 min -> push natychmiast
|     |
|     +- (email -> cron)
|
ChatNotificationCron (co 1 min)
|
+- Query: scheduledAt <= now, processedAt IS NULL, cancelled = false
+- Grupuj po (recipientId, eventId)
+- Sprawdz unread count
|  +- > 0 -> wyslij 1 email podsumowujacy
|  +- = 0 -> skip
+- Oznacz processedAt = now()

Odbiorca otwiera czat
|
+- markConversationRead() -> upsert PrivateChatReadReceipt
+- cancelPendingForConversation() -> cancelled = true
```

---

## Podsumowanie zmian w plikach

| Warstwa      | Nowe pliki                                                  | Modyfikowane pliki                                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma**   | 2 migracje                                                  | `schema.prisma`                                                                                                                                                                                                                                    |
| **Backend**  | `chat-notification.service.ts`, `chat-notification.cron.ts` | `chat.service.ts`, `chat.gateway.ts`, `chat.controller.ts`, `chat.module.ts`, `push.service.ts`, `email.service.tsx`, `enrollment.service.ts`, `enrollment-eligibility.service.ts`, `events.service.ts`, `users.service.ts`, `users.controller.ts` |
| **Shared**   | `welcome-message.constants.ts`, `PrivateChatEmail.tsx`      | `libs/email/index`, `libs/constants/index`                                                                                                                                                                                                         |
| **Frontend** | -                                                           | `enrollment-slot-modal.component.ts`, `host-chat.component.ts`, `unified-chat.component.ts`, `chat.service.ts`, `event-manage.component.ts`, `event-detail.component.html`, `event.interface.ts`, `event-form.component.ts`, profil organizatora   |
