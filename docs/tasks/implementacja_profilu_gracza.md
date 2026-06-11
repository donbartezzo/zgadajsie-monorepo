# Implementacja profilu uczestnika oraz profili dyscyplin w aplikacji ZgadajSie.pl

## Cel biznesowy

Celem zmian jest zwiększenie zaufania organizatorów do nowych uczestników wydarzeń oraz dostarczenie dodatkowych informacji pozwalających ocenić, czy dany uczestnik pasuje do konkretnego wydarzenia sportowego lub innego typu wydarzenia dostępnego w aplikacji.

System powinien rozdzielać:

- **Profil Uczestnika** - informacje ogólne o użytkowniku.
- **Profile Dyscyplin** - informacje dotyczące konkretnej dyscypliny sportowej.

Dzięki temu użytkownik może posiadać różne poziomy zaawansowania i opisy dla różnych dyscyplin.

Profil uczestnika oraz profile dyscyplin są globalne na koncie użytkownika. Jeśli uczestnik zmieni dane, zmiana obowiązuje globalnie, a nie per wydarzenie lub per organizator.

Widoczność danych profilowych jest ograniczona:

- profil uczestnika, linki społecznościowe i profil dyscypliny widzi organizator wydarzenia, do którego użytkownik się zgłosił,
- dane nie są publicznym profilem użytkownika,
- w UI tworzenia i edycji profilu należy wyświetlić informację, że dane są udostępniane organizatorom wydarzeń, do których użytkownik się zgłasza.

---

# 1. Profil Uczestnika

Profil Uczestnika jest wspólny dla całego konta użytkownika.

Docelowo należy rozbudować istniejącą stronę `/profile`, prawdopodobnie w obecnej sekcji „Panel uczestnika”. Nie tworzymy osobnej strony typu `/profile/player` w MVP.

## Sekcje

### Podstawowe dane

- Nazwa użytkownika / ksywka
- Avatar (obecny system avatarów)

### Statystyki użytkownika

W MVP pokazujemy proste, neutralne statystyki dotyczące wydarzeń. Goście i fake users nie są wliczani do statystyk konta głównego.

Statystyki MVP:

- Data rejestracji konta
- Liczba zgłoszeń ogółem, w tym także zgłoszeń później wypisanych
- Liczba zgłoszeń zakończonych otrzymaniem miejsca w odbytym wydarzeniu
- Liczba organizatorów, którzy oznaczyli użytkownika jako „Zaufany uczestnik”

Definicja „zgłoszenia zakończonego otrzymaniem miejsca w odbytym wydarzeniu”:

- zgłoszenie dotyczy konta głównego użytkownika, a nie gościa,
- zgłoszenie otrzymało slot/miejsce,
- wydarzenie odbyło się, czyli nie jest odwołane/anulowane,
- wydarzenie nie jest trwające ani nadchodzące.

Na tym etapie nie pokazujemy negatywnych sygnałów typu liczba odrzuceń, wypisań jako osobna metryka reputacyjna, reprymendy, bany, no-show ani ranking.

### Linki społecznościowe

Użytkownik może podać maksymalnie 3 linki URL do swoich profili poza aplikacją, np. Facebook, Instagram, LinkedIn lub inny portal.

Założenia:

- użytkownik podaje wyłącznie URL, bez własnej etykiety,
- linki służą wyłącznie zwiększeniu wiarygodności uczestnika,
- organizator widzi link jako klikalny adres i może otworzyć go w nowej karcie,
- linki przechowujemy prosto jako JSON na modelu `User`, bez osobnego modelu relacyjnego.

Wymagania bezpieczeństwa:

- dozwolone są tylko bezpieczne schematy URL, preferowane `https://`,
- niedozwolone są schematy typu `javascript:`, `data:` itp.,
- linki w UI organizatora otwierają się przez `_blank` z `rel="noopener noreferrer"`,
- walidacja musi działać po stronie backendu niezależnie od walidacji frontendowej.

---

# 2. Profile Dyscyplin

Każda dyscyplina posiada własny profil użytkownika.

Przykład:

- Profil Piłki Nożnej
- Profil Tenisa
- Profil Siatkówki

Dane nie są współdzielone pomiędzy dyscyplinami.

---

## Dane profilu dyscypliny

### Poziom zaawansowania

