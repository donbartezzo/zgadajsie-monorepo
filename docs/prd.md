# Product Requirements Document (PRD)

**Nazwa projektu:** Lokalna Społeczność Sportowa – MVP  
**Cel projektu:** Stworzenie aplikacji web/mobile umożliwiającej użytkownikom przeglądanie, tworzenie i zgłaszanie udziału w lokalnych wydarzeniach sportowych (MVP obejmuje wyłącznie piłkę nożną) z integracją PWA, powiadomieniami push oraz jedną lokalizacją geograficzną (jedno miasto w Polsce).

---

## 1. Problem użytkownika

Użytkownicy chcą łatwo znajdować lokalne wydarzenia sportowe, zgłaszać chęć udziału oraz tworzyć własne wydarzenia, w prosty i przejrzysty sposób, w jednej aplikacji dostępnej na web i mobile.

Problemy, które rozwiązuje aplikacja:

- Brak centralnego miejsca do przeglądania lokalnych wydarzeń sportowych.
- Trudność w zgłaszaniu chęci udziału i komunikacji z organizatorami wydarzeń.
- Brak historii i kontroli nad wydarzeniami dla organizatorów.

---

## 2. Zakres MVP

### 2.1 Funkcjonalności użytkownika

#### 2.1.1 Użytkownik niezalogowany

- Może przeglądać listę wszystkich wydarzeń w jednym mieście (tylko dane obowiązkowe: czas, miejsce, typ/dyscyplina, obiekt, koszt od osoby, status publiczne/prywatne).
- Nie może zgłaszać chęci udziału ani przeglądać danych opcjonalnych (opis, wiek, płeć, poziom).

#### 2.1.2 Użytkownik zalogowany

- Może zgłaszać chęć udziału w wydarzeniu publicznym.
- Może tworzyć własne wydarzenia (z możliwością ustawienia statusu prywatne/publiczne).
- Może edytować lub anulować swoje wydarzenia w każdej chwili, w tym po rozpoczęciu wydarzenia.
- Ma dostęp do historii swoich wydarzeń, ze wszystkimi danymi uczestników i szczegółami wydarzenia.

---

### 2.2 Dane wydarzenia

#### 2.2.1 Obowiązkowe

- Czas trwania wydarzenia (od kiedy do kiedy: dzień i godzina)
- Miejsce (adres oraz wskazanie dokładnego miejsca na mapie, pojedynczy marker)
- Typ/dyscyplina (piłka nożna w MVP)
- Obiekt (orlik, hala, balon, boisko syntetyczne/trawiaste itp.)
- Koszt od osoby (PLN)
- Status wydarzenia (publiczne/prywatne)

#### 2.2.2 Opcjonalne

- Opis wydarzenia
- Wiek uczestników (przedział)
- Płeć uczestników (tylko mężczyźni/chłopcy, tylko kobiety/dziewczyny, dowolna)
- Poziom uczestników (Rekreacyjny, Amatorski, Półzaawansowany, Zaawansowany, Półzawodowy)

---

### 2.3 Powiadomienia push

- Natychmiastowe powiadomienia dla wszystkich użytkowników, którzy zgłosili chęć udziału, w przypadku:
  - Zmiany statusu wydarzenia
  - Anulowania wydarzenia
  - Edycji kluczowych danych wydarzenia

---

### 2.4 Historia wydarzeń

- Historia dostępna tylko dla organizatora.
- Zawiera wszystkie szczegóły wydarzeń, w tym dane uczestników.
- Wydarzenia w historii są edytowalne przez organizatora.
- Możliwość sortowania po dacie rozpoczęcia (od najbliższych).

---

### 2.5 PWA i instalacja

- Obsługa instalacji na urządzeniach Android i iOS.
- Obsługa powiadomień push.
- Wersja offline: brak wymogu w MVP (opcjonalne rozszerzenie w przyszłości).

---

### 2.6 Geolokalizacja i mapy

- Integracja z mapą dla każdego wydarzenia (pojedynczy marker).
- Brak dodatkowych oznaczeń ani wieloczęściowych tras w MVP.

