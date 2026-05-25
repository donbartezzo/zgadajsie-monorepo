# Minimalny system powiadomień — plan wdrożeniowy

Dokument operacyjny do wdrożenia systemu opisanego w `minimal_notification_system_implementation_plan.md` (założenia)
i `minimal_notification_system_implementation_plan-odpowiedzi.md` (decyzje), z uwzględnieniem realiów obecnej aplikacji.

---

## Cel

Jedno centralne źródło prawdy o powiadomieniu (model `Notification`), realtime jako kanał podstawowy, push i email jako fallback wyzwalany dopiero gdy user nie zareagował. Brak duplikacji powiadomień, prosty debounce agregacyjny, twarda retencja.

> „Skutecznie poinformować użytkownika minimalną liczbą interakcji".

---

## Zafiksowane decyzje projektowe

| #   | Decyzja                                 | Wartość                                                                                                                                                                   |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Urgency per typ                         | **Brak** — wszystkie typy `NORMAL`; pole istnieje w policy na przyszłość. Delaye stałe.                                                                                   |
| 2   | Delay push                              | **5 min** od `createdAt`                                                                                                                                                  |
| 3   | Delay email                             | **60 min** od `createdAt`                                                                                                                                                 |
| 4   | Cron escalation                         | co minutę                                                                                                                                                                 |
| 5   | Cron email digest                       | co 15 min                                                                                                                                                                 |
| 6   | Cron cleanup                            | codziennie o 3:00                                                                                                                                                         |
| 7   | Email mode per typ                      | `DIGEST` dla NEW_CHAT_MESSAGE / NEW_PRIVATE_MESSAGE / NEW_APPLICATION / NEW_EVENT_IN_CITY; `TRANSACTIONAL` dla pozostałych                                                |
| 8   | `allowPush` / `allowEmail`              | pole w policy, na MVP wszędzie `true`                                                                                                                                     |
| 9   | Debounce window                         | **10 min** od ostatniego unread o tym samym `groupKey`                                                                                                                    |
| 10  | `groupKey`                              | kolumna opcjonalna; klucz generowany przez policy; **bez** unique index — SELECT + UPDATE/INSERT                                                                          |
| 11  | Context-aware read                      | `markByGroupKey(userId, groupKey)` wołane przy wejściu w konwersację / czat eventu                                                                                        |
| 12  | Email digest                            | per-user okno; jeden mail/usera w danym przebiegu cronu                                                                                                                   |
| 13  | Retencja                                | `readAt + 7d` lub `createdAt + 30d` (computed w `create`); cleanup batchami po 10000                                                                                      |
| 14  | `PendingChatNotification`               | **usunąć** po migracji                                                                                                                                                    |
| 15  | Presence / `lastActiveAt`               | **poza MVP**                                                                                                                                                              |
| 16  | Preferencje per-user per-kanał          | **poza MVP**                                                                                                                                                              |
| 17  | `isRead: Boolean` → `readAt: DateTime?` | pełna migracja kolumny                                                                                                                                                    |
| 18  | `clickUrl` → `link`                     | rename zgodnie z planem (krótsze, zgodne ze słownictwem planu)                                                                                                            |
| 19  | Enum `NEW_PRIVATE_MESSAGE`              | **dodać** do `NotificationKind`; chat private używa go zamiast reuse `NEW_CHAT_MESSAGE` (frontend już oczekuje typu — mapowanie ikon w `notifications-page.component.ts`) |
| 20  | Deploy breaking change API              | **Atomic** — Etap 2 + 6 w jednym commicie (monorepo Nx, PWA refresh przy reconnect WS); bez okresu przejściowego                                                          |
| 21  | Mark-by-group injection                 | `NotificationsService` injectujemy do `ChatNotificationService` (nie do `ChatService`); rozdzielenie warstw, brak cykli                                                   |

Wszystkie wartości czasowe lądują w `notification-policy.ts` jako stałe — zmiana = jedna linia.

---

## Architektura

```text
event biznesowy
   │
   ▼
PushService.notifyUser()
   │
   ├── NotificationsService.create(ctx, type, ...)
   │     ├── policy.groupKey(ctx) → key
   │     ├── jeśli key i istnieje unread w oknie 10 min → UPDATE (aggregate)
   │     └── inaczej → INSERT
   │
   └── UserNotificationGateway.emitToUser(userId, payload)   ← INSTANT (jedyny kanał od razu)


cron: notification-escalation (co 1 min)
   │
   ├── PUSH: notyfikacje > 5 min, unread, !pushSent, relevant, policy.allowPush
   │           → web push, set pushSentAt
   │
   └── EMAIL (TRANSACTIONAL): notyfikacje > 60 min, unread, !emailSent,
         policy.emailMode = TRANSACTIONAL, policy.allowEmail
           → EmailService.send<DedicatedTemplate>, set emailSentAt


cron: notification-email-digest (co 15 min)
   │
   └── per user: notyfikacje > 60 min, unread, !emailSent,
                 policy.emailMode = DIGEST, policy.allowEmail
       → jeden mail digest „Masz N nieprzeczytanych powiadomień"
       → set emailSentAt = now na uwzględnionych


cron: notification-cleanup (codziennie 3:00)
   │
   └── DELETE WHERE deleteAfter < now LIMIT 10000 (pętla aż wyczerpie)


frontend
   │
   ├── UserNotificationSocketService:
   │     event 'notification' → upsert w cache (po id)
   │     unreadCount += 1 jeśli nowy id
   │
   ├── BottomNav: bell + badge (unread + relevant)
   │
   ├── NotificationsPage (/powiadomienia):
   │     lista, infinite scroll, markAsRead → PATCH /notifications/:id
   │
   └── Context-aware mark:
         ChatService.openConversation → notificationsService.markByGroupKey
```