Korzystamy ze słownika poziomów zaawansowania wykorzystywanego w aplikacji, ale w profilu dyscypliny użytkownik może wybrać tylko konkretne poziomy zawodnika/uczestnika.

Dozwolone poziomy:

- `beginner`
- `recreational`
- `regular`
- `solid`
- `advanced`
- `professional`

Niedozwolone jako poziom profilu uczestnika:

- `open`
- `mixed-open`
- każdy inny poziom słownikowy oznaczający wydarzenie otwarte, a nie realny poziom uczestnika.

Użytkownik może zmieniać poziom w dowolnym momencie.

---

### Wizytówka uczestnika

Pole tekstowe.

Opis powinien pomóc organizatorom zrozumieć:

- doświadczenie uczestnika,
- doświadczenie ligowe lub turniejowe, jeśli występuje,
- oczekiwania wobec udziału w wydarzeniu,
- dodatkowe informacje, które użytkownik uzna za istotne.

Przykłady:

> Gram regularnie od około 10 lat. Występuję w amatorskiej lidze miejskiej. Szukam regularnego grania 1-2 razy w tygodniu.

> Gram rekreacyjnie ze znajomymi. Nie mam doświadczenia ligowego.

---

## Walidacja

Minimalna długość wizytówki:

- 30 znaków

Maksymalna długość:

- 500 znaków

---

# 3. Wymuszanie utworzenia profilu dyscypliny

## Scenariusz

Jeżeli użytkownik próbuje zapisać się na wydarzenie danej dyscypliny i nie posiada jeszcze profilu tej dyscypliny, system powinien zablokować zapis i wyświetlić formularz utworzenia profilu tej dyscypliny.

Przykład:

- użytkownik zapisuje się na wydarzenie Piłka Nożna,
- nie posiada jeszcze profilu Piłki Nożnej.

System powinien zablokować zapis i wyświetlić formularz utworzenia profilu tej dyscypliny.

Wymagane pola:

- Poziom zaawansowania
- Wizytówka uczestnika

Po zapisaniu profilu:

- profil dyscypliny zostaje utworzony,
- użytkownik wraca do procesu zapisu na wydarzenie,
- zgłoszenie jest kontynuowane automatycznie.

## Zakres wymuszenia

Profil dyscypliny wymuszamy:

- przy nowym zapisie użytkownika na wydarzenie,
- przy ponownym dołączeniu (`rejoin`) do wydarzenia, jeśli użytkownik nie ma profilu tej dyscypliny.

Profilu dyscypliny nie wymuszamy:

- dla istniejących zgłoszeń utworzonych przed wdrożeniem tej funkcji,
- dla gości,
- dla fake users,
- dla organizatora zapisującego samego siebie na własne wydarzenie.

Jeżeli istniejące zgłoszenie nie ma profilu dyscypliny, organizator powinien zobaczyć neutralną informację „Brak profilu dyscypliny”.

---

# 4. Goście dodawani przez użytkownika

Goście nie tworzą globalnego profilu uczestnika ani globalnego profilu dyscypliny. Zapis gościa nie wymaga standardowego profilu dyscypliny.

Rekomendacja dla MVP: przy dodawaniu gościa do wydarzenia wymagamy krótkich informacji dyscyplinowych dla konkretnego zgłoszenia:

- poziom zaawansowania gościa w dyscyplinie wydarzenia,
- krótka wizytówka gościa.

Uzasadnienie:

- organizator otrzymuje porównywalny kontekst dla uczestników głównych i gości,
- nie tworzymy globalnego profilu dla osoby, która nie ma konta,
- informacje są jednorazowym snapshotem przypisanym do konkretnego zgłoszenia gościa,
- dane nie powinny być używane ponownie automatycznie przy innych wydarzeniach.

Te dane powinny być widoczne organizatorowi w tym samym miejscu, w którym widzi profil dyscypliny standardowego uczestnika.

---

# 5. Prezentacja uczestnika organizatorowi

Podczas przeglądania zgłoszeń organizator powinien mieć możliwość wyświetlenia dwóch poziomów informacji.

## Informacje ogólne (Profil Uczestnika)

- Nazwa użytkownika
- Avatar
- Statystyki użytkownika zdefiniowane w sekcji „Statystyki użytkownika”
- Linki społecznościowe
- Informacja o tym, czy użytkownik jest nowy dla danego organizatora
- Informacja o statusie „Zaufany uczestnik”, jeśli organizator oznaczył użytkownika jako zaufanego