---

### 2.7 Uwierzytelnianie

- Obowiązkowy adres email przy rejestracji.
- Wsparcie dla uwierzytelniania społecznościowego (Google, Facebook).
- REST API zabezpieczone tak, aby tylko frontendowa aplikacja mogła korzystać z funkcji API.

---

## 3. Ograniczenia

- MVP obsługuje wyłącznie jedno miasto w Polsce.
- Brak limitów uczestników ani limitów liczby wydarzeń dla organizatora.
- Brak filtrów wyszukiwania i sortowania w liście wydarzeń poza sortowaniem po dacie rozpoczęcia.
- Brak płatności w aplikacji (tylko informacja o koszcie od osoby).
- Brak testów automatycznych w MVP (do wdrożenia w kolejnych etapach).
- Brak rozwiązań rekomendacyjnych opartych na AI w MVP.
- Brak wsparcia dla wielu języków (tylko polski).

---

## 4. Kryteria sukcesu MVP

- Liczba aktywnych użytkowników zarejestrowanych w aplikacji.
- Liczba utworzonych wydarzeń w systemie.
- Stabilne działanie PWA na web i mobile.
- Poprawne powiadomienia push dla zgłoszonych uczestników.
- Sprawne tworzenie, edytowanie i anulowanie wydarzeń przez organizatorów.

---

## 5. Harmonogram i rozwój

- Faza MVP obejmuje:
  - Web i mobile (PWA) z jednym codebase w Angular + NestJS + Nx monorepo.
  - Integrację z mapą i powiadomieniami push.
  - Tworzenie, edytowanie, anulowanie wydarzeń.
  - Zgłaszanie chęci udziału i historia wydarzeń dla organizatora.
- Funkcjonalności planowane na późniejszy etap:
  - Czat i komentarze w wydarzeniach
  - Płatności w aplikacji
  - Filtrowanie i rekomendacje AI
  - Wersja offline PWA i archiwum dla uczestników

---

## 6. Stack technologiczny

Pełen stack technologiczny znajduję się w pliku: docs/tech-stack.md

---

## 7. Ryzyka i rekomendacje

1. Sprawdzenie wymogów prawnych dotyczących danych użytkowników (adres email, lokalizacja).
2. Zaplanowanie mechanizmu zabezpieczenia REST API, aby ograniczyć dostęp tylko do frontendowej aplikacji.
3. Ustalenie procedur powiadomień push w czasie rzeczywistym, aby uniknąć nadmiernego obciążenia systemu.
4. Przygotowanie wyraźnego podziału danych obowiązkowych i opcjonalnych w backendzie i frontendzie.
5. Określenie reguł edycji wydarzeń po rozpoczęciu oraz zmiany statusu prywatne/publiczne.
6. Zdefiniowanie jasnych zasad integracji map i prezentacji lokalizacji wydarzeń.

---

## 8. Pytania i odpowiedzi:

1. Czy masz już wybraną konkretną mapową usługę (np. Google Maps, Mapbox, OpenStreetMap) do integracji mapy wydarzeń? Czy preferujesz rozwiązanie open-source czy komercyjne?
   Odp: Do ustalenia w późniejszym etapie, zaraz przed wdrażaniem map. Preferuję rozwiązania open-source.

2. Czy masz preferencje co do usługi powiadomień push (np. Firebase Cloud Messaging, OneSignal, Web Push API)? Czy powiadomienia mają działać także na iOS (PWA push na iOS ma ograniczenia)?
   Odp: Nie mam jeszcze preferencji w tym zakresie, liczę na twoje zalecenia - do ustalenia przed wdrażąniem powiadomień push. Powiadomienia powinny dzialać także na iOS.

3. Czy rejestracja/logowanie społecznościowe (Google, Facebook) ma być realizowane przez konkretnego dostawcę (np. Firebase Auth, Auth0, własna implementacja)?
   Odp: Liczę na twoje zalecenia - do ustalenia w późniejszym etapie.