---

## Model danych

### `Notification` (po migracji)

```prisma
model Notification {
  id             String           @id @default(uuid())
  userId         String
  type           NotificationKind

  title          String
  body           String
  link           String?          // RENAMED z clickUrl

  groupKey       String?          // NEW — debounce key z policy
  aggregateCount Int              @default(1)  // NEW — ile zdarzeń zagregowano

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt   // NEW
  readAt         DateTime?        // REPLACES isRead

  relevanceUntil DateTime?        // NEW (null = bez wygaśnięcia)
  deleteAfter    DateTime         // NEW (NOT NULL, computed w create/update)

  pushSentAt     DateTime?        // NEW
  emailSentAt    DateTime?        // NEW

  relatedEventId String?
  relatedEvent   Event?           @relation("NotificationEvent", fields: [relatedEventId], references: [id])
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([deleteAfter])
  @@index([userId, groupKey])
  // partial index na unread — dodać raw SQL w migracji (Prisma nie wspiera):
  //   CREATE INDEX notifications_user_unread_idx ON "Notification"(userId) WHERE "readAt" IS NULL;
  //   CREATE INDEX notifications_push_pending_idx ON "Notification"("createdAt") WHERE "readAt" IS NULL AND "pushSentAt" IS NULL;
  //   CREATE INDEX notifications_email_pending_idx ON "Notification"("createdAt") WHERE "readAt" IS NULL AND "emailSentAt" IS NULL;
}
```

### `PendingChatNotification` — DROP

Model usuwany w migracji wraz z indeksami. Cała logika zastąpiona przez `Notification.emailSentAt` + `groupKey` + escalation cron.

### Migracja danych

```sql
-- 1. Dodaj nowe kolumny (nullable na start)
ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "groupKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "aggregateCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Notification" ADD COLUMN "relevanceUntil" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "deleteAfter" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "pushSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "emailSentAt" TIMESTAMP(3);

-- 2. Konwersja isRead → readAt
UPDATE "Notification" SET "readAt" = "createdAt" WHERE "isRead" = true;
-- updatedAt = createdAt dla istniejących rekordów
UPDATE "Notification" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
-- deleteAfter = createdAt + 30d dla unread, readAt + 7d dla read
UPDATE "Notification" SET "deleteAfter" = "createdAt" + INTERVAL '30 days' WHERE "readAt" IS NULL;
UPDATE "Notification" SET "deleteAfter" = "readAt" + INTERVAL '7 days' WHERE "readAt" IS NOT NULL;

-- 3. Set NOT NULL
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "deleteAfter" SET NOT NULL;

-- 4. Rename clickUrl → link
ALTER TABLE "Notification" RENAME COLUMN "clickUrl" TO "link";

-- 5. Drop isRead
ALTER TABLE "Notification" DROP COLUMN "isRead";

-- 6. Drop stary index na isRead
DROP INDEX IF EXISTS "Notification_userId_isRead_createdAt_idx";

-- 7. Indeksy
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX "Notification_deleteAfter_idx" ON "Notification"("deleteAfter");
CREATE INDEX "Notification_userId_groupKey_idx" ON "Notification"("userId", "groupKey");
CREATE INDEX "notifications_user_unread_idx" ON "Notification"("userId") WHERE "readAt" IS NULL;
CREATE INDEX "notifications_push_pending_idx" ON "Notification"("createdAt") WHERE "readAt" IS NULL AND "pushSentAt" IS NULL;
CREATE INDEX "notifications_email_pending_idx" ON "Notification"("createdAt") WHERE "readAt" IS NULL AND "emailSentAt" IS NULL;

-- 8. Drop PendingChatNotification (ostatni etap, po usunięciu kodu)
DROP TABLE "PendingChatNotification";
```

> **Uwaga:** punkt 8 wykonujemy w osobnej migracji **dopiero po** zmianie kodu chatu (Etap 7), bo inaczej `processPendingNotifications` poleci na nieistniejącej tabeli.

---

## Policy config

### Plik: `backend/src/modules/notifications/notification-policy.ts`

