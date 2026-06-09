# Zestawienie systemu powiadomień

## Architektura kanałów

### Kanały dostarczania

1. **In-app (WebSocket)** - natychmiastowe powiadomienia w aplikacji
2. **Web Push** - powiadomienia przeglądarkowe (delay 5 min)
3. **Email** - dwie strategie:
   - **Transactional** - pojedyncze, ważne e-maile (delay 60 min)
   - **Digest** - podsumowanie wielu powiadomień (co 15 min)
4. **Chat** - system messages w czacie grupowym

### Stałe czasowe (notification-policy.ts)

- `PUSH_DELAY_MINUTES: 5` - push po 5 minutach od utworzenia
- `EMAIL_DELAY_MINUTES: 60` - transactional email po 60 minutach
- `EMAIL_DIGEST_CRON_MINUTES: 15` - digest email co 15 minut
- `EMAIL_STALE_HOURS: 24` - email uznany za "stary" po 24h
- `DEBOUNCE_WINDOW_MINUTES: 10` - debounce dla grupowania powiadomień
- `READ_RETENTION_DAYS: 7` - retention przeczytanych powiadomień
- `UNREAD_RETENTION_DAYS: 30` - retention nieprzeczytanych powiadomień

---

## Typy powiadomień (NotificationKind)

### 1. NEW_CHAT_MESSAGE

- **Temat:** Nowa wiadomość w czacie grupowym wydarzenia
- **Kanały:** In-app, Push, Email (Digest)
- **Group key:** `chat:{eventId}`
- **Relevance:** 30 dni
- **Wyzwalacz:** `ChatNotificationService.onNewGroupMessage()`
- **Częstotliwość:** Każda nowa wiadomość (dla nieaktywnych użytkowników)

### 2. NEW_PRIVATE_MESSAGE

- **Temat:** Nowa prywatna wiadomość od organizatora/uczestnika
- **Kanały:** In-app, Push, Email (Digest)
- **Group key:** `pm:{eventId}:{senderId}`
- **Relevance:** 30 dni
- **Wyzwalacz:** `ChatNotificationService.onNewPrivateMessage()`
- **Częstotliwość:** Każda nowa wiadomość (dla nieaktywnych odbiorców)

### 3. NEW_APPLICATION

- **Temat:** Nowe zgłoszenie do wydarzenia
- **Odbiorca:** Organizator
- **Kanały:** In-app, Push, Email (Digest)
- **Group key:** `app:{eventId}`
- **Relevance:** 14 dni
- **Wyzwalacz:** `EnrollmentService.join()`, `joinGuest()`
- **Częstotliwość:** Każde nowe zgłoszenie

### 4. NEW_EVENT_IN_CITY

- **Temat:** Nowe wydarzenie w obserwowanym mieście
- **Kanały:** In-app, Push, Email (Digest)
- **Group key:** `city:{cityId}:{date}`
- **Relevance:** 7 dni
- **Wyzwalacz:** Użytkownik subskrybuje miasto
- **Częstotliwość:** Każde nowe wydarzenie w mieście

### 5. EVENT_REMINDER

- **Temat:** Przypomnienie o nadchodzącym wydarzeniu
- **Kanały:** In-app, Push, Email (Transactional)
- **Group key:** `reminder:{eventId}`
- **Relevance:** Do 1h po rozpoczęciu wydarzenia
- **Wyzwalacz:** `EventReminderCron` (cron)
- **Częstotliwość:** 24h przed, 2h przed

### 6. EVENT_CANCELLED

- **Temat:** Anulowanie wydarzenia
- **Kanały:** In-app, Push, Email (Transactional)
- **Group key:** Brak
- **Relevance:** 14 dni
- **Wyzwalacz:** `EventsService.cancel()`
- **Częstotliwość:** Jednorazowo przy anulowaniu

### 7. PARTICIPATION_STATUS

- **Temat:** Zmiana statusu uczestnictwa
- **Podtypy:**
  - `SLOT_ASSIGNED` - przydzielono miejsce
  - `APPROVAL_REMINDER` - przypomnienie o potwierdzeniu
  - `CONFIRMED` - uczestnictwo potwierdzone
  - `REMOVED` - usunięto z wydarzenia
  - `SPOT_AVAILABLE` - wolne miejsce
  - `LOTTERY_NOT_SELECTED` - nie wylosowany w loterii
  - `REJECTED` - zgłoszenie odrzucone
- **Kanały:** In-app, Push, Email (Transactional - tylko niektóre statusy)
- **Group key:** Brak
- **Relevance:** 14 dni
- **Wyzwalacz:** `EnrollmentService` (approve, confirm, reject, leave), `EnrollmentLotteryCron`
- **Częstotliwość:** Przy każdej zmianie statusu

