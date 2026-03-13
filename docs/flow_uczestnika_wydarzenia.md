# Flow uczestnika i wymagania -- platforma do zgadywania się na lokalne wydarzenia sportowe

## 1. Główne role w systemie

### Organizator wydarzenia

- tworzy wydarzenie
- ustala zasady uczestnictwa
- zatwierdza uczestników
- zarządza listą uczestników

### Uczestnik

- przegląda wydarzenia
- zgłasza chęć udziału
- spełnia wymagania
- zostaje zaakceptowany lub trafia na listę rezerwową

### Platforma

- pilnuje płatności
- zarządza reputacją
- obsługuje komunikację
- wysyła powiadomienia

---

# 2. Flow uczestnika (pełna ścieżka)

## 1. Rejestracja użytkownika

**Minimalne dane:** - email / Google / Apple - imię - miasto /
lokalizacja - preferowane sporty

**Opcjonalne:** - poziom zaawansowania - wiek - zdjęcie profilowe

Cel: organizator musi wiedzieć kogo dopuszcza.

---

## 2. Przeglądanie wydarzeń

Użytkownik widzi listę wydarzeń z filtrami:

- sport
- lokalizacja
- data
- poziom gry
- cena
- wolne miejsca

Widok wydarzenia powinien pokazywać:

- opis
- liczba miejsc
- lista uczestników
- poziom gry
- cena
- zasady uczestnictwa
- organizator

---

## 3. Zgłoszenie chęci udziału

Kliknięcie:

**„Chcę wziąć udział"**

Użytkownik musi:

- potwierdzić dostępność
- zaakceptować zasady
- spełnić wymagania wydarzenia

Może też napisać wiadomość do organizatora.

Przykład:

> Gram regularnie, poziom średniozaawansowany.

Status zgłoszenia:

`PENDING`

---

## 4. Weryfikacja wymagań wydarzenia

System automatycznie sprawdza:

### wymagania twarde

np.

- minimalny wiek
- poziom gry
- płeć (np. liga kobiet)
- liczba miejsc

Jeśli spełnia wymagania → trafia do organizatora.

---

## 5. Decyzja organizatora

Organizator widzi listę zgłoszeń:

użytkownik poziom opinie wiadomość

---

Może:

- zaakceptować
- odrzucić
- dodać na listę rezerwową

---

## 6. Po akceptacji

Status:

`APPROVED`

Uczestnik dostaje:

- powiadomienie
- szczegóły wydarzenia
- dostęp do czatu wydarzenia

---

## 7. Płatność (jeśli wydarzenie jest płatne)

Opcje:

### wariant A -- płatność po akceptacji

Najbezpieczniejszy UX.

### wariant B -- płatność przy zgłoszeniu

Zwrot jeśli uczestnik zostanie odrzucony.

Najlepszy UX:

blokada środków → pobranie środków po wydarzeniu.

---

## 8. Przed wydarzeniem

System wysyła:

- przypomnienie 24h przed wydarzeniem
- przypomnienie 3h przed wydarzeniem

Uczestnik może:

- zrezygnować
- znaleźć zastępstwo

---

## 9. Wydarzenie

Organizator oznacza:

- uczestników obecnych
- uczestników nieobecnych

---

## 10. Po wydarzeniu

Uczestnicy mogą:

- wystawić ocenę
- zostawić opinię

Powstaje reputacja gracza.

---

# 3. Statusy uczestnika

Prosty system statusów:

    INTERESTED
    PENDING
    APPROVED
    WAITLIST
    REJECTED
    CANCELLED
    ATTENDED
    NO_SHOW

---

# 4. Wymagania jakie może ustawić organizator

## Poziom sportowy

np.

- beginner
- intermediate
- advanced

lub skala 1--5.

---

## Limit uczestników

np.

- 10 graczy
- 2 osoby rezerwowe

---

## Wiek

np.

- 18+
- 30+

---

## Płeć

opcjonalne:

- tylko kobiety
- mix

---

## Reputacja gracza

np. minimalna ocena:

⭐ 3.5

---

## Historia uczestnictwa

np.

- maksymalnie 2 no-show
- minimum 3 rozegrane gry

---

## Płatność

- darmowe
- składka
- dzielony koszt boiska

---

# 5. System reputacji uczestników

Po wydarzeniu uczestnicy oceniają:

- punktualność
- poziom gry
- atmosferę

Profil gracza może wyglądać tak:

    Rozegrane mecze: 27
    No-show: 1
    Ocena: 4.7
    Poziom: intermediate

---

# 6. System kar

Największy problem takich platform to **no-show**.

Propozycja systemu:

- 1 raz → ostrzeżenie
- 2 raz → blokada 7 dni
- 3 raz → blokada 30 dni

---

# 7. Lista rezerwowa

Jeśli ktoś zrezygnuje:

    WAITLIST #1 → APPROVED

System automatycznie przenosi kolejną osobę.

---

# 8. Czat wydarzenia

Po akceptacji uczestnicy dostają dostęp do czatu wydarzenia.

Może służyć do:

- ustalenia składu
- zmiany godziny
- organizacji transportu
- kontaktu przed meczem

---

# 9. Powiadomienia

Uczestnik dostaje powiadomienia o:

- zaakceptowaniu zgłoszenia
- odrzuceniu zgłoszenia
- przypomnieniu o wydarzeniu
- zmianach w wydarzeniu
- zwolnieniu miejsca z listy rezerwowej

---

# 10. Co platforma powinna weryfikować

### Konto użytkownika

- email
- telefon (opcjonalnie)

### Antyspam

- limit tworzonych wydarzeń
- limit zgłoszeń

---

# 11. Idealny UX zgłoszenia

    1 klik → zgłoś się
    ↓
    system sprawdza wymagania
    ↓
    organizator zatwierdza
    ↓
    płatność
    ↓
    czat wydarzenia

---

# 12. Najważniejsze metryki produktu

Warto mierzyć:

- procent wydarzeń które się odbyły
- no-show rate
- średnią liczbę zgłoszeń na wydarzenie
- czas potrzebny do zapełnienia wydarzenia

---

# 13. Funkcja zwiększająca retencję

**„Zagraj ponownie z tą ekipą"**

Po wydarzeniu platforma może zaproponować szybkie stworzenie kolejnego
wydarzenia z tymi samymi uczestnikami.

---

# 14. Największe ryzyka dla platformy

Platformy tego typu upadają gdy:

- wydarzenia się nie zapełniają
- występuje dużo no-show

Dlatego kluczowe są:

- system reputacji
- lista rezerwowa
- przypomnienia przed wydarzeniem