```ts
import { NotificationKind } from '@prisma/client';
import { addDays, addHours } from 'date-fns';

// === STAŁE CZASOWE — jedyne miejsce do zmiany ===
export const NOTIFICATION_TIMING = {
  PUSH_DELAY_MINUTES: 5,
  EMAIL_DELAY_MINUTES: 60,
  EMAIL_DIGEST_CRON_MINUTES: 15,
  DEBOUNCE_WINDOW_MINUTES: 10,
  READ_RETENTION_DAYS: 7,
  UNREAD_RETENTION_DAYS: 30,
  CLEANUP_BATCH_SIZE: 10000,
} as const;

// === TYPY ===
export type Urgency = 'NORMAL' | 'URGENT';
export type EmailMode = 'DIGEST' | 'TRANSACTIONAL' | 'NONE';

export interface NotificationContext {
  userId: string;
  relatedEventId?: string;
  senderId?: string;
  cityId?: string;
  eventStartAt?: Date;
}

export interface NotificationPolicy {
  urgency: Urgency;
  emailMode: EmailMode;
  allowPush: boolean;
  allowEmail: boolean;
  groupKey?: (ctx: NotificationContext) => string | null;
  relevanceUntil?: (ctx: NotificationContext) => Date | null;
}

// === MAPA POLICY ===
export const NOTIFICATION_POLICIES: Record<NotificationKind, NotificationPolicy> = {
  NEW_CHAT_MESSAGE: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `chat:${ctx.relatedEventId}` : null),
    relevanceUntil: () => addDays(new Date(), 30),
  },
  NEW_PRIVATE_MESSAGE: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) =>
      ctx.relatedEventId && ctx.senderId ? `pm:${ctx.relatedEventId}:${ctx.senderId}` : null,
    relevanceUntil: () => addDays(new Date(), 30),
  },
  NEW_APPLICATION: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `app:${ctx.relatedEventId}` : null),
    relevanceUntil: () => addDays(new Date(), 14),
  },
  NEW_EVENT_IN_CITY: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) =>
      ctx.cityId ? `city:${ctx.cityId}:${new Date().toISOString().slice(0, 10)}` : null,
    relevanceUntil: () => addDays(new Date(), 7),
  },
  EVENT_REMINDER: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `reminder:${ctx.relatedEventId}` : null),
    relevanceUntil: (ctx) => (ctx.eventStartAt ? addHours(ctx.eventStartAt, 1) : null),
  },
  EVENT_CANCELLED: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: () => addDays(new Date(), 14),
  },
  PARTICIPATION_STATUS: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: () => addDays(new Date(), 14),
  },
  PAYMENT_CANCELLED: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: null,
  },
  REPRIMAND: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: () => addDays(new Date(), 30),
  },
  ANNOUNCEMENT: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `announce:${ctx.relatedEventId}` : null),
    relevanceUntil: () => addDays(new Date(), 14),
  },
};
```

> **Uwaga:** `NotificationKind` może wymagać uzupełnienia o `NEW_PRIVATE_MESSAGE` w schemie Prisma — sprawdzić przed kompilacją (obecnie chat private używa `NEW_CHAT_MESSAGE`; jeśli zostawiamy ten reuse, usunąć z mapy `NEW_PRIVATE_MESSAGE`).

---

## NotificationsService — refactor

```ts
async create(ctx: NotificationContext, type: NotificationKind, title: string, body: string, link?: string) {
  const policy = NOTIFICATION_POLICIES[type];
  const groupKey = policy.groupKey?.(ctx) ?? null;
  const relevanceUntil = policy.relevanceUntil?.(ctx) ?? null;

  // Debounce: szukaj unread w oknie
  if (groupKey) {
    const windowStart = new Date(Date.now() - NOTIFICATION_TIMING.DEBOUNCE_WINDOW_MINUTES * 60_000);
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: ctx.userId,
        groupKey,
        readAt: null,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          title, body, link,
          aggregateCount: { increment: 1 },
          updatedAt: new Date(),
          // RESET sygnałów dostarczenia — bo content się zmienił, escalation ma poczekać kolejne X min
          pushSentAt: null,
          emailSentAt: null,
          // odśwież relevanceUntil (np. dla reminder)
          relevanceUntil,
          // deleteAfter = createdAt + 30d (unread)
          deleteAfter: addDays(existing.createdAt, NOTIFICATION_TIMING.UNREAD_RETENTION_DAYS),
        },
      });
      return { notification: updated, wasUpdate: true };
    }
  }

  const now = new Date();
  const created = await this.prisma.notification.create({
    data: {
      userId: ctx.userId,
      type,
      title, body, link,
      groupKey,
      relevanceUntil,
      relatedEventId: ctx.relatedEventId,
      deleteAfter: addDays(now, NOTIFICATION_TIMING.UNREAD_RETENTION_DAYS),
    },
  });
  return { notification: created, wasUpdate: false };
}

async markAsRead(id: string, userId: string) {
  const now = new Date();
  return this.prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: {
      readAt: now,
      deleteAfter: addDays(now, NOTIFICATION_TIMING.READ_RETENTION_DAYS),
    },
  });
}

async markAllAsRead(userId: string) {
  const now = new Date();
  return this.prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: {
      readAt: now,
      deleteAfter: addDays(now, NOTIFICATION_TIMING.READ_RETENTION_DAYS),
    },
  });
}

/** Context-aware read — wołać przy wejściu w konwersację / czat eventu. */
async markByGroupKey(userId: string, groupKey: string) {
  const now = new Date();
  return this.prisma.notification.updateMany({
    where: { userId, groupKey, readAt: null },
    data: {
      readAt: now,
      deleteAfter: addDays(now, NOTIFICATION_TIMING.READ_RETENTION_DAYS),
    },
  });
}

async getUnreadCount(userId: string) {
  const count = await this.prisma.notification.count({
    where: {
      userId,
      readAt: null,
      OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
    },
  });
  return { count };
}
```

---

## PushService — uproszczenie

`notifyUser()`:

