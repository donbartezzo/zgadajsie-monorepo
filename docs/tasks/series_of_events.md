# System powtarzalnych wydarzeń (interwały / serie) — plan wdrożenia

## 🎯 Cel

Wdrożenie prostego, skalowalnego i łatwego w utrzymaniu systemu powtarzalnych wydarzeń, który:

- nie próbuje być pełnym kalendarzem (RRULE),
- opiera się na duplikacji wydarzeń,
- generuje wydarzenia w czasie (cron),
- pozwala na niezależną edycję każdego wydarzenia,
- jest przewidywalny i prosty UXowo.

---

# 🧠 Główne założenia

1. Każde wydarzenie jest osobnym bytem (rekordem w DB)
2. Seria = konfiguracja generowania kolejnych wydarzeń
3. Wydarzenia są tworzone:
   - przy tworzeniu serii (pierwsze + buffer)
   - przez cron (kolejne)
4. Edycja serii wpływa tylko na przyszłość
5. Brak RRULE — tylko:
   - `intervalDays`
   - `daysOfWeek`

---

# 🗂️ Model danych

## EventSeries

```ts
EventSeries {
  id: string
  organizerId: string

  name: string

  recurrenceType: 'INTERVAL' | 'WEEKLY'

  intervalDays?: number        // np. 7
  daysOfWeek?: number[]        // np. [1,4] (pon, czw)

  time: string                 // "20:00"
  timezone: string             // "Europe/Warsaw"

  startDate: Date
  endDate?: Date | null

  nextGenerationAt: Date
  lastGeneratedAt: Date

  isActive: boolean

  createdAt: Date
  updatedAt: Date
}
```

---

## Event

```ts
Event {
  id: string

  seriesId?: string | null

  startsAt: Date
  endsAt: Date

  status: 'active' | 'cancelled'

  createdAt: Date
}
```

---

## 🔒 Constraint (MUST HAVE)

```sql
UNIQUE(series_id, starts_at)
```

Zapobiega duplikatom przy cron / retry.

---

# 🔁 Logika powtarzalności

## Typy:

### 1. INTERVAL

- co X dni
- przykład: co 7 dni

### 2. WEEKLY

- konkretne dni tygodnia
- przykład: pon + czw

---

# ⏱️ Generowanie wydarzeń

## Strategia: buffer (rolling window)

- zawsze generujemy wydarzenia do przodu
- np. `today + 30 dni`

---

## Algorytm (cron)

```ts
for each active series:
  while (lastGeneratedAt < now + 30 days):
    nextDate = computeNextDate(series)

    try:
      insert event
    catch UNIQUE:
      skip

    update lastGeneratedAt
    update nextGenerationAt
```

---

## computeNextDate()

### INTERVAL

```ts
next = lastDate + intervalDays;
```

---

### WEEKLY

- znajdź najbliższy dzień tygodnia > lastDate
- uwzględnij timezone i godzinę

---

# 🌍 Obsługa czasu (DST)

## Zasada:

👉 godzina lokalna NIE może się zmieniać

---

## Trzymamy:

```ts
timezone: 'Europe/Warsaw';
time: '20:00';
```

---

## Generowanie:

- używać Luxon
- operować na local time + timezone
- NIE dodawać "7 dni" na UTC

---

# 🧩 Frontend (Angular)

## Komponent: `recurrence-picker`

### Model

```ts
type Recurrence =
  | { type: 'INTERVAL'; intervalDays: number }
  | { type: 'WEEKLY'; daysOfWeek: number[] };
```

---

## UI

### 1. Tryb

- Co X dni
- Dni tygodnia

---

### 2. INTERVAL

```
Powtarzaj co: [ 7 ] dni
```

---

### 3. WEEKLY

```
[ Pn ][ Wt ][ Śr ][ Czw ][ Pt ][ Sb ][ Nd ]
```

---

## 🔥 Preview (MUST HAVE)

```
Następne terminy:
• pon 13.05 20:00
• czw 16.05 20:00
• pon 20.05 20:00
```

---

## Stack frontendowy

- Angular 20 (standalone)
- Angular CDK → a11y + keyboard
- Tailwind → UI
- Luxon → daty

---

# 🛠️ Backend (NestJS)

## Endpointy

### Tworzenie serii

```
POST /event-series
```

- tworzy serię
- generuje pierwsze wydarzenia (buffer)

---

### Edycja serii

```
PATCH /event-series/:id
```

- update config
- DELETE przyszłe eventy
- regeneracja

---

### Usunięcie serii

```
DELETE /event-series/:id
```

- ustawia `isActive = false`
- NIE usuwa istniejących eventów

---

### Masowe operacje

```
PATCH /event-series/:id/events
```

```json
{
  "scope": "future",
  "action": "cancel" | "delete" | "update"
}
```

---

# 🔁 Cron (NestJS)

- `@nestjs/schedule`
- uruchamiany np. co 1h

---

## Logika

- wybierz tylko serie:

```sql
WHERE isActive = true
AND nextGenerationAt <= now()
```

---

# ⚙️ Edycja zachowania

## Zasady:

### ✔ zmiana serii:

- nie rusza istniejących eventów

### ✔ ale:

- usuwa przyszłe eventy
- generuje nowe

---

# ⚠️ Edge cases

## 1. Duplikaty

✔ rozwiązanie: UNIQUE constraint

---

## 2. DST

✔ rozwiązanie: timezone + local time

---

## 3. Brak wydarzeń w przyszłości

✔ rozwiązanie: buffer (30 dni)

---

## 4. Zmiana dni tygodnia

✔ rozwiązanie:

- delete future
- regenerate

---

# 🚫 Świadome ograniczenia (V1)

Nie wspieramy:

- „ostatni piątek miesiąca”
- „pierwszy poniedziałek”
- RRULE
- custom kalendarzy

---

# 📈 Rozwój (V2)

Możliwe rozszerzenia:

- intervalWeeks
- monthly pattern
- „co drugi wtorek”
- zaawansowany preview

---

# 🧠 Najważniejsze decyzje

1. Seria ≠ event
2. Duplikacja zamiast generowania na bieżąco
3. Buffer zamiast pełnej generacji
4. Brak wpływu na istniejące eventy
5. Prosty UX zamiast elastyczności

---

# ✅ TL;DR

System opiera się na:

- prostym modelu (`intervalDays`, `daysOfWeek`)
- generowaniu wydarzeń przez cron
- buforze przyszłych wydarzeń
- pełnej niezależności eventów

👉 daje:

- stabilność
- prostotę
- skalowalność
