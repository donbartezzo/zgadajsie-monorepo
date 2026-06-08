# E2E Checklist: Notyfikacja → Push dopiero po 5 min

## Cel

Zweryfikować, że powiadomienia push są wysyłane dopiero po 5 minutach od utworzenia (nie natychmiast).

## Warunki wstępne

- Backend i frontend uruchomione lokalnie
- Użytkownik testowy z włączonymi powiadomieniami push w przeglądarce
- Event testowy w fazie OPEN_ENROLLMENT

## Checklist

### 1. Przygotowanie

- [ ] Zaloguj się jako użytkownik testowy
- [ ] Dołącz do event testowego (jeśli nie jesteś już uczestnikiem)
- [ ] Upewnij się, że przeglądarka zezwala na powiadomienia push
- [ ] Otwórz DevTools → Application → Service Workers (opcjonalnie, do debugowania)

### 2. Wyzwalanie notyfikacji

- [ ] Jako organizator, zaakceptuj zgłoszenie użytkownika testowego (PARTICIPATION_STATUS)
- [ ] Lub wyślij komunikat do uczestników (ANNOUNCEMENT)
- [ ] Lub anuluj event (EVENT_CANCELLED)

### 3. Weryfikacja opóźnienia push

- [ ] **0-4 min:** Sprawdź, że brak powiadomienia push w przeglądarce
- [ ] **5 min:** Sprawdź, że powiadomienie push pojawiło się
- [ ] **5+ min:** Sprawdź, że tylko jedno powiadomienie (nie duplikaty)

### 4. Weryfikacja w bazie danych

- [ ] Po 1 min: sprawdź DB → `Notification` powinno mieć `pushSentAt = null`
- [ ] Po 5 min: sprawdź DB → `Notification` powinno mieć `pushSentAt` ustawione
- [ ] Sprawdź DB → `updatedAt` powinno być ≤ 5 min temu (nie `createdAt`)

### 5. Test agregacji (opcjonalne)

- [ ] W ciągu 5 min wyślij 3 powiadomienia tego samego typu (np. 3× PARTICIPATION_STATUS)
- [ ] Sprawdź DB → powinien być 1 rekord z `aggregateCount = 3`
- [ ] Po 5 min: sprawdź, że tylko 1 push (nie 3)

## Oczekiwany wynik

- Push wysyłany dopiero po 5 min od `updatedAt` (nie `createdAt`)
- Agregacja działa poprawnie (1 rekord, 1 push dla wielu zdarzeń)
- Brak duplikatów push

## Znane problemy

- Jeśli cron escalation nie działa, push może nie zostać wysłany wcale
- Jeśli `updatedAt` nie jest używany, push może być wysyłany natychmiast po agregacji
