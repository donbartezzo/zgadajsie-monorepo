# Plan wdrożenia — refaktor i naprawa systemu powiadomień

> Dokument roboczy. Oznaczaj ukończone etapy checkboxami.

## Decyzje projektowe (ustalone przed implementacją)

| Punkt                    | Decyzja                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| Usuwanie powiadomień     | Hard delete (fizyczne usunięcie z bazy)                                     |
| Real-time lista          | Nowe powiadomienie wpada na górę listy natychmiast                          |
| Kafelek powiadomień      | Klikalny całością + 3 osobne ikony akcji                                    |
| Chat presence            | In-memory via natywne pokoje Socket.IO (`user-in-event:{eventId}:{userId}`) |
| NEW_EVENT_IN_CITY format | `"Nowe wydarzenie (Warszawa): Tytuł eventu"` w title                        |
| Info o retencji          | Ikona `(i)` przy nagłówku strony z tooltipem                                |
| Pilna akcja              | APPROVED status; architektura rozszerzalna                                  |

---

## Faza 1 — Backend: naprawa bugów (brak zmian schematu)

### 1.1 Fix debounce + eskalacja — spójne okno `updatedAt` zamiast `createdAt`

> **WAŻNE:** Ten punkt MUSI obejmować zarówno debounce, jak i oba crony eskalacji.
> Zmiana samego okna debounce (bez cronów) wprowadza regresję spamu push (patrz „Dlaczego" niżej).

**Plik A:** `backend/src/modules/notifications/notifications.service.ts` (metoda `create()`)

- [x] Zmienić warunek debounce z `createdAt: { gte: windowStart }` na `updatedAt: { gte: windowStart }`
- [x] Zmienić `orderBy` z `{ createdAt: 'desc' }` na `{ updatedAt: 'desc' }`
- [x] (Opcjonalnie) usunąć ręczne `updatedAt: new Date()` w bloku update — Prisma `@updatedAt` ustawia to automatycznie

**Plik B:** `backend/src/modules/notifications/notification-escalation.cron.ts`

- [x] W `escalatePush()` — zmienić warunek `createdAt: { lte: cutoff }` na `updatedAt: { lte: cutoff }`
- [x] W `escalateTransactionalEmail()` — analogicznie `createdAt: { lte: cutoff }` → `updatedAt: { lte: cutoff }`

**Plik C:** `backend/src/modules/notifications/notification-email-digest.cron.ts`

- [x] W `$queryRaw` (SELECT DISTINCT) — zmienić `"createdAt" < ${cutoff}` na `"updatedAt" < ${cutoff}`
- [x] W `findMany` — zmienić `createdAt: { lt: cutoff }` na `updatedAt: { lt: cutoff }`

**Testy:**

- [ ] Zaktualizować `notifications.service.spec.ts` — scenariusz: powiadomienie z `createdAt` >10 min temu, ale `updatedAt` <10 min temu → agreguje (`aggregateCount++`), nie tworzy nowego
- [ ] Dodać/zweryfikować test cronów eskalacji: świeżo zagregowane powiadomienie (`updatedAt` = teraz) NIE jest eskalowane do push/email; eskaluje dopiero po `X` min ciszy

**Dlaczego:** Obecny kod debounce sprawdza `createdAt >= teraz-10min`. Agregacja ustawia tylko `updatedAt`, nie `createdAt`. Po 10 min od _pierwszej_ wiadomości okno wygasa mimo że konwersacja trwa — każda kolejna wiadomość tworzy nowy rekord zamiast inkrementować `aggregateCount`.

Crony eskalacji odpytują jednak po `createdAt: { lte: cutoff }`, a debounce przy agregacji resetuje `pushSentAt=null`/`emailSentAt=null` z intencją „poczekaj kolejne X min". Ponieważ `createdAt` się nie zmienia, reset nie wymusza czekania — powoduje natychmiastową ponowną kwalifikację. Skutek przy samej zmianie okna debounce: aktywna rozmowa trzymana w jednym rekordzie → push wysyłany ~co minutę (każda wiadomość resetuje `pushSentAt`, kolejny tick crona ponownie wysyła).

Po przejściu cronów na `updatedAt` semantyka jest poprawna i spójna: eskaluj push/email dopiero po `X` min ciszy na danym powiadomieniu (debounce-then-notify). Dla powiadomień bez `groupKey` (nieagregowanych) `updatedAt == createdAt` przy tworzeniu, więc zachowanie się nie zmienia.

**Świadomy trade-off:** użytkownik _offline_ w bardzo aktywnej rozmowie (wiadomości częściej niż co `PUSH_DELAY_MINUTES`) nie dostanie push dopóki nie nastąpi cisza — `updatedAt` ciągle się odświeża. To akceptowalne (push to kanał dla offline, a in-app/WS i tak działa), ale jeśli chcemy gwarancji „push najpóźniej po N min", można dodać warunek OR z twardym capem na `createdAt` (np. `OR: [{ updatedAt: { lte: cutoff } }, { createdAt: { lte: hardCap } }]`). Domyślnie **pomijamy cap** — do decyzji jeśli pojawi się realna potrzeba.

---

### 1.2 Fix CONFIRMED — brakujące in-app powiadomienie

**Plik:** `backend/src/modules/enrollment/enrollment.service.ts`, metoda `confirmSlot()` (~linia 531)

- [x] Po `await this.slotService.confirmSlot(participationId)` dodać wywołanie:
  ```typescript
  this.pushService
    .notifyParticipationStatus(
      participation.userId,
      participation.event.title,
      'CONFIRMED',
      participation.eventId,
    )
    .catch((err) => this.logger.error(`Failed to send CONFIRMED notification: ${err}`));
  ```
  _(Obiekt `participation` z `include: { event: true }` jest już dostępny — nie wymaga dodatkowego zapytania.)_
- [x] Zweryfikować że email nadal jest wysyłany (istniejący kod w bloku `if (updated?.user && updated.event)`) — nie ruszać

**Uwaga:** Na liście wywołań `notifyParticipationStatus` (~linia 1573) istnieje błędne wywołanie w admin-reject flow — 4. argument to string komunikatu zamiast `eventId`. To osobny bug; oznaczyć TODO ale nie naprawiać w tym PR (zmiana zakresu).

---

### 1.3 Fix NEW_APPLICATION — link do `/manage` zamiast szczegółów

**Plik:** `backend/src/modules/notifications/push.service.ts`, metoda `notifyNewApplication()`

- [x] Dodać prywatną metodę `getManageUrl(eventId)`:
  ```typescript
  private async getManageUrl(eventId: string): Promise<string> {
    return `/o/w/${eventId}/manage`;
  }
  ```
- [x] Zmienić `notifyNewApplication()` — zastąpić `await this.getEventUrl(eventId)` wywołaniem `await this.getManageUrl(eventId)`

---

### 1.4 Fix NEW_EVENT_IN_CITY — dodanie nazwy miasta

**Plik:** `backend/src/modules/notifications/push.service.ts`, metoda `notifyNewEventInCity()`

> **Podejście:** pobrać `city.name` wewnątrz `push.service` zamiast przekazywać przez sygnaturę.
> Metoda i tak robi już lookup eventu (`getEventUrl`), więc rozszerzamy `select` i unikamy zmiany
> sygnatury oraz dotykania obu callerów. Caller `events.service.ts:148` przekazuje zresztą
> `event.city.slug` w argumencie nazwanym `cityId` (istniejąca niespójność nazewnicza) — nie ma
> tam gotowej nazwy miasta, więc threading przez parametr byłby i tak uciążliwy.

- [x] W `notifyNewEventInCity()` zastąpić wywołanie `getEventUrl(eventId)` jednym lookupem, który
      pobiera i `city.slug` (do URL), i `city.name` (do tytułu):
  ```typescript
  const event = await this.prisma.event.findUnique({
    where: { id: eventId },
    select: { city: { select: { slug: true, name: true } } },
  });
  const url = event ? `/w/${event.city.slug}/${eventId}` : '/';
  const cityName = event?.city.name ?? '';
  ```
- [x] Zmienić title na: `` `Nowe wydarzenie (${cityName}): ${eventTitle}` `` (gdy `cityName` puste — fallback `Nowe wydarzenie: ${eventTitle}`)
- [x] `body` zostawić jako sam `eventTitle` lub pusty — do oceny przy implementacji (tytuł jest samowystarczalny)
- [x] Zweryfikować nazwę pola w modelu `City` (`name` vs inne) w `schema.prisma` przed implementacją
- [x] Callery (`events.service.ts:148`, `event-series.service.ts:428`) — **bez zmian**

---

## Faza 2 — Backend: system notyfikacji czatu grupowego

### 2.1 Presence tracking w ChatGateway

**Plik:** `backend/src/modules/chat/chat.gateway.ts`

- [x] W `handleJoinRoom` — po `client.join('event-{eventId}')` dodać:
  ```typescript
  const userId = client.handshake.auth?.userId;
  if (userId) {
    client.join(`user-in-event:${data.eventId}:${userId}`);
  }
  ```
- [x] W `handleLeaveRoom` — analogicznie `client.leave('user-in-event:...')`
- [x] Dodać publiczną metodę sprawdzania obecności:
  ```typescript
  isUserInGroupChat(eventId: string, userId: string): boolean {
    const room = `user-in-event:${eventId}:${userId}`;
    return (this.server.sockets.adapter.rooms.get(room)?.size ?? 0) > 0;
  }
  ```
- [x] Analogicznie dla prywatnego czatu — `joinPrivateRoom` / `leavePrivateRoom`:
  ```typescript
  client.join(`user-in-private:${eventId}:${userId}`);
  ```
  ```typescript
  isUserInPrivateChat(eventId: string, userId: string): boolean {
    const room = `user-in-private:${eventId}:${userId}`;
    return (this.server.sockets.adapter.rooms.get(room)?.size ?? 0) > 0;
  }
  ```
  _(Dla prywatnego czatu wystarczy sprawdzić obecność recipienta, nie potrzeba znać roomName pary.)_
- [x] Uwaga: `handleDisconnect` nie wymaga zmian — Socket.IO usuwa sockety ze wszystkich pokojów automatycznie. Multi-tab działa poprawnie: room size odpowiada liczbie aktywnych socketów danego usera.

---

### 2.2 Notyfikacje grupowego czatu (NEW_CHAT_MESSAGE)

**Plik:** `backend/src/modules/chat/chat.gateway.ts`, metoda `handleSendMessage()`

- [x] Po `this.server.to(...).emit('newMessage', message)` dodać fire-and-forget:
  ```typescript
  setImmediate(() => {
    this.chatNotificationService
      .onNewGroupMessage(data.eventId, data.userId, message)
      .catch((err) => this.logger.error(`Failed to send group chat notification: ${err.message}`));
  });
  ```

**Plik:** `backend/src/modules/chat/chat-notification.service.ts`

- [x] Wstrzyknąć `ChatGateway` (przez `forwardRef` aby uniknąć circular dependency — analogicznie jak `ChatService` wstrzykuje `ChatNotificationService`)
- [x] Dodać metodę `onNewGroupMessage(eventId, senderId, message)`:
  1. Pobrać **raz** dane eventu potrzebne do powiadomień (tytuł + `city.slug` do URL) — nie per recipient
  2. `senderName` wziąć z `message.user.displayName` (już dołączone przez `USER_SELECT`)
  3. Pobrać listę uczestników eventu (`wantsIn=true`) + organizer, wykluczyć `senderId`
  4. Dla każdego recipienta sprawdzić `chatGateway.isUserInGroupChat(eventId, recipientId)` — pominąć jeśli `true`
  5. Wysłać powiadomienia do pozostałych

**Wydajność (decyzja: bez twardego limitu użytkowników):** nie wprowadzamy cap na liczbę odbiorców
(silent-drop powiadomień to zła UX). Zamiast tego:

- [x] zrównoleglić wysyłkę przez `Promise.allSettled` (zamiast sekwencyjnego `await` w pętli)
- [x] unikać powtarzania tego samego lookupu eventu/URL per recipient (rozwiązać raz, przekazać dalej) —
      może wymagać lekkiego refaktoru `notifyNewChatMessage`/`notifyUser`, by przyjmowały gotowy URL
- [x] całość pozostaje fire-and-forget (`setImmediate` z 2.2), więc nie blokuje wysłania wiadomości

---

### 2.3 NEW_PRIVATE_MESSAGE — presence + weryfikacja URL

**Plik:** `backend/src/modules/chat/chat-notification.service.ts`, metoda `sendPushNotification()`

> **Ustalenie po analizie tras:** trasa `host-chat/:userId` (app.routes.ts:138) ładuje
> `UnifiedChatComponent` z `isPrivate: true` i jest chroniona `verifiedUserGuard` (NIE
> `chatAccessGuard`). Dostęp do treści waliduje backend (`validatePrivateChatAccess`,
> dozwolone organizer↔participant). Parametr `:userId` to zawsze „druga strona" konwersacji,
> więc URL `host-chat/{senderId}` działa poprawnie w obie strony: odbiorca otwiera czat z osobą
> o id = sender. Pierwotna obawa o blokadę guardem była nietrafna — pełne przepisanie URL nie
> jest konieczne.

- [x] **Główny task — presence (FIX po code-review):** flow prywatny pierwotnie NIE sprawdzał
      obecności (`isUserInPrivateChat` istniało, ale nie było wołane — stąd powiadomienia mimo
      otwartego czatu). Naprawione spójnie z czatem grupowym: `handleSendPrivateMessage` liczy
      `recipientActive` przez `fetchSockets()` na pokoju konwersacji i przekazuje do
      `onNewPrivateMessage(..., recipientActive)`, które pomija wysyłkę gdy `true`. Bez `forwardRef`
      (presence liczona w gateway, nie w serwisie).
- [ ] **Drobna weryfikacja UX (opcjonalnie):** uczestnik ma też dedykowaną ścieżkę `host-chat`
      (bez `:userId`, „Czat z organizatorem"). Deep-link z powiadomienia prowadzi do
      `host-chat/{organizerId}` (widok unified) — funkcjonalnie OK, ale przy okazji sprawdzić czy
      to pożądany UX dla uczestnika, czy lepszy byłby `host-chat`. Jeśli wymaga rozróżnienia po roli
      odbiorcy — doprecyzować; domyślnie zostawiamy obecny wzorzec.

---

## Faza 3 — Backend: usuwanie powiadomień

### 3.1 Metody serwisu

**Plik:** `backend/src/modules/notifications/notifications.service.ts`

- [x] Dodać metodę `deleteOne(id: string, userId: string)`:
  ```typescript
  async deleteOne(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }
  ```
- [x] Dodać metodę `deleteAll(userId: string)`:
  ```typescript
  async deleteAll(userId: string) {
    return this.prisma.notification.deleteMany({ where: { userId } });
  }
  ```

### 3.2 Endpointy kontrolera

**Plik:** `backend/src/modules/notifications/notifications.controller.ts`

- [x] Dodać import `Delete` z `@nestjs/common`
- [x] Dodać endpoint `DELETE /notifications/:id`:
  ```typescript
  @Delete(':id')
  deleteOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteOne(id, user.id);
  }
  ```
- [x] Dodać endpoint `DELETE /notifications`:
  ```typescript
  @Delete()
  deleteAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAll(user.id);
  }
  ```

---

## Faza 4 — Frontend: real-time lista powiadomień

> **Wybór architektury (po analizie):** odrzucamy pełny refaktor strony na współdzielony
> `computed` nad `notificationCache` (Map). Powody: cache jest `providedIn: 'root'` i żyje między
> nawigacjami (ryzyko pokazania nieaktualnych/usuniętych retencją pozycji), miesza historię
> paginowaną z live, komplikuje `total`/`hasMore`. Zamiast tego — **podejście lekkie**: strona
> trzyma własną listę (jak teraz), a socket service publikuje strumień „nowych zdarzeń", na który
> strona reaguje przez `effect()` (insert / update+move-to-top). Niskie ryzyko, paginacja bez zmian.

### 4.1 Socket service — publiczny strumień zdarzeń

**Plik:** `frontend/src/app/core/services/user-notification-socket.service.ts`

- [x] Dodać publiczny signal niosący ostatnio odebrane powiadomienie (źródło dla reaktywnego merge):
  ```typescript
  readonly liveNotification = signal<{ notification: Notification; wasUpdate: boolean } | null>(null);
  ```
- [x] W `handleNotification` po dotychczasowej logice (cache + unreadCount + snackbar) ustawić
      `this.liveNotification.set({ notification, wasUpdate: payload.wasUpdate ?? false })`
- [x] `payload` z gateway zawiera już `wasUpdate` i `aggregateCount` (potwierdzone w
      `user-notification.gateway.ts`) — przekazać je do obiektu `notification`

### 4.2 Notification service — metody HTTP usuwania

**Plik:** `frontend/src/app/core/services/notification.service.ts`

- [x] Dodać metody:
  ```typescript
  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  deleteAllNotifications(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
  ```
- [x] (Cache w `NotificationService` zostaje jak jest — nie wystawiamy go jako źródła listy strony)

### 4.3 Strona — reaktywny merge live + paginacja bez zmian

**Plik:** `frontend/src/app/features/notifications/pages/notifications/notifications-page.component.ts`

- [x] Zachować lokalny `notifications = signal<Notification[]>([])` i istniejącą paginację
      (`loadNotifications`, `loadMore`, `hasMore`, `currentPage`) — bez zmian strukturalnych
- [x] Wstrzyknąć `UserNotificationSocketService` i dodać `effect()` reagujący na `liveNotification()`:
  - jeśli `wasUpdate === true` lub element o tym `id` już jest na liście → zaktualizować pola
    (`title`, `body`, `aggregateCount`, `createdAt`, `readAt`) i **przenieść na górę** listy
  - w przeciwnym razie → **prepend** na górę listy
  - zinkrementować `totalCount` tylko dla faktycznie nowych pozycji
- [x] Uwaga na duplikaty: merge musi deduplikować po `id` (effect może odpalić dla pozycji już
      dociągniętej przez paginację)
- [x] `markAsRead` / `markAllAsRead` — bez zmian (działają na lokalnej liście)

---

## Faza 5 — Frontend: UI strony powiadomień

### 5.1 Trzy ikony akcji per kafelek

**Pliki:** `notifications-page.component.html` + `.ts`

- [x] Każdy kafelek dostaje sekcję ikon akcji (flex row, w prawym górnym rogu lub dolnym):
  1. **Oznacz jako przeczytane** — ikona `check`, widoczna tylko gdy `!notification.readAt`; wywołuje `markAsRead(notification)` bez nawigacji
  2. **Usuń** — ikona `x`; wywołuje `delete(notification)`; od razu usuwa z listy
  3. **Przejdź do [X]** — ikona `arrow-right`, widoczna tylko gdy `notification.link`; wywołuje `handleClick` (mark + nawigacja)
     > **FIX po code-review:** pierwotna implementacja dodała do szablonu TYLKO przycisk usuwania (1 z 3).
     > Brakowało „Oznacz jako przeczytane" i „Przejdź do [X]" — dodane (checkboxy oznaczono przedwcześnie).
- [x] Dodać w `.ts` metodę `deleteNotification(notification)` (operuje na lokalnej liście strony):
  ```typescript
  deleteNotification(notification: Notification): void {
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
        this.totalCount.update((c) => Math.max(0, c - 1));
        if (!notification.readAt) {
          this.notificationService.unreadCount.update((c) => Math.max(0, c - 1));
        }
      },
    });
  }
  ```
- [x] Dodać mapę CTA labels w `.ts`:
  ```typescript
  getCtaLabel(kind: NotificationKind): string {
    const ctaMap: Record<NotificationKind, string> = {
      NEW_APPLICATION: 'Przejdź do zarządzania',
      NEW_CHAT_MESSAGE: 'Przejdź do czatu',
      NEW_PRIVATE_MESSAGE: 'Przejdź do konwersacji',
      PARTICIPATION_STATUS: 'Przejdź do wydarzenia',
      EVENT_REMINDER: 'Przejdź do wydarzenia',
      EVENT_CANCELLED: 'Przejdź do wydarzenia',
      REPRIMAND: 'Przejdź do wydarzenia',
      ANNOUNCEMENT: 'Przejdź do wydarzenia',
      NEW_EVENT_IN_CITY: 'Przejdź do wydarzenia',
      PAYMENT_CANCELLED: 'Przejdź do płatności',
    };
    return ctaMap[kind] ?? 'Przejdź';
  }
  ```
- [ ] Poprawić `handleClick` — klik w kafelek nadal markuje + nawiguje. **Zgodność ze styleguide
      (OBOWIĄZKOWE):** obecny kod używa `router.navigateByUrl(notification.link)` bezpośrednio, co
      łamie zasadę „wszystkie nawigacje przez `NavigationService`". `notification.link` to dynamiczny
      string URL z backendu, a w `NavigationService` nie ma generycznej metody dla string URL —
      należy:
  - [x] dodać metodę `navigateToUrl(url: string): void` w `NavigationService`
        (`frontend/src/app/core/services/navigation.service.ts`) opakowującą `router.navigateByUrl`
  - [x] użyć jej w `handleClick` oraz w buttonie „Przejdź do [X]" zamiast `router.navigateByUrl`
  - [x] usunąć wstrzyknięcie `Router` z komponentu strony (po przejściu na `NavigationService`)

### 5.2 Usuwanie wszystkich + "Usuń wszystkie" obok "Oznacz wszystkie jako przeczytane"

**Plik:** `notifications-page.component.html`

- [x] W nagłówku obok istniejącego przycisku "Oznacz wszystkie jako przeczytane" dodać przycisk "Usuń wszystkie" (appearance="ghost", color="danger")
- [ ] Rozważyć potwierdzenie (confirm dialog) przed „Usuń wszystkie" — operacja nieodwracalna (hard delete)
- [x] Dodać metodę `deleteAllNotifications()` w `.ts` (czyści lokalną listę strony):
  ```typescript
  deleteAllNotifications(): void {
    this.notificationService.deleteAllNotifications().subscribe({
      next: () => {
        this.notifications.set([]);
        this.totalCount.set(0);
        this.notificationService.unreadCount.set(0);
      },
    });
  }
  ```

### 5.3 Info o retencji — ikona (i) przy nagłówku

**Plik:** `notifications-page.component.html` + `.ts`

- [ ] **Reuse istniejącego systemu** `ExplainerComponent` / `ExplainerService` (popover już globalnie
      zamontowany w `app.html`, używany w 6 miejscach) — NIE budować nowego tooltipa ani CDK Overlay
- [ ] Przy `<h1>Powiadomienia</h1>` dodać `<app-explainer-trigger>` z ikoną `info`, treść:
  - title: „Automatyczne usuwanie"
  - description: „Przeczytane powiadomienia usuwane są po 7 dniach, nieprzeczytane po 30 dniach."
- [ ] Zweryfikować selektor/API `app-explainer-trigger` w `shared/ui/explainer` (przykład użycia jest
      na `/dev/design-system`)

---

## Faza 6 — Frontend: wyróżnienie pilnej akcji w szczegółach wydarzenia

> **Wybór architektury (po analizie kodu):** NIE budujemy nowego komponentu bannera. Strona
> szczegółów wydarzenia ma już kompletny system pasków statusu sterowany przez
> `EventAreaService.notificationBars` (computed) → `event-status-bars` → `event-status-bar-item`,
> z gotowym callbackiem `openJoinConfirmOverlay()` otwierającym `app-my-participation-details-overlay`.
> Istnieje też gotowy computed `needsConfirmation` = `status === 'APPROVED' && slot.confirmed === false`
> (`event-area.service.ts:149`) — dokładnie stan „pilnej akcji". Punkt 5 to **rozszerzenie istniejącego
> mechanizmu**, nie nowy byt. Budowa osobnego bannera duplikowałaby tę infrastrukturę (sprzeczne ze
> styleguide — reuse przed nową logiką).

### 6.1 Wariant „urgent" w pasku statusu

**Plik:** `event-status-bar-item/event-status-bar-item.component.ts`

- [ ] Dodać opcjonalne pole do `EventStatusBarConfig`:
  ```typescript
  urgent?: boolean;
  ```
- [ ] W szablonie/itemie obsłużyć `urgent` — wyraźne wyróżnienie wizualne: kolor `danger`/`warning`
      (semantyczne klasy), opcjonalnie subtelna animacja `animate-pulse` (Tailwind). Bez własnych
      hexów / domyślnych kolorów Tailwind (styleguide).

### 6.2 Pilny pasek w `notificationBars`

**Plik:** `frontend/src/app/features/event/services/event-area.service.ts`, computed `notificationBars` (~linia 191)

- [x] Na początku budowania `bars` (przed istniejącym paskiem 'participation') dodać warunek:
      gdy `this.needsConfirmation()` → wypchnąć pasek z `id: 'participation'` (lub dedykowane
      `'participation-confirm'`, obsługiwane już przez `handleNotificationBarAction` / `handleBarClick`
      dzięki `startsWith('participation-')`), z:
  - `urgent: true`
  - `title: 'Masz przyznane miejsce!'`
  - `subtitle: 'Potwierdź udział'`
  - kolory `danger`/`warning`
- [x] Upewnić się, że klik w ten pasek wywołuje `openJoinConfirmOverlay()` (już podpięte w
      `handleBarClick` / `handleNotificationBarAction` dla prefiksu `participation`)
- [x] Zachować dotychczasowy „zwykły" pasek participation dla pozostałych statusów (CONFIRMED itd.)

### 6.3 Rozszerzalność (inne pilne akcje w przyszłości)

- [ ] Logikę „czy wymagana pilna akcja" trzymać w jednym computed (np. rozbudować `needsConfirmation`
      lub dodać `urgentAction = computed(...)` zwracający typ akcji albo `null`), żeby kolejne stany
      (np. wymagana płatność, wymagana decyzja) dało się dodać bez zmiany struktury paska
- [ ] Konkretny zbiór dodatkowych stanów — **do ustalenia** (poza APPROUVED/needsConfirmation), zgodnie
      z wcześniejszą decyzją „APPROVED + inne do ustalenia w trakcie" (`needsConfirmation`)

---

## Faza 7 — Weryfikacja i testy

- [x] Uruchomić istniejące testy backendu: `nx test backend`
- [x] Sprawdzić czy testy `notifications.service.spec.ts` przechodzą po zmianie debounce
- [x] Sprawdzić czy testy `enrollment.service.spec.ts` przechodzą po dodaniu CONFIRMED
- [x] Sprawdzić/zaktualizować testy cronów eskalacji i digest po przejściu na `updatedAt`
- [ ] Manualnie/integracyjnie zweryfikować:
  - [ ] CONFIRMED notification (in-app) pojawia się po potwierdzeniu slotu
  - [ ] Kliknięcie NEW_APPLICATION prowadzi do `/o/w/{id}/manage`
  - [ ] NEW_EVENT_IN_CITY zawiera nazwę miasta w tytule
  - [ ] Grupowy czat generuje powiadomienia dla nieobecnych uczestników (i NIE dla autora)
  - [ ] Prywatny i grupowy czat NIE generują powiadomień gdy odbiorca ma dany czat otwarty
  - [ ] Lista `/notifications` aktualizuje się bez odświeżania (insert nowych + move-to-top dla agregacji)
  - [ ] Usuwanie pojedynczego powiadomienia działa (znika z listy + dekrement licznika gdy nieprzeczytane)
  - [ ] "Usuń wszystkie" działa (z potwierdzeniem)
  - [ ] Debounce agreguje wiadomości przez >10 min aktywnej konwersacji (po `updatedAt`)
  - [ ] **Brak spamu push**: aktywna rozmowa nie wysyła push co minutę — push dopiero po ciszy ≥`PUSH_DELAY_MINUTES`
  - [ ] Multi-tab presence: otwarcie czatu w 2 zakładkach, zamknięcie jednej NIE wznawia powiadomień; zamknięcie obu wznawia
  - [ ] Pilny pasek (APPROVED + niepotwierdzony) wyświetla się wyróżniony i otwiera `my-participation-details-overlay`

---

## Kolejność i zależności faz

- **Faza 1** jest niezależna i najbezpieczniejsza — można wdrożyć i zmergować osobno (czyste bugfixy).
- **Faza 2** wymaga `forwardRef` (ChatGateway ↔ ChatNotificationService) — gateway już zależy od serwisu,
  więc dodanie zależności w drugą stronę tworzy cykl. Presence (2.1) musi powstać przed 2.2 i 2.3.
- **Faza 3** (backend delete) musi poprzedzać **Fazę 5.1/5.2** (UI usuwania).
- **Faza 4** (live signal) musi poprzedzać testy real-time z **Fazy 7**.
- **Typy bez zmian:** frontendowy `Notification` (`shared/types/notification.interface.ts`) ma już
  `aggregateCount`, `link`, `updatedAt`; `NotificationKind` zawiera wszystkie rodzaje. `libs/` enumy
  bez zmian. Nie ruszamy `schema.prisma` (brak nowych pól — hard delete i `updatedAt` już istnieją).

## Notatki / TODO na później

- **Admin-reject bug** (~linia 1573 `enrollment.service.ts`): wywołanie `notifyParticipationStatus` z wiadomością zamiast `eventId` jako 4. argument — osobny PR.
- **FIX po code-review — kolejność tras DELETE** (`notifications.controller.ts`): `@Delete(':id')` był
  zadeklarowany przed `@Delete('all')`, więc `DELETE /notifications/all` trafiał w `:id` (id='all'),
  a „Usuń wszystkie" było cichym no-op (front optymistycznie czyścił listę). Naprawione przez
  przeniesienie trasy statycznej `all` przed `:id`.
- **Istniejący pasek 'participation'**: obecnie pokazuje „Jesteś zapisany / Sprawdź szczegóły" dla
  KAŻDego uczestnictwa przy UPCOMING. Wariant urgent (Faza 6) musi być wyraźnie odróżniony, by nie
  zlał się ze zwykłym paskiem.
- **Skalowanie horizontal**: przy przejściu na multi-instance backend — zastąpić in-memory presence Redis Adapterem dla Socket.IO.
- **Pilna akcja**: po ustaleniu kolejnych stanów wymagających akcji (poza APPROVED) — rozszerzyć enum w `ParticipationActionBannerComponent`.
- **Punkt 5 — ChatGateway auth**: `handleSendMessage` czyta `data.userId` z payload zamiast z JWT — potencjalny problem bezpieczeństwa do adresowania osobno.
