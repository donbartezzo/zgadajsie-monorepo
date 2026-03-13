# MVP Platformy do Organizowania Lokalnych Wydarzeń Sportowych

## Cel MVP

Celem MVP nie jest zbudowanie pełnej platformy sportowej, lecz
**najłatwiejszego sposobu zebrania ludzi do gry**.

Użytkownik powinien być w stanie:

1.  znaleźć wydarzenie
2.  dołączyć do niego
3.  zaprosić znajomych
4.  zagrać mecz

---

# Zakres MVP (3--4 tygodnie developmentu)

## 1. Rejestracja i profil użytkownika

Minimalny onboarding:

- logowanie email / Google
- imię
- miasto
- preferowany sport

Profil użytkownika zawiera:

- imię
- miasto
- liczba rozegranych gier

Nie budujemy jeszcze:

- rankingów
- poziomów graczy
- statystyk

---

## 2. Lista wydarzeń

Widok listy wydarzeń pokazuje:

- sport
- datę i godzinę
- lokalizację
- liczbę uczestników
- liczbę wolnych miejsc

Przykład:

Piłka nożna --- dziś 19:00\
Orlik Zielona Góra\
7 / 10 graczy\
Brakuje 3 osób

### Filtry

- sport
- data
- miasto

---

## 3. Tworzenie wydarzenia

Formularz tworzenia wydarzenia:

- sport
- data
- godzina
- lokalizacja
- limit graczy
- cena (opcjonalnie)
- opis

Po publikacji wydarzenie otrzymuje **unikalny link**:

example.com/e/123

Ten link można udostępnić znajomym.

---

## 4. Dołączanie do wydarzenia

Użytkownik może kliknąć:

**Dołącz**

Status zapisu:

JOINED

Jeśli wydarzenie jest pełne:

WAITLIST

Na MVP nie budujemy jeszcze:

- zatwierdzania przez organizatora
- poziomów graczy
- płatności

---

## 5. Lista uczestników

Widok wydarzenia pokazuje listę graczy:

Gracze (7/10)

- Tomek
- Bartek
- Kuba
- Anna

Pokazywanie uczestników zwiększa **zaufanie i chęć dołączenia**.

---

## 6. Prosty system powiadomień

Powiadomienia systemowe:

- Dołączyłeś do wydarzenia
- Nowy gracz dołączył
- Brakuje 2 graczy do rozpoczęcia meczu

---

## 7. Przypomnienia o wydarzeniu

Automatyczne przypomnienia:

- 24 godziny przed wydarzeniem
- 2 godziny przed wydarzeniem

---

## 8. Czat wydarzenia

Prosty czat w formie komentarzy pod wydarzeniem.

Można używać do:

- ustalenia szczegółów
- informacji o spóźnieniu
- zadawania pytań

Nie budujemy pełnego komunikatora.

---

## 9. Rezygnacja z udziału

Uczestnik może kliknąć:

**Nie mogę przyjść**

System:

- usuwa uczestnika z wydarzenia
- zwalnia miejsce dla kolejnej osoby

---

## 10. Link zaproszenia

Każde wydarzenie posiada **link zaproszenia**.

Organizator lub uczestnicy mogą wysłać go np. przez:

- WhatsApp
- Messenger
- SMS

Przykładowa wiadomość:

Gramy dziś w piłkę o 19:00.\
Brakuje jeszcze 3 osób.

Dołącz:\
example.com/e/123

To jest kluczowy mechanizm viralności.

---

# Główny Flow MVP

1.  użytkownik tworzy wydarzenie
2.  wysyła link znajomym
3.  znajomi dołączają
4.  wydarzenie się zapełnia
5.  po meczu tworzone jest kolejne wydarzenie

---

# Proponowany Stack Technologiczny

Frontend: - Next.js

Backend: - Supabase / Firebase

Autoryzacja: - Google login

Hosting: - Vercel

Baza danych: - PostgreSQL

---

# Minimalny Model Danych

## Tabela: Users

- id
- name
- email
- city
- created_at

## Tabela: Events

- id
- title
- sport
- location
- date
- max_players
- creator_id

## Tabela: EventParticipants

- id
- event_id
- user_id
- status

Status może przyjmować wartości:

- JOINED
- WAITLIST
- LEFT

---

# Funkcje do zbudowania dopiero po MVP

Po walidacji produktu można dodać:

- reputację graczy
- płatności
- poziomy zaawansowania
- ranking graczy
- moderację wydarzeń
- odznaki i gamifikację

W MVP najważniejsze jest **szybkie zebranie ludzi do gry**.