---

## Informacje dotyczące konkretnej dyscypliny

Dla wydarzenia piłkarskiego:

- Poziom zaawansowania (Piłka Nożna)
- Wizytówka (Piłka Nożna)

Dla wydarzenia tenisowego:

- Poziom zaawansowania (Tenis)
- Wizytówka (Tenis)

Organizator powinien zawsze widzieć profil odpowiadający dyscyplinie wydarzenia.

Dla gościa organizator widzi jednorazowe informacje dyscyplinowe przypisane do zgłoszenia gościa, a nie globalny profil.

---

# 6. Model danych - decyzje dla MVP

## User

Rozszerzyć model `User` o proste przechowywanie linków społecznościowych jako JSON.

Założenia:

- max 3 linki,
- każdy wpis zawiera tylko URL,
- walidacja po stronie backendu,
- brak osobnego modelu `UserSocialLink` w MVP.

## Profil dyscypliny

Dodać model profilu dyscypliny użytkownika, np. `PlayerDisciplineProfile` albo `ParticipantDisciplineProfile`.

Rekomendowana nazwa domenowa: `ParticipantDisciplineProfile`.

Minimalne pola:

- `id`
- `userId`
- `disciplineId`
- `levelId`
- `bio`
- `createdAt`
- `updatedAt`

Wymagania:

- unikalność profilu po parze `userId + disciplineId`,
- relacja do użytkownika,
- relacja do dyscypliny,
- relacja do poziomu,
- backendowa walidacja, że wybrany poziom nie jest `open`, `mixed-open` ani innym poziomem otwartym.

## Informacje dyscyplinowe gościa

Dla gości nie tworzymy `ParticipantDisciplineProfile`.

Informacje o poziomie i wizytówce gościa przechowujemy w dedykowanej tabeli `UserGuestDetails` (1:1 z `User` gościa, kluczowane `userId`), zgodnie ze wzorcem Class Table Inheritance opisanym w `docs/tasks/wydzielenie_typow_uzytkownikow.md`. Gość to jednorazowy `User` (1:1 z jednym `EventEnrollment`), więc `UserGuestDetails` jest semantycznie równoważny snapshotowi per zgłoszenie, a jednocześnie symetryczny do `ParticipantDisciplineProfile` realnego użytkownika.

---

# 7. Cele UX

Projekt powinien:

- zwiększać zaufanie do nowych uczestników,
- nie wymagać dodatkowej weryfikacji SMS,
- nie wymagać przesyłania zdjęć,
- nie zwiększać znacząco tarcia podczas rejestracji konta,
- wymagać uzupełnienia profilu dopiero przy pierwszej próbie udziału w wydarzeniu danej dyscypliny,
- jasno informować użytkownika, że dane profilu są widoczne dla organizatorów wydarzeń, do których się zgłasza.

---

# 8. Przyszła rozbudowa (nie implementować teraz)

Przy projektowaniu modelu danych należy przewidzieć możliwość dodania w przyszłości:

- ocen poziomu zawodnika/uczestnika przez organizatorów,
- poziomu potwierdzonego przez społeczność,
- odznak i osiągnięć,
- rankingów i reputacji użytkowników,
- kompletności profilu dyscypliny,
- bardziej rozbudowanych statystyk uczestnictwa,
- osobnego modelu linków społecznościowych, jeśli JSON na `User` okaże się niewystarczający.

Obecna implementacja ma obejmować wyłącznie funkcjonalności opisane w punktach 1-7.

Powiązany, odrębny epik (osobny plan): **`docs/tasks/wydzielenie_typow_uzytkownikow.md`** — uporządkowanie modelu `User` wzorcem Class Table Inheritance: pola wspólne zostają na `User`, a pola per typ trafiają do tabel 1:1 (`UserRealDetails` teraz; `UserGuestDetails` dostarczane wraz z tym epikiem profilu gracza). To tam definiowany jest docelowy kształt `UserGuestDetails`, w którym ten plan zapisuje profil dyscypliny gościa.

---

# 9. Uzgodnione decyzje implementacyjne

Ustalenia doprecyzowujące rozdziały 1-6 (mają pierwszeństwo, jeśli powyższy opis był ogólniejszy):