1. Skip FAKE users.
2. `NotificationsService.create(ctx, ...)` → zwraca `{ notification, wasUpdate }`.
3. `UserNotificationGateway.emitToUser(userId, payload)` — emit z `wasUpdate` flag w payload (frontend dedup po `id`).
4. **NIE wysyła web push** (wszystko przez escalation cron).

Wszystkie metody `notifyNewApplication`, `notifyParticipationStatus`, … zostają jako fasada — tylko delegują do `notifyUser` z odpowiednim `type`. Treści (title/body) generujemy tu jak dotąd.

---

## Cron: escalation

### Plik: `backend/src/modules/notifications/notification-escalation.cron.ts`

```ts
@Injectable()
export class NotificationEscalationCron {
  constructor(
    private prisma: PrismaService,
    private pushDeliveryService: PushDeliveryService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'notification-escalation' })
  async run() {
    await this.escalatePush();
    await this.escalateTransactionalEmail();
  }

  private async escalatePush() {
    const cutoff = subMinutes(new Date(), NOTIFICATION_TIMING.PUSH_DELAY_MINUTES);
    const eligibleTypes = Object.entries(NOTIFICATION_POLICIES)
      .filter(([, p]) => p.allowPush)
      .map(([k]) => k as NotificationKind);

    const pending = await this.prisma.notification.findMany({
      where: {
        readAt: null,
        pushSentAt: null,
        type: { in: eligibleTypes },
        createdAt: { lt: cutoff },
        OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
      },
      take: 500, // chunk
    });

    for (const n of pending) {
      await this.pushDeliveryService.sendWebPush(n);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { pushSentAt: new Date() },
      });
    }
  }

  private async escalateTransactionalEmail() {
    const cutoff = subMinutes(new Date(), NOTIFICATION_TIMING.EMAIL_DELAY_MINUTES);
    const transactionalTypes = Object.entries(NOTIFICATION_POLICIES)
      .filter(([, p]) => p.emailMode === 'TRANSACTIONAL' && p.allowEmail)
      .map(([k]) => k as NotificationKind);

    const pending = await this.prisma.notification.findMany({
      where: {
        readAt: null,
        emailSentAt: null,
        type: { in: transactionalTypes },
        createdAt: { lt: cutoff },
        OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
      },
      take: 200,
      include: { user: true },
    });

    for (const n of pending) {
      await this.emailService.sendTransactionalForNotification(n);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { emailSentAt: new Date() },
      });
    }
  }
}
```

Notatki:

- `PushDeliveryService` — wydziel niskopoziomową logikę webPush (subskrypcje, payload, cleanup stale subscriptions) z obecnego `PushService`. Pozwala wywoływać webpush bez tworzenia notyfikacji.
- `EmailService.sendTransactionalForNotification(n)` — nowa metoda routująca po `n.type` do istniejących `sendApprovalReminder` / `sendCancellationEmail` / etc. Tu zapadają decyzje który template użyć.

---

## Cron: email digest

### Plik: `backend/src/modules/notifications/notification-email-digest.cron.ts`

```ts
@Injectable()
export class NotificationEmailDigestCron {
  @Cron('*/15 * * * *', { name: 'notification-email-digest' })
  async run() {
    const cutoff = subMinutes(new Date(), NOTIFICATION_TIMING.EMAIL_DELAY_MINUTES);
    const digestTypes = Object.entries(NOTIFICATION_POLICIES)
      .filter(([, p]) => p.emailMode === 'DIGEST' && p.allowEmail)
      .map(([k]) => k as NotificationKind);

    // Group by user — pierwszy poziom: znajdź userów z pending
    const rows = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT DISTINCT "userId" FROM "Notification"
      WHERE "readAt" IS NULL
        AND "emailSentAt" IS NULL
        AND "type"::text = ANY(${digestTypes})
        AND "createdAt" < ${cutoff}
        AND ("relevanceUntil" IS NULL OR "relevanceUntil" > NOW())
      LIMIT 500
    `;

    for (const { userId } of rows) {
      const items = await this.prisma.notification.findMany({
        where: {
          userId,
          readAt: null,
          emailSentAt: null,
          type: { in: digestTypes },
          createdAt: { lt: cutoff },
          OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      if (items.length === 0) continue;

      await this.emailService.sendDigest(userId, items);
      await this.prisma.notification.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { emailSentAt: new Date() },
      });
    }
  }
}
```

`EmailService.sendDigest(userId, items)` — nowy szablon „Masz N nieprzeczytanych powiadomień" z listą title + link.

---

## Cron: cleanup

### Plik: `backend/src/modules/notifications/notification-cleanup.cron.ts`

```ts
@Injectable()
export class NotificationCleanupCron {
  @Cron('0 3 * * *', { timeZone: APP_DEFAULT_TIMEZONE, name: 'notification-cleanup' })
  async run() {
    let deleted = 0;
    while (true) {
      const result = await this.prisma.$executeRaw`
        DELETE FROM "Notification"
        WHERE id IN (
          SELECT id FROM "Notification"
          WHERE "deleteAfter" < NOW()
          LIMIT ${NOTIFICATION_TIMING.CLEANUP_BATCH_SIZE}
        )
      `;
      deleted += Number(result);
      if (Number(result) < NOTIFICATION_TIMING.CLEANUP_BATCH_SIZE) break;
    }
    this.logger.log(`Cleaned up ${deleted} notifications`);
  }
}
```

---

## Frontend

### Typy

```ts
// frontend/src/app/shared/types/notification.interface.ts
export interface Notification {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  link?: string; // renamed
  groupKey?: string;
  aggregateCount: number;
  createdAt: string;
  updatedAt: string;
  readAt: string | null; // replaces isRead
  relevanceUntil: string | null;
}

