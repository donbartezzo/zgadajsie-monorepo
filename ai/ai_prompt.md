# Zadanie dla AI - Implementacja zadania w projekcie Zgadajsie

## Przegląd zadania

Twoim zadaniem jest implementacja frontendu dla aplikacji Zgadajsie zgodnie z dokumentacją projektu. Aplikacja umożliwia użytkownikom przeglądanie, tworzenie i zgłaszanie udziału w lokalnych wydarzeniach sportowych.

## Zakres prac

Celem jest zaimplementowanie 2 pierwszych stron:

1. **Strona główna (landing page)** - powinna zawierać:

   - Header z logo i nawigacją (przycisk logowania, rejestracji, informacje o aplikacji)
   - Sekcję hero z przyciskiem CTA ("Znajdź wydarzenie" lub "Dołącz teraz")
   - Sekcję wyjaśniającą główne funkcje aplikacji (min. 3 kluczowe funkcje z ikonami)
   - Sekcję z przykładowymi wydarzeniami (ostatnio dodane, max 4-6 wydarzeń)
   - Footer z linkami i informacją o prawach autorskich

2. **Strona z listingiem eventów** - powinna zawierać:
   - Filtrowanie według podstawowych parametrów:
     - Data wydarzenia (wybór z kalendarza)
     - Lokalizacja (pole tekstowe)
     - Status (dropdown: wszystkie/publiczne/prywatne)
   - Sortowanie po dacie rozpoczęcia (domyślnie od najbliższych)
   - Listę wydarzeń w formie kart z informacjami:
     - Czas trwania wydarzenia
     - Miejsce
     - Typ/dyscyplina
     - Obiekt
     - Koszt od osoby
     - Status wydarzenia (publiczne/prywatne)
   - Przycisk do tworzenia nowego wydarzenia (widoczny tylko dla zalogowanych)
   - Zarezerwowane miejsce na mapę (do wdrożenia później)

## Kryteria akceptacji

1. **Strona główna**:

   - Zawiera wszystkie wymagane sekcje
   - Jest responsywna (prawidłowe wyświetlanie na szerokościach: 320px, 768px, 1200px)
   - Stosuje komponenty Angular Material i style Tailwind
   - Działa poprawnie na urządzeniach mobilnych

2. **Strona z listingiem eventów**:

   - Wyświetla prawidłowo listę wydarzeń
   - Umożliwia filtrowanie i sortowanie
   - Pokazuje wszystkie wymagane dane wydarzenia
   - Rozróżnia dostęp dla zalogowanych/niezalogowanych użytkowników

3. **Ogólne**:
   - Kod zgodny ze styleguide'ami projektu
   - Brak błędów TypeScript/ESLint
   - Komponenty mają testy jednostkowe (opcjonalnie w MVP)
   - Szybkie ładowanie stron

## Podejście do implementacji

1. **Faza 1**: Analiza dokumentacji i struktury projektu
2. **Faza 2**: Implementacja komponentów strony głównej
3. **Faza 3**: Implementacja komponentów listingu wydarzeń
4. **Faza 4**: Integracja z API (lub przygotowanie mocków)
5. **Faza 5**: Testowanie i poprawki

---

## Dokumentacja projektu

Przed rozpoczęciem implementacji zapoznaj się z pełną dokumentacją projektu:

1. **Wymagania biznesowe:**

   - [PRD — Product Requirements Document](../docs/prd.md) - opis projektu, cele i funkcjonalności
   - [Plan rozwoju MVP](../docs/mvp-development-plan.md) - kamienie milowe i etapy wdrożenia

2. **Stack technologiczny i architektura:**

   - [Stack technologiczny](../docs/tech-stack.md) - używane technologie i narzędzia
   - [Struktura projektu](../docs/project-structure.md) - organizacja kodu w repozytorium

3. **Standardy kodowania:**

   - [Styleguide Frontend](../docs/styleguide-frontend.md) - konwencje dla kodu Angular
   - [Styleguide Backend](../docs/styleguide-backend.md) - konwencje dla kodu NestJS

4. **API i endpointy:**

   - [Dokumentacja API](../docs/api-endpoints.md) - opisy dostępnych endpointów

5. **Narzędzia:**
   - [Komendy projektowe](../docs/project-commands.md) - przydatne polecenia do pracy z projektem

## Pytania i rekomendacje

Przed i podczas implementacji notuj wszelkie pytania, uwagi, wątpliwości lub rekomendacje, które pojawią się w trakcie pracy. Możesz je umieścić w sekcjach poniżej:

<pytania>
[Wymień tutaj swoje pytania, ponumerowane dla jasności]
</pytania>

<rekomendacje>
[Wymień tutaj swoje zalecenia, ponumerowane dla jasności]
</rekomendacje>

Kontynuuj ten proces, generując nowe pytania i rekomendacje w oparciu o dotychczasowe odpowiedzi użytkownika, dopóki kwestie te nie zostaną wyczerpane/wyjaśnione lub użytkownik wyraźnie nie poprosi o zakończenie tego procesu i przejście do dalszej implementacji.