1. **Slugi, nie ID.** Dyscypliny i poziomy są kluczowane slugiem (`EventDiscipline.slug`, `EventLevel.slug`). `ParticipantDisciplineProfile` używa `disciplineSlug` + `levelSlug` (FK do slugów), nie `*Id`.
2. **Walidacja poziomu = blacklista.** Backend odrzuca wyłącznie `levelSlug === 'open'`. Poziom `mixed-open` nie istnieje w słowniku (`seed-common.ts`), więc nie trzeba go obsługiwać. Pozostałe slugi (`beginner, recreational, regular, solid, advanced, professional`) są dozwolone.
3. **Profil dyscypliny gościa → `UserGuestDetails`.** Goście pozostają jako `User + accountType`, ale ich poziom i wizytówkę trzymamy w dedykowanej tabeli 1:1 `UserGuestDetails` (`userId @id`, `levelSlug` FK→`EventLevel`, `bio String?`), a **nie** w kolumnach na `EventEnrollment`. Nie tworzymy dla gości `ParticipantDisciplineProfile`. Wzorzec i model: `docs/tasks/wydzielenie_typow_uzytkownikow.md`.
4. **Wymuszenie profilu = wariant A.** `join()` / `rejoin()` zwraca `409` z kodem `DISCIPLINE_PROFILE_REQUIRED`; front pokazuje modal profilu dyscypliny, zapisuje profil i ponawia operację.
5. **Wspólny komponent overlay/modal profilu dyscypliny** (tworzenie + edycja), reużywany w: `/profile`, ścieżce dołączania do wydarzenia oraz dodawaniu gościa (dla gościa zapis trafia do `UserGuestDetails`, nie do `ParticipantDisciplineProfile`).
6. **Poziom zaawansowania — obowiązkowy. Wizytówka — opcjonalna, ale mocno zalecana** (w UI pokazujemy korzyść: lepsza weryfikacja przez organizatora). Walidacja bio: **bez minimum**, maksimum **500** znaków.
7. **„Wydarzenie się odbyło"** (do statystyki) = `event.status != CANCELLED AND event.endsAt < now()`.

---

# 10. Checklist wdrożeniowy

Każdy etap można odhaczać po ukończeniu i zweryfikowaniu (testy + przegląd).

## Etap 0 — Model danych i migracje

- [ ] Dodać model `ParticipantDisciplineProfile` (`id`, `userId`, `disciplineSlug`, `levelSlug`, `bio String?`, `createdAt`, `updatedAt`) z relacjami do `User`, `EventDiscipline`, `EventLevel`
- [ ] Unikalność `@@unique([userId, disciplineSlug])`
- [ ] Dodać relację odwrotną na `User`, `EventDiscipline`, `EventLevel`
- [ ] Rozszerzyć `User` o `socialLinks Json?` (max 3 URL-e, bez etykiet)
- [ ] Dodać model `UserGuestDetails` (`userId @id`, `levelSlug` FK→`EventLevel`, `bio String?`) wg `docs/tasks/wydzielenie_typow_uzytkownikow.md`
- [ ] Wygenerować migrację Prisma (nie `db push`) i zweryfikować ją na czystej bazie

## Etap 1 — Backend: Profil Uczestnika + linki społecznościowe

- [ ] DTO + walidacja `socialLinks`: max 3, tylko bezpieczne schematy (preferowane `https:`), blokada `javascript:`/`data:` itp., walidacja po stronie backendu
- [ ] Endpoint odczytu/zapisu linków społecznościowych w obrębie profilu użytkownika
- [ ] Serwis statystyk uczestnika: data rejestracji, liczba zgłoszeń ogółem (też wypisane), liczba zgłoszeń zakończonych miejscem w odbytym wydarzeniu (`status != CANCELLED AND endsAt < now()` + slot przyznany, konto główne nie-gość), liczba organizatorów z `isTrusted`
- [ ] Wykluczyć `GUEST`/`FAKE` ze statystyk konta głównego
- [ ] Testy jednostkowe statystyk i walidacji linków

## Etap 2 — Backend: Profile Dyscyplin

- [ ] CRUD `ParticipantDisciplineProfile` (create/update; brak twardego delete w MVP)
- [ ] Walidacja: `levelSlug !== 'open'`, `bio` opcjonalne, max 500 znaków
- [ ] Walidacja, że `disciplineSlug` istnieje
- [ ] Endpoint pobrania profilu dyscypliny zalogowanego użytkownika (po slug dyscypliny)
- [ ] Testy jednostkowe walidacji i unikalności pary `userId + disciplineSlug`

