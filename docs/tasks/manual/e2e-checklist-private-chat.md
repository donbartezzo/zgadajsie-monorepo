# E2E Checklist: Prywatny czat → Push po 5 min, Email digest po 60 min

## Cel

Zweryfikować, że powiadomienia o prywatnych wiadomościach są wysyłane:

- Push: dopiero po 5 minutach
- Email digest: dopiero po 60 minutach

## Warunki wstępne

- Backend i frontend uruchomione lokalnie
- Dwa konta testowe: organizator i uczestnik
- Event testowy w fazie OPEN_ENROLLMENT
- Uczestnik zapisany na event
- Włączone powiadomienia push w przeglądarce uczestnika
- Skonfigurowany email dla uczestnika (do weryfikacji email digest)

## Checklist

### 1. Przygotowanie

- [ ] Zaloguj się jako uczestnik
- [ ] Dołącz do event testowego (jeśli nie jesteś już uczestnikiem)
- [ ] Upewnij się, że przeglądarka uczestnika zezwala na powiadomienia push
- [ ] Zaloguj się jako organizator w osobnej przeglądarce/incognito

### 2. Wysłanie prywatnej wiadomości

- [ ] Jako organizator, otwórz prywatny czat z uczestnikiem
- [ ] Wyślij wiadomość "Test 1"
- [ ] Zaczekaj 1 minutę
- [ ] Wyślij wiadomość "Test 2"
- [ ] Zaczekaj 1 minutę
- [ ] Wyślij wiadomość "Test 3"

### 3. Weryfikacja opóźnienia push (0-5 min)

- [ ] **0-4 min:** Sprawdź, że brak powiadomienia push w przeglądarce uczestnika
- [ ] **5 min:** Sprawdź, że powiadomienie push pojawiło się
- [ ] Sprawdź tytuł push: powinien być "3× Nowa wiadomość – [event title]" (zagregowane)
- [ ] Sprawdź, że tylko jedno powiadomienie push (nie 3)

### 4. Weryfikacja w bazie danych (push)

- [ ] Po 1 min: sprawdź DB → `Notification` dla uczestnika powinno mieć `pushSentAt = null`
- [ ] Po 5 min: sprawdź DB → `Notification` powinno mieć `pushSentAt` ustawione
- [ ] Sprawdź DB → `aggregateCount` powinno być = 3
- [ ] Sprawdź DB → `groupKey` powinno być `pm:[eventId]:[organizerId]`

### 5. Weryfikacja opóźnienia email digest (5-60 min)

- [ ] **5-59 min:** Sprawdź skrzynkę email uczestnika → brak email digest
- [ ] **60 min:** Sprawdź skrzynkę email uczestnika → email digest powinien pojawić się
- [ ] Sprawdź treść email: powinien zawierać 3 wiadomości w jednym digest
- [ ] Sprawdź DB → `Notification` powinno mieć `emailSentAt` ustawione

### 6. Weryfikacja w bazie danych (email)

- [ ] Po 30 min: sprawdź DB → `Notification` powinno mieć `emailSentAt = null`
- [ ] Po 60 min: sprawdź DB → `Notification` powinno mieć `emailSentAt` ustawione
- [ ] Sprawdź DB → `type` powinno być `NEW_PRIVATE_MESSAGE`
- [ ] Sprawdź DB → `emailMode` w policy powinno być `DIGEST`

### 7. Test odczytu wiadomości (opcjonalne)

- [ ] Jako uczestnik, otwórz prywatny czat
- [ ] Sprawdź, że `readAt` w DB jest ustawione dla notyfikacji
- [ ] Sprawdź, że po odczycie nie są wysyłane kolejne push/email

## Oczekiwany wynik

- Push wysyłany dopiero po 5 min od `updatedAt`
- Email digest wysyłany dopiero po 60 min od `updatedAt`
- Agregacja działa poprawnie (1 rekord, 1 push, 1 email digest dla 3 wiadomości)
- Odczyt wiadomości nie wyzwala nowych powiadomień

## Znane problemy

- Jeśli cron escalation nie działa, push/email mogą nie zostać wysłane wcale
- Jeśli `updatedAt` nie jest używany, powiadomienia mogą być wysyłane natychmiast
- Email digest może nie działać, jeśli brak skonfigurowanego SMTP