4. Czy backend (NestJS) ma być również tworzony od zera w tym monorepo, czy będzie korzystał z istniejących rozwiązań?
   Odp: Od zera.

5. Czy masz preferencje co do bazy danych (np. PostgreSQL, MongoDB, inna)?
   Odp: zależy mi na relacyjnej bazie danych, ale to też kwestia do ustalenia i liczę na twoje zalecenia.

6. Czy aplikacja ma być hostowana w chmurze (np. Vercel, AWS, GCP, Azure) czy na własnej infrastrukturze?
   Odp: Na własnej - do MVP będzie to serwer współdzielny.

7. Czy przewidujesz jakiekolwiek integracje z zewnętrznymi systemami (np. płatności w przyszłości, SMS, inne)?
   Odp: W przyszłości tak ale do MVP nie.

8. Czy masz już wypracowany system zarządzania stanem w Angularze (np. NgRx, Akita, Signals, czy coś innego)?
   Odp: Liczę tu na twoje zalecenia.

9. Czy są jakieś wymagania dotyczące accessibility (WCAG) lub SEO (np. SSR, prerendering)?
   Odp: Nie ma wymagań, możesz proponować jeśli zajdzie tego potrzeba.

10. Czy masz preferencje co do stylowania (CSS-in-JS, Tailwind, Angular Material, inny framework)?
    Odp: Tak jak wspomniane było w stacku technologicznym: musi to być: Angular Material, Tailwind CSS oraz czysty SCSS

11. Czy plik tech-stack.md zawiera już kompletną listę narzędzi i bibliotek, czy mam ją uzupełnić/proponować na podstawie PRD?
    Odp: Możesz śmiało proponować - z chęcią wysłucham twoich zaleceń.

12. Czy plik styleguide.md zawiera szczegółowe wytyczne dotyczące architektury, nazewnictwa, struktury folderów, testów, CI/CD, czy mam zaproponować standardy?
    Odp: Zawiera te najistotniejsze wedlug mnie, ale możesz zaproponować swoje.

13. Czy masz preferencje co do narzędzi do zarządzania monorepo (np. Nx, Turborepo), czy trzymamy się Nx (zgodnie z PRD)?
    Odp: Nie zamykam się tylko na Nx - możesz proponować inne narzędzia.

14. Czy backend (NestJS) oraz frontend (Angular) mają być rozwijane równolegle w jednym repozytorium, czy zaczynamy od frontendu?
    Odp: Możemy zaczać od frontendu ale MVP musi zawierać też backend.

15. Czy masz już wybraną usługę do hostowania bazy danych (np. lokalnie, na serwerze współdzielonym, czy w chmurze)?
    Odp: Do MVP baza będzie hostowana na serwerze współdzielnonym, a dalej to się okaże.

16. Czy masz preferencje co do systemu powiadomień push (np. Web Push API, Firebase Cloud Messaging), czy mam zaproponować rozwiązanie?
    Odp: Nie mam jeszcze preferencji w tym zakresie, liczę na twoje zalecenia - do ustalenia przed wdrażąniem powiadomień push.

17. Czy chcesz, aby aplikacja była od razu przygotowana pod deployment produkcyjny (np. Docker, CI/CD), czy skupiamy się na MVP i development build?
    Na razie tylko MVP i development build.

18. Czy masz już wybraną mapową usługę (np. Leaflet, MapLibre, Google Maps), czy mam zaproponować open-source rozwiązanie?
    Odp: Do ustalenia w późniejszym etapie, zaraz przed wdrażaniem map. Liczę na twoje zalecenia. Preferuję rozwiązania open-source.

19. Czy przewidujesz jakiekolwiek integracje z zewnętrznymi API (np. do autoryzacji społecznościowej) już na etapie MVP?
    Odp: Tak.

20. Czy masz preferencje co do narzędzi do testowania (np. Cypress, Playwright, Jest), mimo że testy automatyczne są poza MVP?
    Odp: Nie mam jeszcze preferencji w tym zakresie - liczę na twoje zalecenia.