### 8. PAYMENT_CANCELLED

- **Temat:** Anulowanie płatności
- **Kanały:** In-app, Push, Email (Transactional)
- **Group key:** Brak
- **Relevance:** Bez limitu
- **Wyzwalacz:** `EventsService.cancelPayment()`
- **Częstotliwość:** Jednorazowo przy anulowaniu

### 9. REPRIMAND

- **Temat:** Reprymenda od organizatora
- **Kanały:** In-app, Push, Email (Transactional)
- **Group key:** Brak
- **Relevance:** 30 dni
- **Wyzwalacz:** `ModerationService.reprimandUser()`
- **Częstotliwość:** Każda reprymenda

### 10. ANNOUNCEMENT

- **Temat:** Komunikat organizatora
- **Kanały:** In-app, Push, Email (Transactional), Chat (system message)
- **Group key:** `announce:{eventId}`
- **Relevance:** 14 dni
- **Wyzwalacz:** `AnnouncementDispatcherService.createAndDispatch()`
- **Częstotliwość:** Każdy komunikat (CRITICAL/ORGANIZATIONAL/INFORMATIONAL)

### 11. REAL_USER_JOINED_FAKE_EVENT

- **Temat:** Rzeczywisty użytkownik dołączył do wydarzenia z target occupancy
- **Odbiorca:** Admin
- **Kanały:** In-app, Push, Email (Digest)
- **Group key:** `fake-join:{eventId}`
- **Relevance:** Do 1h po rozpoczęciu wydarzenia
- **Wyzwalacz:** `EnrollmentService.join()` (dla FAKE events)
- **Częstotliwość:** Każde dołączenie realnego użytkownika

---

## Cron jobs

### event-reminder.cron

- **Harmonogram:** `EVERY_30_MINUTES`
- **Funkcja:** Wysyła przypomnienia 24h i 2h przed wydarzeniem
- **Kanały:** Push + Email (sendEventReminderEmail)
- **Cel:** Uczestnicy z przydzielonym slotem (wantsIn=true, slot!=null)

### approval-reminder.cron

- **Harmonogram:** `EVERY_30_MINUTES`
- **Funkcja:** Przypomina o potwierdzeniu uczestnictwa po 24h od przydzielenia slotu
- **Kanały:** Push + Email (sendParticipationStatusEmail z APPROVAL_REMINDER)
- **Cel:** Uczestnicy z niepotwierdzonym slotem (confirmed=false, assignedAt >= 24h)

### notification-escalation.cron

- **Harmonogram:** `EVERY_MINUTE`
- **Funkcja:** Escalacja powiadomień do push/email po delay
- **Kanały:**
  - Push: po 5 min (PUSH_DELAY_MINUTES)
  - Transactional Email: po 60 min (EMAIL_DELAY_MINUTES)
- **Cel:** Wszystkie nieprzeczytane powiadomienia z policy.allowPush/allowEmail

### notification-email-digest.cron

- **Harmonogram:** `*/15 * * * *` (co 15 minut)
- **Funkcja:** Wysyła digest email dla powiadomień typu DIGEST
- **Kanały:** Email (sendDigest)
- **Cel:** Użytkownicy z pending powiadomieniami DIGEST (NEW_CHAT_MESSAGE, NEW_PRIVATE_MESSAGE, NEW_APPLICATION, NEW_EVENT_IN_CITY, REAL_USER_JOINED_FAKE_EVENT)

### enrollment-lottery.cron

- **Harmonogram:** `EVERY_MINUTE`
- **Funkcja:** Wykonuje loterię uczestnictwa 48h przed wydarzeniem
- **Kanały:** Push (notifyParticipationStatus)
- **Cel:** Events z lotteryExecutedAt=null i startsAt <= 48h
- **Powiadomienia:** SLOT_ASSIGNED dla wylosowanych, LOTTERY_NOT_SELECTED dla reszty

### notification-cleanup.cron

- **Harmonogram:** `0 3 * * *` (codziennie o 3:00)
- **Funkcja:** Usuwa przeterminowane powiadomienia
- **Cel:** Powiadomienia z deleteAfter < NOW

### organizer-digest.cron

- **Harmonogram:** `0 8 * * *` (codziennie o 8:00, strefa Europe/Warsaw)
- **Funkcja:** Tygodniowy digest dla organizatorów
- **Kanały:** Email (sendOrganizerWeeklyDigest)
- **Cel:** Organizatorzy z aktywnymi wydarzeniami (raz na tydzień)
- **Zawartość:** pending confirmations, upcoming events, recently created/ended/cancelled, active series

---

## E-maile (EmailService)

