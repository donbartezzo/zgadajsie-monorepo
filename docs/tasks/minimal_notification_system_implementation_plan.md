# Minimalny system powiadomień — plan wdrożeniowy

## Cel

System ma realizować jedną główną zasadę:

> „Skutecznie poinformować użytkownika minimalną liczbą interakcji”.

Oznacza to:

- realtime/in-app jako kanał podstawowy,
- push/email wyłącznie jako fallback,
- brak duplikacji powiadomień,
- brak spamu,
- prostą architekturę możliwą do dalszego rozwoju.

System ma być:

- prosty implementacyjnie,
- tani w utrzymaniu,
- wydajny,
- łatwy do rozszerzenia o kolejne kanały (np. SMS).

---

# Założenia architektoniczne

## 1. Jedno centralne źródło prawdy

Każde powiadomienie istnieje jako pojedynczy rekord w bazie.

Kanały (realtime, push, email) są tylko sposobami poinformowania użytkownika o tym rekordzie.

Nie tworzymy osobnych bytów typu:

- EmailNotification
- PushNotification
- RealtimeNotification

Wszystko opiera się o jeden model `Notification`.

---

## 2. Realtime jako kanał podstawowy

Flow:

```text
event biznesowy
→ zapis do notifications
→ realtime emit
→ STOP
```

Nie wysyłamy od razu:

- push,
- email,
- SMS.

Najpierw dajemy użytkownikowi szansę zobaczyć powiadomienie w aplikacji.

---

## 3. Escalation zamiast broadcastu

Dalsze kanały uruchamiane są wyłącznie gdy:

- user nie przeczytał notification,
- notification nadal jest istotne.

Przykład:

```text
0 min   → realtime
5 min   → web push (jeśli nadal unread)
1h      → email digest (jeśli nadal unread)
```

Dzięki temu:

- aktywny user dostaje wyłącznie realtime,
- nieaktywny user nadal zostanie poinformowany,
- minimalizujemy spam.

---

# Model danych

## Minimalny model `notifications`

```ts
Notification {
  id
  userId

  type

  title
  body
  link

  createdAt

  readAt

  relevanceUntil
  deleteAfter

  pushSentAt
  emailSentAt
}
```

---

# Znaczenie pól

## `readAt`

Moment przeczytania powiadomienia.

Jeśli ustawione:

- badge count maleje,
- escalation zatrzymuje się,
- push/email nie są już wysyłane.

---

## `relevanceUntil`

Do kiedy powiadomienie ma sens UXowo.

Przykłady:

### Reminder wydarzenia

```text
start wydarzenia + 1h
```

### Komentarz

```text
30 dni
```

### Security/payment

```text
null (bez wygaśnięcia)
```

---

## `deleteAfter`

Do kiedy rekord ma być przechowywany w bazie.

Nie każde notification powinno istnieć wiecznie.

---

# Strategia retencji

## Read notifications

Usuwane szybciej.

Przykład:

```text
readAt + 7 dni
```

---

## Unread notifications

Usuwane później.

Przykład:

```text
createdAt + 30 dni
```

---

## Prosty algorytm

```ts
if (readAt) {
  deleteAfter = readAt + 7d
} else {
  deleteAfter = createdAt + 30d
}
```

To jest wystarczające dla większości aplikacji.

---

# Kanały powiadomień

## 1. Realtime / in-app

Kanał podstawowy.

Odpowiada za:

- badge counter,
- dropdown,
- listę powiadomień,
- toast/snackbar.

Implementacja:

- WebSocket,
- lub SSE.

---

## 2. Web push

Kanał fallback.

Wysyłany wyłącznie jeśli:

- notification nadal unread,
- notification nadal relevant,
- push nie został jeszcze wysłany.

Przykładowy delay:

```text
5 minut
```

---

## 3. Email

Wyłącznie jako fallback.

Najlepiej jako:

- digest,
- zbiorczy email.

Nie:

```text
1 notification = 1 email
```

Przykład:

```text
You have 5 unread notifications
```

Przykładowy delay:

```text
1 godzina
```

---

# Flow systemu

## Tworzenie notification

```text
1. Powstaje event biznesowy
2. Tworzony jest rekord Notification
3. Notification emitowany realtime
4. Koniec
```

---

## Escalation

Cron uruchamiany np. co minutę:

### Web push