// computed accessor — gdzie potrzeba w komponentach
export const isUnread = (n: Notification) => n.readAt === null;
```

### `UserNotificationSocketService` — upsert handling

```ts
this.socket.on('notification', (payload: NotificationPayload) => {
  this.ngZone.run(() => this.handleNotification(payload));
});

private handleNotification(payload: NotificationPayload) {
  // Sprawdź czy id już istnieje w cache → update vs insert
  const existing = this.notificationService.findById(payload.id);
  if (existing) {
    this.notificationService.updateInCache(payload);  // BEZ inkrementu counter
  } else {
    this.notificationService.addToCache(payload);
    this.notificationService.unreadCount.update(c => c + 1);
  }
  this.snackbar.info(payload.title);
}
```

### `NotificationService` (frontend) — uzupełnienia

- `findById(id)`, `addToCache(n)`, `updateInCache(n)` — operują na lokalnym signalu z listy notyfikacji.
- `markAsRead(id)` — PATCH `/notifications/:id/read`, optymistycznie update `readAt = now`.

### Strona `/powiadomienia`

Zmiany w istniejącym `notifications-page.component.ts`:

- `isRead` → `!!n.readAt`
- Pokazywanie `aggregateCount` w tytule jeśli > 1 (np. „3× Nowa wiadomość — Tańce w Pubie Y")
- Zakres: ostatnie 30 dni (filtr na API)

### Context-aware mark (call sites)

Wołać `notificationsService.markByGroupKey(userId, key)`:

| Miejsce w kodzie                                     | groupKey                                      |
| ---------------------------------------------------- | --------------------------------------------- |
| `ChatService.markConversationAsRead` (private)       | `pm:${eventId}:${otherUserId}`                |
| Wejście w event chat (otwarcie zakładki czatu)       | `chat:${eventId}`                             |
| Wejście w panel organizatora z zakładką „Zgłoszenia" | `app:${eventId}`                              |
| Wejście w event (np. otwarcie strony eventu)         | `reminder:${eventId}` + `announce:${eventId}` |

Implementacja przez nowy endpoint `POST /notifications/mark-by-group` z body `{ groupKey: string }` (lista zaakceptowanych prefixów whiteliste'owana po stronie backend).

---

## Migracja istniejącego kodu chatu

Stan obecny do usunięcia / refactoru:

1. **`ChatNotificationService.scheduleEmailNotification`** — DELETE (escalation cron przejmuje).
2. **`ChatNotificationService.processPendingNotifications`** — DELETE.
3. **`ChatNotificationService.cancelPendingForConversation`** — DELETE (zastąpione przez `markByGroupKey`).
4. **`ChatNotificationService.onNewPrivateMessage`** — uprościć do:
   ```ts
   async onNewPrivateMessage(eventId, senderId, recipientId) {
     await this.pushService.notifyNewPrivateMessage(recipientId, ...);
     // koniec — escalation załatwi resztę
   }
   ```
5. **`chat-notification.cron.ts`** — DELETE.
6. **`ChatService.markConversationAsRead`** (lokalizacja: `chat.service.ts:219`) — zamiast wołać `cancelPendingForConversation`, woła `notificationsService.markByGroupKey(userId, 'pm:eventId:otherUserId')`.
7. **`PendingChatNotification` model** — DROP w osobnej migracji po wdrożeniu powyższego.

---

## Checklista wdrożeniowa

### Etap 1 — Schema + policy config (fundament)

- [x] **1.1** Migracja Prisma: dodaj kolumny (`readAt`, `updatedAt`, `groupKey`, `aggregateCount`, `relevanceUntil`, `deleteAfter`, `pushSentAt`, `emailSentAt`) jako nullable
- [x] **1.2** Migracja danych: konwersja `isRead → readAt`, `updatedAt = createdAt`, `deleteAfter` per rekord
- [x] **1.3** Migracja Prisma: SET NOT NULL na `updatedAt`, `deleteAfter`
- [x] **1.4** Migracja Prisma: rename `clickUrl → link`
- [x] **1.5** Migracja Prisma: drop `isRead`
- [x] **1.6** Migracja Prisma: drop stary index `Notification_userId_isRead_createdAt_idx`
- [x] **1.7** Migracja Prisma: dodaj nowe indeksy (w tym partial przez raw SQL)
- [x] **1.8** Migracja Prisma: dodaj wartość `NEW_PRIVATE_MESSAGE` do enum `NotificationKind` (obecnie w `schema.prisma:72` jest tylko `NEW_CHAT_MESSAGE`; frontend już dziś oczekuje tego typu w mapowaniu ikon — `notifications-page.component.ts:96`)
- [x] **1.9** Plik `backend/src/modules/notifications/notification-policy.ts` ze stałymi `NOTIFICATION_TIMING` + mapa `NOTIFICATION_POLICIES`
- [x] **1.10** Unit test: każdy `NotificationKind` ma wpis w policy mapie (assertion przez `Object.keys`)

### Etap 2 — NotificationsService refactor

- [x] **2.1** `NotificationsService.create()` — sygnatura przyjmuje `NotificationContext`, dodaj logikę debounce + groupKey + relevanceUntil + deleteAfter
- [x] **2.2** `NotificationsService.markAsRead()` — `isRead = true` → `readAt = now`, oblicz `deleteAfter = readAt + 7d`
- [x] **2.3** `NotificationsService.markAllAsRead()` — j.w.
- [x] **2.4** `NotificationsService.getUnreadCount()` — filtruj po `readAt IS NULL` + `relevanceUntil`
- [x] **2.5** `NotificationsService.getNotifications()` — zwróć `readAt` zamiast `isRead`, dodaj `aggregateCount`, filtr 30 dni
- [x] **2.6** Nowa metoda `NotificationsService.markByGroupKey(userId, groupKey)`
- [x] **2.7** Nowy endpoint `POST /notifications/mark-by-group` (controller) z whitelist prefixów (`chat:`, `pm:`, `app:`, `reminder:`, `announce:`)
- [x] **2.8** Update `notifications.controller.ts`: response schema z `readAt`, walidacja groupKey prefix
- [x] **2.9** Unit testy `NotificationsService`: debounce (update zamiast insert), reset `pushSentAt/emailSentAt` przy update, markByGroupKey, deleteAfter calc

### Etap 3 — Escalation cron + przeniesienie push

- [x] **3.1** Wydziel `PushDeliveryService` z `PushService` (sama logika webPush + subscription mgmt). Zostaje w `notifications.module.ts`.
- [x] **3.2** `PushService.notifyUser()` — USUŃ kod webPush; zostaw tylko create + emit WS
- [x] **3.3** `PushService` metody fasady (`notifyNewApplication` etc.) — bez zmian semantyki, tylko delegacja do `notifyUser`
- [x] **3.4** Wszystkie callsite'y `PushService.notify*` — zweryfikować że przekazują pełny `NotificationContext` (eventId, senderId, cityId tam gdzie potrzeba)
- [x] **3.4a** `PushService.notifyNewPrivateMessage` — zmień typ z `NEW_CHAT_MESSAGE` na `NEW_PRIVATE_MESSAGE` (zależne od 1.8)
- [x] **3.5** Plik `notification-escalation.cron.ts` z metodami `escalatePush()` + `escalateTransactionalEmail()`
- [x] **3.6** Rejestracja crona w `notifications.module.ts` providers
- [x] **3.7** Unit test crona: rekord starszy niż 5 min, unread, push wysłany; rekord przeczytany — pominięty; rekord poza relevance — pominięty
- [ ] **3.8** Manual E2E: utwórz notyfikację → upewnij się że push przychodzi po 5 min, nie wcześniej; oznacz jako read przed upływem 5 min → push nie przychodzi

### Etap 4 — Email digest cron + transactional routing

- [x] **4.1** `EmailService.sendDigest(userId, items)` — nowy szablon HBS/MJML „Masz N nieprzeczytanych powiadomień" z listą items (title + link + relative time)
- [x] **4.2** `EmailService.sendTransactionalForNotification(n)` — switch po `n.type` mapujący na istniejące metody (`sendCancellationEmail`, `sendApprovalReminder`, etc.); fallback warn jeśli brak mapping
- [x] **4.3** Plik `notification-email-digest.cron.ts`
- [x] **4.4** Rejestracja crona
- [x] **4.5** Unit test digest: user z 3 unread > 1h dostaje 1 email, `emailSentAt` ustawione na wszystkich 3
- [x] **4.6** Unit test transactional: PAYMENT_CANCELLED > 1h triggeruje konkretny template; NEW_CHAT_MESSAGE > 1h NIE triggeruje transactional path

### Etap 5 — Cleanup cron + retention

- [x] **5.1** Plik `notification-cleanup.cron.ts` z batch DELETE
- [x] **5.2** Rejestracja crona
- [x] **5.3** Test integracyjny: rekord z `deleteAfter < now` znika; rekord z `deleteAfter > now` zostaje

### Etap 6 — Frontend

- [x] **6.1** `frontend/src/app/shared/types/notification.interface.ts` — `isRead` → `readAt: string | null`, `clickUrl` → `link`, dodaj `aggregateCount`, `groupKey`, `relevanceUntil`, `updatedAt`
- [x] **6.2** `NotificationService` (frontend) — `findById`, `addToCache`, `updateInCache`, computed `isUnread`
- [x] **6.3** `UserNotificationSocketService.handleNotification` — upsert logic (po `id`); counter += 1 tylko jeśli nowy
- [x] **6.4** `notifications-page.component` — refactor do `readAt`, wyświetlanie `aggregateCount` w tytule jeśli > 1
- [ ] **6.5** Dodać dropdown bell (jeśli wcześniej tylko nawigacja do strony) — opcjonalne, wg planu pożądane: 10–20 ostatnich
- [x] **6.6** Helpery w `frontend/src/app/core/services/notification.service.ts` (DRY — komponenty wołają nazwane metody, nie sklejają stringów):
  - [x] `markPrivateConversationRead(eventId, otherUserId)` → POST `/notifications/mark-by-group` z `pm:${eventId}:${otherUserId}`
  - [x] `markEventChatRead(eventId)` → `chat:${eventId}`
  - [x] `markEventApplicationsRead(eventId)` → `app:${eventId}`
  - [x] `markEventViewed(eventId)` → dwa wywołania: `reminder:${eventId}` + `announce:${eventId}`
- [x] **6.6a** Wywołania w komponentach (konkretne pliki):
  - [x] `frontend/src/app/core/services/chat.service.ts` linia 170 (`markAsRead`) — po istniejącym call do backendu wywołaj `notificationsService.markPrivateConversationRead(eventId, otherUserId)`
  - [x] `frontend/src/app/features/chat/pages/unified-chat/unified-chat.component.ts` w `ngOnInit` (lub w `base-chat.component.ts` jeśli jest tam wspólna logika) → `markEventChatRead(eventId)`
  - [x] `frontend/src/app/features/event/pages/event-enrollments/event-enrollments.component.ts` w `ngOnInit` → `markEventApplicationsRead(eventId)`
  - [x] `frontend/src/app/features/event/pages/event-detail/event-detail.component.ts` w `ngOnInit` → `markEventViewed(eventId)`
- [ ] **6.7** Snackbar przy notyfikacji `wasUpdate = true` — opcja: pokazać tylko jeśli `aggregateCount > 1` z odpowiednią treścią

### Etap 7 — Migracja chat (usunięcie PendingChatNotification)

- [x] **7.1** `ChatNotificationService.onNewPrivateMessage` — uprościć do samego `pushService.notifyNewPrivateMessage`
- [x] **7.2** Usunięcie metod `scheduleEmailNotification`, `processPendingNotifications`, `cancelPendingForConversation`, `sendEmailNotification` z `ChatNotificationService`
- [x] **7.3** Usunięcie pliku `chat-notification.cron.ts` + odpięcie z `chat.module.ts`
- [x] **7.4** Dodaj `ChatNotificationService.onConversationRead(eventId, userId, otherUserId)` — wewnątrz woła `notificationsService.markByGroupKey(userId, 'pm:' + eventId + ':' + otherUserId)`. `ChatService.markConversationAsRead` (`chat.service.ts:219`) woła `onConversationRead` zamiast `cancelPendingForConversation`. **`NotificationsService` injectujemy do `ChatNotificationService`** (które już importuje notifications module — brak nowych dependency, brak cykli), **nie** do `ChatService` bezpośrednio — naturalne rozdzielenie warstw (`ChatService` = domena czatu, `ChatNotificationService` = cross-cutting concern notyfikacji)
- [x] **7.5** Sprawdzić importy i forward refs między `ChatService` ↔ `ChatNotificationService` po usunięciach
- [x] **7.6** Aktualizacja testów `chat.service.spec.ts`, `enrollment.service.spec.ts` — usunąć mocki nieistniejących już metod
- [x] **7.7** Osobna migracja Prisma: `DROP TABLE "PendingChatNotification"` + usuń model ze `schema.prisma`
- [ ] **7.8** Manual E2E: dwóch userów; A pisze prywatnie do B; B otwiera czat w ciągu 5 min — żaden email/push nie wychodzi. B nie otwiera — po 5 min push, po 60 min email digest.

### Etap 8 — Testy systemowe

- [ ] **8.1** Test integracyjny: pełen flow (event biznesowy → DB → WS emit → escalation → push → email)
- [x] **8.2** Test debounce: 3× `notifyUser` z tym samym groupKey w 5 min → 1 rekord, `aggregateCount = 3`
- [x] **8.3** Test markByGroupKey: 2 unread w grupie → po wywołaniu obie mają `readAt`
- [x] **8.4** Test cleanup: rekordy z `deleteAfter` w przeszłości znikają
- [x] **8.5** Test retencji: markAsRead na unread → `deleteAfter` ustawione na `readAt + 7d`

### Etap 9 — Cleanup / dokumentacja

- [x] **9.1** Usunięcie `docs/tasks/realtime-notification-bell.md` (lub oznaczenie jako historical) — ten plik zastępuje go
- [x] **9.2** Aktualizacja `docs/styleguide-backend.md` jeśli zawiera odwołania do `isRead` / `clickUrl`
- [ ] **9.3** Manualna weryfikacja na `/dev/design-system` (jeśli komponent notyfikacji tam jest)
- [x] **9.4** Code review + merge

---

## Kolejność implementacji

```text
Etap 1 (schema + policy)
   │
   ├── Etap 2 (service refactor)              ← niezależny od 3-5 po wdrożeniu 1
   │
   ├── Etap 3 (escalation cron)               ← wymaga 1, 2
   │     │
   │     └── Etap 4 (email digest)            ← wymaga 3
   │
   └── Etap 5 (cleanup)                       ← wymaga 1

