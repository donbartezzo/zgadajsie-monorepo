# Dokumentacja API Zgadajsie

Ten dokument zawiera opis dostępnych endpointów API w aplikacji Zgadajsie.

## Podstawowe informacje

- Bazowy URL API: `/api`
- Format danych: JSON
- Autoryzacja: Bearer Token (JWT)
- Obsługiwane metody: GET, POST, PUT, DELETE

## Endpointy - Wydarzenia

### Pobieranie listy wydarzeń

```
GET /api/events
```

Pobiera listę wszystkich wydarzeń z opcjonalną filtracją.

**Parametry zapytania:**
- `city` (opcjonalny) - filtrowanie po mieście
- `date` (opcjonalny) - filtrowanie po dacie (format: YYYY-MM-DD)
- `sportType` (opcjonalny) - filtrowanie po typie sportu
- `status` (opcjonalny) - filtrowanie po statusie wydarzenia (public/private)

**Odpowiedź:**
```json
{
  "events": [
    {
      "id": "uuid",
      "startTime": "2025-10-20T18:00:00Z",
      "endTime": "2025-10-20T20:00:00Z",
      "location": "ul. Przykładowa 123, Warszawa",
      "coordinates": { "lat": 52.229676, "lng": 21.012229 },
      "sportType": "football",
      "facility": "orlik",
      "costPerPerson": 15,
      "status": "public",
      "description": "Opis wydarzenia...",
      "ageRange": { "min": 18, "max": 50 },
      "gender": "any",
      "level": "amateur"
    }
    // więcej wydarzeń...
  ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

### Szczegóły wydarzenia

```
GET /api/events/{id}
```

Pobiera szczegóły konkretnego wydarzenia.

**Parametry:**
- `id` - identyfikator wydarzenia

**Odpowiedź:**
```json
{
  "id": "uuid",
  "startTime": "2025-10-20T18:00:00Z",
  "endTime": "2025-10-20T20:00:00Z",
  "location": "ul. Przykładowa 123, Warszawa",
  "coordinates": { "lat": 52.229676, "lng": 21.012229 },
  "sportType": "football",
  "facility": "orlik",
  "costPerPerson": 15,
  "status": "public",
  "description": "Opis wydarzenia...",
  "ageRange": { "min": 18, "max": 50 },
  "gender": "any",
  "level": "amateur",
  "organizer": {
    "id": "uuid",
    "name": "Jan Kowalski"
  },
  "participants": [
    {
      "id": "uuid",
      "name": "Adam Nowak"
    }
    // więcej uczestników...
  ]
}
```

### Tworzenie nowego wydarzenia

```
POST /api/events
```

Tworzy nowe wydarzenie.

**Wymagana autoryzacja:** Tak

**Dane wejściowe:**
```json
{
  "startTime": "2025-10-20T18:00:00Z",
  "endTime": "2025-10-20T20:00:00Z",
  "location": "ul. Przykładowa 123, Warszawa",
  "coordinates": { "lat": 52.229676, "lng": 21.012229 },
  "sportType": "football",
  "facility": "orlik",
  "costPerPerson": 15,
  "status": "public",
  "description": "Opis wydarzenia...",
  "ageRange": { "min": 18, "max": 50 },
  "gender": "any",
  "level": "amateur"
}
```

**Odpowiedź:**
```json
{
  "id": "uuid",
  "startTime": "2025-10-20T18:00:00Z",
  "endTime": "2025-10-20T20:00:00Z",
  "location": "ul. Przykładowa 123, Warszawa",
  "coordinates": { "lat": 52.229676, "lng": 21.012229 },
  "sportType": "football",
  "facility": "orlik",
  "costPerPerson": 15,
  "status": "public",
  "description": "Opis wydarzenia...",
  "ageRange": { "min": 18, "max": 50 },
  "gender": "any",
  "level": "amateur",
  "createdAt": "2025-10-18T12:00:00Z"
}
```

### Aktualizacja wydarzenia

```
PUT /api/events/{id}
```

Aktualizuje istniejące wydarzenie.

**Wymagana autoryzacja:** Tak (tylko organizator wydarzenia)

**Parametry:**
- `id` - identyfikator wydarzenia

**Dane wejściowe:** 
Takie same jak przy tworzeniu wydarzenia.

**Odpowiedź:**
```json
{
  "id": "uuid",
  "startTime": "2025-10-21T18:00:00Z", // zaktualizowane pole
  "endTime": "2025-10-21T20:00:00Z", // zaktualizowane pole
  "location": "ul. Przykładowa 123, Warszawa",
  "coordinates": { "lat": 52.229676, "lng": 21.012229 },
  "sportType": "football",
  "facility": "orlik",
  "costPerPerson": 15,
  "status": "public",
  "description": "Opis wydarzenia...",
  "ageRange": { "min": 18, "max": 50 },
  "gender": "any",
  "level": "amateur",
  "updatedAt": "2025-10-18T14:30:00Z"
}
```

### Usunięcie wydarzenia

```
DELETE /api/events/{id}
```

Usuwa wydarzenie.

**Wymagana autoryzacja:** Tak (tylko organizator wydarzenia)

**Parametry:**
- `id` - identyfikator wydarzenia

**Odpowiedź:**
```json
{
  "message": "Wydarzenie zostało usunięte"
}
```

### Zgłoszenie chęci udziału w wydarzeniu

```
POST /api/events/{id}/participate
```

Rejestruje użytkownika jako uczestnika wydarzenia.

**Wymagana autoryzacja:** Tak

**Parametry:**
- `id` - identyfikator wydarzenia

**Odpowiedź:**
```json
{
  "message": "Zgłoszenie przyjęte",
  "event": {
    "id": "uuid",
    "title": "Nazwa wydarzenia",
    "startTime": "2025-10-20T18:00:00Z"
  }
}
```

### Rezygnacja z udziału w wydarzeniu

```
DELETE /api/events/{id}/participate
```

Usuwa użytkownika z listy uczestników wydarzenia.

**Wymagana autoryzacja:** Tak

**Parametry:**
- `id` - identyfikator wydarzenia

**Odpowiedź:**
```json
{
  "message": "Zrezygnowano z udziału w wydarzeniu"
}
```

## Endpointy - Użytkownicy

### Rejestracja

```
POST /api/auth/register
```

Rejestruje nowego użytkownika.

**Dane wejściowe:**
```json
{
  "email": "jan.kowalski@example.com",
  "password": "silneHasło123!",
  "name": "Jan Kowalski"
}
```

**Odpowiedź:**
```json
{
  "id": "uuid",
  "email": "jan.kowalski@example.com",
  "name": "Jan Kowalski",
  "createdAt": "2025-10-18T10:00:00Z",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logowanie

```
POST /api/auth/login
```

Loguje użytkownika.

**Dane wejściowe:**
```json
{
  "email": "jan.kowalski@example.com",
  "password": "silneHasło123!"
}
```

**Odpowiedź:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "jan.kowalski@example.com",
    "name": "Jan Kowalski"
  }
}
```

### Profil użytkownika

```
GET /api/users/me
```

Pobiera profil zalogowanego użytkownika.

**Wymagana autoryzacja:** Tak

**Odpowiedź:**
```json
{
  "id": "uuid",
  "email": "jan.kowalski@example.com",
  "name": "Jan Kowalski",
  "eventsOrganized": 5,
  "eventsParticipated": 12,
  "createdAt": "2025-09-01T12:00:00Z"
}
```

## Kody błędów

- `400 Bad Request` - nieprawidłowe dane wejściowe
- `401 Unauthorized` - brak autoryzacji
- `403 Forbidden` - brak uprawnień
- `404 Not Found` - zasób nie znaleziony
- `500 Internal Server Error` - wewnętrzny błąd serwera

## Uwagi

- Wszystkie daty są w formacie ISO 8601 (UTC)
- API obsługuje paginację za pomocą parametrów `page` i `limit` dla endpointów zwracających listy
- W przypadku błędu, API zwraca obiekt z polami `message` i opcjonalnie `details`