```sql
created_at < NOW() - INTERVAL '5 minutes'
AND read_at IS NULL
AND push_sent_at IS NULL
AND (
  relevance_until IS NULL
  OR relevance_until > NOW()
)
```

---

### Email digest

```sql
created_at < NOW() - INTERVAL '1 hour'
AND read_at IS NULL
AND email_sent_at IS NULL
AND (
  relevance_until IS NULL
  OR relevance_until > NOW()
)
```

---

# Frontend

# Bell icon

## Badge count

Pokazuje wyłącznie:

```text
unread + relevant
```

Czyli:

```sql
read_at IS NULL
AND (
  relevance_until IS NULL
  OR relevance_until > NOW()
)
```

---

# Bell dropdown

Minimalistyczny.

Pokazuje:

- unread,
- - kilka ostatnich read.

Maksymalnie:

```text
10–20 pozycji
```

Każdy item:

- title,
- relative time,
- link.

Bez:

- filtrów,
- archiwów,
- kategorii,
- threadów.

---

# Strona `/notifications`

Pokazuje:

- unread,
- recent read.

Zakres:

```text
ostatnie 30 dni
```

Bez:

- zaawansowanych filtrów,
- skomplikowanych widoków.

---

# Grupowanie powiadomień

## Na start: NIE implementować pełnego grupowania

Pełne grupowanie znacząco komplikuje:

- backend,
- logikę merge,
- UX,
- edge-case.

---

## Zamiast tego: prosty debounce agregacyjny

Przy tworzeniu notification:

Sprawdź czy istnieje unread notification:

- tego samego typu,
- dla tego samego entity,
- z ostatnich kilku minut.

Jeśli tak:

- aktualizuj istniejący rekord,
- zamiast tworzyć nowy.

Przykład:

Zamiast:

```text
Jan commented
Adam commented
Kasia commented
```

Otrzymujemy:

```text
3 new comments
```

To daje większość korzyści grupowania przy minimalnej złożoności.

---

# Czyszczenie danych

## Cleanup cron

Uruchamiany codziennie.

Usuwa expired notifications batchami.

Przykład:

```sql
DELETE FROM notifications
WHERE delete_after < NOW()
LIMIT 10000
```

---

# Dlaczego batchami?

Usuwanie ogromnej liczby rekordów jednorazowo może:

- blokować tabelę,
- generować duży WAL,
- pogarszać wydajność.

Batch delete jest bezpieczniejszy.

---

# Indeksy

Minimalny zestaw:

```sql
CREATE INDEX notifications_user_created_idx
ON notifications(user_id, created_at DESC);
```

```sql
CREATE INDEX notifications_delete_after_idx
ON notifications(delete_after);
```

```sql
CREATE INDEX notifications_unread_idx
ON notifications(user_id)
WHERE read_at IS NULL;
```

---

# Badge count — optymalizacja

Nie wykonywać:

```sql
COUNT(*)
```

na całej tabeli bez indeksów.

Na start wystarczy:

- partial index dla unread.

Przy większym ruchu można dodać:

```text
users.unread_notifications_count
```

aktualizowane transactionalnie.

---

# Czego NIE implementować na MVP

Nie wdrażać:

- notification threads,
- advanced categories,
- archive system,
- delivery tables,
- retry engine,
- per-channel preferences,
- machine learning priorities,
- rozbudowanego presence system,
- event sourcing,
- immutable audit log.

To znacząco komplikuje system bez proporcjonalnych korzyści.

---

# Docelowy efekt UX

## User aktywny

```text
event
→ realtime
→ user przeczytał
→ STOP
```

Brak:

- push,
- email,
- spamu.

---

## User nieaktywny

```text
event
→ realtime
→ brak reakcji
→ push
→ brak reakcji
→ email digest
```

User nadal zostaje skutecznie poinformowany.

---

# Finalna rekomendacja

Minimalny, ale bardzo dobry system powinien zawierać:

## Backend

- tabela `notifications`,
- realtime emit,
- cron escalation,
- cleanup cron,
- TTL/retention,
- podstawowe indeksy.

---

## Frontend

- bell icon,
- unread badge,
- dropdown,
- strona `/notifications`.

---

## Kanały

1. realtime/in-app
2. delayed web push
3. email digest

---

## Najważniejsza zasada

Nie chodzi o:

> „wysłać notification wszystkimi kanałami”.

Tylko o:

> „poinformować użytkownika możliwie najmniejszą liczbą interakcji”.