## Etap 3 — Backend: Wymuszanie profilu przy zapisie

- [ ] W `join()` i `rejoin()`: jeśli `REAL` i brak `ParticipantDisciplineProfile` dla dyscypliny wydarzenia → `409 DISCIPLINE_PROFILE_REQUIRED`
- [ ] Pominąć wymuszenie dla: istniejących zgłoszeń sprzed wdrożenia, gości, fake users, organizatora zapisującego samego siebie
- [ ] Po utworzeniu profilu zapis kontynuowany (ponowny `join`/`rejoin` z frontu)
- [ ] Testy: nowy zapis, rejoin, wykluczenia (gość/fake/organizator/istniejące zgłoszenie)

## Etap 4 — Backend: Profil dyscypliny gościa (`UserGuestDetails`)

- [ ] `joinGuest()` przyjmuje `levelSlug` (wymagany, `!== 'open'`) i `bio` (opcjonalny, max 500) i tworzy `UserGuestDetails` w tej samej transakcji co `User` gościa
- [ ] Walidacja po stronie backendu
- [ ] Testy dodawania gościa z profilem dyscypliny

## Etap 5 — Backend: Prezentacja organizatorowi

- [ ] Endpoint/selekcja zwracająca organizatorowi: profil uczestnika (nazwa, avatar, statystyki, linki, „nowy dla organizatora", `isTrusted`) + profil dyscypliny wydarzenia
- [ ] Dla gościa zwracać snapshot z `guest*`, dla zgłoszeń bez profilu → sygnał „Brak profilu dyscypliny"
- [ ] Autoryzacja: dane widzi wyłącznie organizator wydarzenia, do którego użytkownik się zgłosił
- [ ] Testy autoryzacji i kształtu odpowiedzi

## Etap 6 — Frontend: wspólny modal profilu dyscypliny

- [ ] Komponent overlay/modal „Profil dyscypliny" (create + edit): pole poziomu (wymagane) + wizytówka (opcjonalna, z komunikatem zachęcającym), licznik do 500 znaków
- [ ] Reużycie w ścieżce dołączania (obsługa `409 DISCIPLINE_PROFILE_REQUIRED` → modal → ponowienie zapisu)
- [ ] Reużycie przy dodawaniu gościa (zapis do `guest*`)
- [ ] Walidacja kliencka spójna z backendem

## Etap 7 — Frontend: rozbudowa `/profile` (Panel uczestnika)

- [ ] Sekcja podstawowych danych (nazwa, avatar — istniejący system)
- [ ] Sekcja statystyk uczestnika
- [ ] Sekcja linków społecznościowych (max 3, dodaj/usuń/edytuj)
- [ ] Lista profili dyscyplin z wejściem w modal edycji
- [ ] Komunikat informujący, że dane są udostępniane organizatorom wydarzeń, do których użytkownik się zgłasza
- [ ] Zgodność z `styleguide-frontend.md` i tokenami (tylko semantyczne klasy)

## Etap 8 — Frontend: widok organizatora

- [ ] W przeglądzie zgłoszeń: rozwinięcie „Profil Uczestnika" (ogólne) + „Profil dyscypliny" (per wydarzenie)
- [ ] Linki społecznościowe jako klikalne, `target="_blank"` + `rel="noopener noreferrer"`
- [ ] Dla gościa: snapshot dyscyplinowy w tym samym miejscu co profil standardowego uczestnika
- [ ] Neutralny stan „Brak profilu dyscypliny"
- [ ] Oznaczenia „nowy dla organizatora" i „Zaufany uczestnik"

## Etap 9 — Design system i dokumentacja

- [ ] Jeśli dochodzą nowe elementy UI: aktualizacja `docs/design-tokens.md` i `/dev/design-system`
- [ ] Aktualizacja dokumentacji funkcjonalnej, jeśli potrzeba

## Etap 10 — Testy E2E / integracyjne i przegląd

- [ ] Integracyjny scenariusz: zapis bez profilu → modal → utworzenie → zapis ukończony
- [ ] Integracyjny scenariusz: rejoin z wymuszeniem profilu
- [ ] Integracyjny scenariusz: dodanie gościa ze snapshotem i jego prezentacja organizatorowi
- [ ] Przegląd kodu (`/code-review`) i bezpieczeństwa (walidacja URL, autoryzacja widoczności)