Etap 6 (frontend)                             ← wymaga 1, 2
   │
   └── Etap 7 (migracja chat)                 ← wymaga 6.6 (markByGroupKey wired)

Etap 8 (testy systemowe)                      ← na końcu
Etap 9 (cleanup docs)                         ← finalny
```

Etapy 1–5 to backend „w sobie" — można je rozwijać i testować w izolacji. **Punkt krytyczny:** Etap 2.5 zmienia kontrakt API (`isRead` → `readAt`), więc Etap 6.1–6.4 **musi iść w tym samym commicie/deploymencie** co Etap 2. Decyzja zafiksowana (#20 w tabeli decyzji): **atomic deploy bez okresu przejściowego** — uzasadnienie: monorepo Nx (backend + frontend deployowane razem), PWA (przy reconnect WS user dostaje świeży frontend), brak natywnych klientów mobilnych w sklepie. Okres przejściowy z computed `isRead = !!readAt` to dodatkowy kod, który nigdy nie będzie potrzebny dłużej niż czas między dwoma kolejnymi deployami.

---

## Szacowany zakres

| Etap     | LOC backend            | LOC frontend |
| -------- | ---------------------- | ------------ |
| 1        | 100 (głównie migracja) | 0            |
| 2        | 200                    | 0            |
| 3        | 180                    | 0            |
| 4        | 200 (+ template email) | 0            |
| 5        | 60                     | 0            |
| 6        | 0                      | 250          |
| 7        | −180 (delete) + 30     | 50           |
| 8        | 300 (testy)            | 100 (testy)  |
| **Suma** | **~890**               | **~400**     |

---

## Ryzyka i mitigacje

| Ryzyko                                                                                      | Mitigacja                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploy etapu 2 bez 6 = frontend pokazuje wszystkie notyfikacje jako unread                  | **Atomic deploy 2+6 w jednym commicie** (monorepo Nx, brak starych klientów mobilnych — PWA odświeża się przy reconnect WS). Decyzja zafiksowana, bez okresu przejściowego. |
| Drop `PendingChatNotification` przed usunięciem `processPendingNotifications` = crash crona | Etap 7.7 obowiązkowo PO 7.3                                                                                                                                                 |
| Debounce update gubi historię „kto napisał" w body                                          | `aggregateCount` + zaktualizowany body „3× Nowa wiadomość — event X"; szczegóły i tak są w czacie                                                                           |
| Spam reset `pushSentAt` na debounce update = ten sam user dostaje push co debounce window   | Akceptowalne (5 min między pushami); jeśli za dużo, dodać max-push-per-groupKey-per-hour                                                                                    |
| Escalation cron padnie / opóźnienia                                                         | Push przyjdzie z opóźnieniem, ale przyjdzie. Cron monitor (`cron-monitor.cron.ts`) już istnieje w projekcie.                                                                |
| Email digest cron wyśle podwójny mail w przypadku race                                      | `emailSentAt` ustawiamy w tej samej transakcji co fetch (`updateMany WHERE emailSentAt IS NULL`) — natural lock                                                             |

---

## Decyzje podjęte (snapshot)

| #   | Decyzja                        | Wartość                                                                                                      |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1   | Model danych                   | Jedna tabela `Notification`, `pushSentAt`/`emailSentAt` jako kolumny (nie osobna delivery table)             |
| 2   | Read tracking                  | `readAt: DateTime?` (nie boolean)                                                                            |
| 3   | Retention                      | `deleteAfter` jako kolumna, computed w `create`/`markAsRead`                                                 |
| 4   | Grouping                       | `groupKey` opcjonalne, generowane przez policy, SELECT + UPDATE/INSERT (nie unique constraint)               |
| 5   | Debounce window                | 10 min                                                                                                       |
| 6   | Delays                         | 5 min push, 60 min email (w `NOTIFICATION_TIMING`)                                                           |
| 7   | Email mode                     | DIGEST dla chat/applications/city events; TRANSACTIONAL dla pozostałych                                      |
| 8   | Per-user digest cadence        | Cron co 15 min, max 1 mail/user/run                                                                          |
| 9   | Context-aware read             | `markByGroupKey(userId, groupKey)` + endpoint z whitelist prefixów                                           |
| 10  | Policy config                  | Centralna mapa `NOTIFICATION_POLICIES` (urgency, emailMode, allowPush, allowEmail, groupKey, relevanceUntil) |
| 11  | Urgency                        | Wszędzie NORMAL na MVP (pole istnieje na przyszłość)                                                         |
| 12  | `allowPush` / `allowEmail`     | Wszędzie `true` na MVP                                                                                       |
| 13  | `PendingChatNotification`      | Drop po migracji chatu                                                                                       |
| 14  | Presence / `lastActiveAt`      | Poza MVP                                                                                                     |
| 15  | Preferencje per-user per-kanał | Poza MVP                                                                                                     |
| 16  | Cleanup                        | Codziennie 3:00, batch 10000, raw SQL DELETE z LIMIT                                                         |
| 17  | Frontend WS                    | Event `notification` → upsert po `id`; counter inkrementowany tylko dla nowych                               |
| 18  | API breaking change            | Atomic deploy Etapu 2+6 w jednym commicie — bez okresu przejściowego (monorepo Nx, PWA)                      |
| 19  | Enum `NEW_PRIVATE_MESSAGE`     | Dodajemy do `NotificationKind`; chat private używa go zamiast reuse `NEW_CHAT_MESSAGE`                       |
| 20  | Mark-by-group wstrzyknięcie    | `NotificationsService` injectujemy do `ChatNotificationService` (nie do `ChatService`)                       |

---

## Co świadomie pomijamy (MVP)

- threads / kategorie / archiwum
- delivery table + retry engine
- per-user preferencje per-kanał
- ML priorities
- presence system
- event sourcing / audit log
- counter denormalized w `users.unread_notifications_count` (partial index wystarczy do skali)

Każde z tych można dołożyć później bez przebudowy fundamentu.