### Autoryzacja i konto

- **sendActivationEmail** - aktywacja konta (token w linku)
- **sendPasswordResetEmail** - reset hasła (token w linku)

### Wydarzenia i uczestnictwo

- **sendParticipationStatusEmail** - status uczestnictwa (SLOT_ASSIGNED, APPROVAL_REMINDER, CONFIRMED, REMOVED, REJECTED)
- **sendEventCancelledEmail** - anulowanie wydarzenia
- **sendEventReminderEmail** - przypomnienie o wydarzeniu (24h/2h przed)
- **sendNewApplicationEmail** - nowe zgłoszenie (dla organizatora)

### Płatności

- **sendPaymentConfirmationEmail** - potwierdzenie płatności
- **sendRefundConfirmationEmail** - potwierdzenie zwrotu

### Komunikaty i moderacja

- **sendAnnouncementEmail** - komunikat organizatora (z linkiem potwierdzenia)
- **sendReprimandEmail** - reprymenda

### Czat

- **sendPrivateChatEmail** - prywatna wiadomość w czacie

### Digesty i raporty

- **sendDigest** - digest powiadomień (dla użytkownika)
- **sendOrganizerWeeklyDigest** - tygodniowy digest dla organizatora
- **sendAdminDailyReport** - dzienny raport dla admina (status cronów, statystyki)

### Kontakt

- **sendContactEmail** - wiadomość kontaktowa od użytkownika (do admina)

---

## Strategie email (EmailMode)

### TRANSACTIONAL

Ważne, pojedyncze e-maile wysyłane po 60 min:

- EVENT_REMINDER
- EVENT_CANCELLED
- PARTICIPATION_STATUS (tylko niektóre statusy)
- PAYMENT_CANCELLED
- REPRIMAND
- ANNOUNCEMENT

### DIGEST

Podsumowania wysyłane co 15 min:

- NEW_CHAT_MESSAGE
- NEW_PRIVATE_MESSAGE
- NEW_APPLICATION
- NEW_EVENT_IN_CITY
- REAL_USER_JOINED_FAKE_EVENT

### NONE

Brak e-maila (tylko in-app + push):

- (aktualnie wszystkie typy mają allowEmail=true)

---

## Debounce i grupowanie

Powiadomienia z `groupKey` są grupowane w oknie 10 minut:

- `NEW_CHAT_MESSAGE` - grupowane po eventId
- `NEW_PRIVATE_MESSAGE` - grupowane po eventId + senderId
- `NEW_APPLICATION` - grupowane po eventId
- `NEW_EVENT_IN_CITY` - grupowane po cityId + data
- `EVENT_REMINDER` - grupowane po eventId
- `ANNOUNCEMENT` - grupowane po eventId

Przy aktualizacji powiadomienia w grupie:

- Zwiększa się `aggregateCount`
- Resetuje się `pushSentAt` i `emailSentAt` (ponowna escalacja)
- Odświeża się `relevanceUntil`

---

## Specjalne przypadki

### GUEST users

- Dla GUEST users powiadomienia są wysyłane do hosta (addedBy)
- Dotyczy: przypomnienia o wydarzeniu, przypomnienie o potwierdzeniu, komunikaty organizatora
- Email i push idą do realnego użytkownika, który dodał gościa

### FAKE users

- Wszystkie powiadomienia są pomijane dla FAKE users
- Wyjątek: REAL_USER_JOINED_FAKE_EVENT (dla admina)

### Feature flags

- `enableEmails` - globalnie wyłącza wysyłanie e-maili (poza override account)
- `isOverrideAccount` - konto donbartezzo@gmail.com zawsze otrzymuje e-maile

### WebSocket

- Natychmiastowa emisja powiadomienia do użytkownika
- Licznik nieprzeczytanych emitowany przy każdej zmianie
- Context-aware read: `markByGroupKey()` dla czatów

---

## Schemat przepływu powiadomienia

1. **Wyzwalacz** (service/cron) → `PushService.notify*()`
2. **Zapis do DB** → `NotificationsService.create()` (in-app notification)
3. **WebSocket emit** → `UserNotificationGateway.emitToUser()` (natychmiast)
4. **Escalation cron** (co 1 min):
   - Po 5 min → `PushDeliveryService.sendWebPush()` (jeśli allowPush)
   - Po 60 min → `EmailService.sendTransactionalForNotification()` (jeśli emailMode=TRANSACTIONAL)
5. **Digest cron** (co 15 min):
   - Group pending DIGEST notifications per user
   - `EmailService.sendDigest()` (max 50 items per user)
6. **Cleanup cron** (codziennie 3:00):
   - Usuwa powiadomienia z deleteAfter < NOW
