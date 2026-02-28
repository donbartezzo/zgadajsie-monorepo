# Mapowanie podstron projektu → szablony sticky-mobile-template

> Dokument analityczny: stan obecny każdej podstrony, przypisany szablon referencyjny, ocena zgodności z wytycznymi migracji (`docs/ai-bootstrap-to-tailwind-migration.md`).

---

## 0. Wspólny layout (Header + Content + Footer)

### Stan obecny

- **Header** (`layout/header/`) — sticky top, Tailwind, logo + theme toggle + dropdown użytkownika, `IconComponent`, `RouterLink`. ✅ Zgodny z wytycznymi.
- **Footer / Bottom Nav** (`layout/footer/`) — sticky bottom nav z ikonami (Start, Wydarzenia, Dodaj, Profil). Tailwind, `RouterLinkActive`. ✅ Zgodny.
- **App shell** (`app.ts` + `app.html`) — `<app-header>` + `<router-outlet>` + `<app-footer>` + `<app-snackbar>`.
- **Kontener** — `max-w-md mx-auto px-4` — mobile-first z breakpointami Tailwind.

### Szablon referencyjny

- Header: `_starter.html` linie 23–27 (`.header.header-fixed.header-logo-center`)
- Footer/bottom nav: `_starter.html` linie 29–35 (`#footer-bar.footer-bar-1`)

### Ocena ✅

Layout jest już w pełni zmigrowany do Tailwind. Brak klas Bootstrap ani martwych klas szablonowych. Struktura mobile-first poprawna.

---

## 1. Strona główna (`/`)

|                          |                                                  |
| ------------------------ | ------------------------------------------------ |
| **Komponent**            | `features/home/home.component.ts + .html + .css` |
| **Szablon referencyjny** | **`splash-2.html`**                              |
| **Stan**                 | ✅ Zmigrowany do Tailwind                        |

### Opis stanu

- Full-screen sekcja powitalna z logo, CTA ("Przeglądaj wydarzenia", "Zaloguj się"), 3 feature-kafelki (Lokalne, Bezpieczne, Rangi).
- Używa `IconComponent`, `ButtonComponent`, `RouterModule`.
- Pełen Tailwind, dark mode, brak Bootstrapa.

### Uwagi

- Szablon `splash-2.html` ma wariant light/dark mode z tłem obrazkowym + overlay gradient. **Obecna implementacja jest prostsza** (brak background image), co jest OK dla MVP.
- Ewentualnie: dodać hero image / gradient background jak w szablonie, jeśli będzie potrzeba wizualnego wzbogacenia.

### Zgodność z wytycznymi ✅

Brak klas BS, ikony przez `IconComponent`, Tailwind everywhere, standalone + OnPush + signals.

---

## 2. Listing wydarzeń (`/events`)

|                          |                                                                              |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Komponent**            | `features/events/events.component.ts + .html + .css`                         |
| **Shared UI**            | `shared/ui/event-card/event-card.component.ts`                               |
| **Szablon referencyjny** | **`page-events-category-tabs.html`** (zakładka "Recommended", linie 131–180) |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                                    |

### Opis stanu

- Lista eventów w `grid gap-4`, każdy event renderowany przez `<app-event-card>`.
- Loading spinner, empty state, infinite scroll (prosty, przez `onScroll()`).
- Sygnały: `events`, `isLoading`, `error`.

### Porównanie z szablonem

- Szablon ma zakładkę "Recommended" z dużymi kartami (full-width image + data + lokalizacja + avatary uczestników + strzałka).
- **Obecna implementacja nie ma zakładek** (nie ma "Near You" / "Recommended") — to jest poprawne uproszczenie MVP.
- Karta wydarzenia (szablon): miniatura, data (uppercase, kolor akcentu), tytuł, lokalizacja z ikoną, avatary uczestników, strzałka.
- `EventCardComponent` powinien naśladować strukturę z zakładki "Recommended" — zweryfikować jego template.

### Zgodność z wytycznymi ✅

Tailwind, `@for` syntax, `signal()`, standalone, OnPush, `EventCardComponent` w `shared/ui`.

---

## 3. Karta pojedynczego eventu (`/events/:id`)

|                          |                                             |
| ------------------------ | ------------------------------------------- |
| **Komponent**            | `features/event/event.component.ts + .html` |
| **Szablon referencyjny** | **`page-events-detailed-3.html`**           |
| **Stan**                 | ✅ Zmigrowany do Tailwind                   |

### Opis stanu

Bogata strona detali:

- Hero image (lub gradient placeholder)
- Back + Share buttons
- Tytuł + badge'e dyscypliny/poziomu/obiektu
- Karta organizatora (avatar + nazwa + rola)
- Opis
- Grid 2×2: data, lokalizacja, koszt, uczestnicy — z ikonami
- Mapa (`MapComponent`)
- Lista uczestników (avatar chips)
- Sticky bottom bar: Dołącz / Chat / Wypisz się

### Porównanie z szablonem

Szablon `page-events-detailed-3.html` ma:

- Duży hero image z date badge w rogu, tytuł, kategoria badge, CTA "Join"
- Sekcja organizatora z avatar + follow
- Avatary uczestników
- Mapa Google z overlay adresem
- Grid informacji: Date, Time, Place, Ticket
- CTA "Join Event"

**Obecna implementacja pokrywa wszystkie te sekcje** i jest wiernie odwzorowana w Tailwind.

### Zgodność z wytycznymi ✅

Pełna zgodność. Signals, `@if`/`@for`, `IconComponent`, `CardComponent`, `MapComponent`, `UserAvatarComponent`.

---

## 4. FAQ (`/faq`)

|                          |                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| **Komponent**            | `features/static/faq/faq.component.ts` (inline template)                                          |
| **Szablon referencyjny** | **`page-faq.html`** (sekcja "Frequent Questions", linie 107–170) + **`component-accordion.html`** |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                                                         |

### Opis stanu

- Accordion: lista pytań z expand/collapse (toggle na `signal()`).
- 6 pytań specyficznych dla platformy ZgadajSię.
- `IconComponent` (chevron-up/down).

### Porównanie z szablonem

- `page-faq.html` ma: hero z wyszukiwaniem (Knowledge Base), listę searchable items, sekcję "Frequent Questions" z collapse.
- `component-accordion.html` ma klasyczne accordion z BS `data-bs-toggle="collapse"`.
- **Obecna implementacja jest prostsza** — brak wyszukiwania, czysty accordion. Wystarczające dla MVP.

### Zgodność z wytycznymi ✅

Brak BS, Tailwind borders + hover, `signal()` do state, `@for`/`@if`.

---

## 5. Kontakt (`/contact`)

|                          |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| **Komponent**            | `features/static/contact/contact.component.ts` (inline template) |
| **Szablon referencyjny** | **`page-contact.html`**                                          |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                        |

### Opis stanu

- Formularz kontaktowy (imię, email, wiadomość) + przycisk "Wyślij".
- Karta z danymi kontaktowymi (mail, lokalizacja).
- `FormsModule` + `ngModel`, `SnackbarService`, `CardComponent`.

### Porównanie z szablonem

- `page-contact.html` ma: hero image, formularz (Name, Email, Message + Submit), mapę Google, dane kontaktowe (tel, mail, social media), success state.
- **Obecna implementacja pomija**: hero image, mapę, social links. Formularz i dane kontaktowe obecne.
- Brak mapy na stronie kontaktu — sensowne uproszczenie.

### Zgodność z wytycznymi ✅

Tailwind inputs (`rounded-xl`, `focus:ring-2`), `ButtonComponent`, `CardComponent`, `IconComponent`.

---

## 6. Polityka prywatności (`/privacy`)

|                          |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| **Komponent**            | `features/static/privacy/privacy.component.ts` (inline template) |
| **Szablon referencyjny** | **`page-terms.html`** (sekcja "Privacy Policy", linie 105–123)   |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                        |

### Opis stanu

- Prosty tekst prawny z nagłówkami h1/h2.
- Użycie Tailwind `prose prose-sm dark:prose-invert`.

### Porównanie z szablonem

- W `page-terms.html` privacy policy jest połączona z Terms of Service w jednym pliku.
- Obecna implementacja to osobna strona — lepsze SEO i czytelność.

### Zgodność z wytycznymi ✅

Tailwind prose, brak BS, prosty statyczny komponent standalone.

---

## 7. Regulamin (`/terms`)

|                          |                                                              |
| ------------------------ | ------------------------------------------------------------ |
| **Komponent**            | `features/static/terms/terms.component.ts` (inline template) |
| **Szablon referencyjny** | **`page-terms.html`** (linie 37–103)                         |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                    |

### Opis stanu

- Tekst regulaminu z sekcjami h1/h2.
- `prose prose-sm dark:prose-invert`.

### Zgodność z wytycznymi ✅

Analogicznie do Privacy — poprawny.

---

## 8. Profil użytkownika (`/profile`)

|                          |                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Komponent**            | `features/user/profile/profile.component.ts` (inline template)                       |
| **Szablon referencyjny** | **`page-account.html`** (edycja profilu) + **`page-profile-1.html`** (widok profilu) |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                                            |

### Opis stanu

- Avatar + displayName + email.
- Info o weryfikacji email z przyciskiem ponownego wysyłania.
- Grid 2×2 z linkami: Moje wydarzenia, Uczestnictwa, Galeria, Portfel.
- Formularz edycji: displayName, nowe hasło + Save.
- Signals: `saving`.

### Porównanie z szablonem

- `page-account.html` — edycja konta: avatar, toggle'e ustawień (dark mode, newsletter, 2FA), pola: name, email, location, phone, social profiles, zmiana hasła.
- `page-profile-1.html` — widok profilu: duży hero z imieniem, statystyki (followers/following/posts), galeria zdjęć.
- **Obecna implementacja łączy oba** — widok + edycja w jednym. Uproszczone (brak social profiles, brak galerii na profilu — galeria jest na osobnej podstronie `/profile/media`).

### Zgodność z wytycznymi ✅

`CardComponent`, `UserAvatarComponent`, `IconComponent`, Tailwind inputs, `FormsModule`, signals.

---

## 9. Panel organizatora — zarządzanie wydarzeniem (`/events/:id/manage`)

|                          |                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Komponent**            | `features/organizer/event-manage.component.ts` (inline template)                                                                |
| **Szablon referencyjny** | **`page-admin-home-1.html`** (dashboard z kartami statystyk) + elementy z **`page-events-detailed-3.html`** (lista uczestników) |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                                                                                       |

### Opis stanu

- 3 karty statystyk: Zgłoszenia / Uczestnicy / Łącznie.
- Toggle autoakceptacji.
- Lista oczekujących zgłoszeń z przyciskami Accept/Reject.
- Lista zaakceptowanych uczestników z przyciskami Reprymenda/Ban.
- `ModerationService`, `EventService`.

### Porównanie z szablonem

- `page-admin-home-1.html` — dashboard z kartami statystyk (income, users, interactions) + wykresy. Obecna implementacja bierze **strukturę kart statystyk** ale bez wykresów (sensowne uproszczenie).
- Lista uczestników: szablon nie ma bezpośredniego odpowiednika, ale lista z avatar + akcje jest bliska wzorcowi list z `page-chat-bubbles-4.html` (grupowy chat z avatarami).

### Zgodność z wytycznymi ✅

Standalone, OnPush, `CardComponent`, `UserAvatarComponent`, `ButtonComponent`, `IconComponent`, signals.

---

## 10. Panel admina

### 10.1 Dashboard (`/admin`)

|                          |                                                                               |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Komponent**            | `features/admin/admin-dashboard.component.ts` (inline template)               |
| **Szablon referencyjny** | **`page-admin-home-1.html`** (dashboard) + **`admin.html`** (index z linkami) |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                                     |

### Opis stanu

- 2 karty statystyk (Użytkownicy, Wydarzenia).
- 3 linki nawigacji: Zarządzaj użytkownikami, wydarzenia, ustawienia.
- `AdminService`.

### 10.2 Podstrony admina

| Podstrona          | Komponent                        | Szablon ref.                                     |
| ------------------ | -------------------------------- | ------------------------------------------------ |
| `/admin/users`     | `admin-users.component.ts`       | `page-admin-home-1.html` (lista + widgets)       |
| `/admin/users/:id` | `admin-user-detail.component.ts` | `page-account.html` (widok konta)                |
| `/admin/events`    | `admin-events.component.ts`      | `page-events-category-tabs.html` (lista eventów) |
| `/admin/settings`  | `admin-settings.component.ts`    | `page-admin-widgets.html` (pola ustawień)        |

### Zgodność z wytycznymi ✅

Wszystkie componenty: standalone, inline templates, Tailwind, `CardComponent`, `IconComponent`.

---

## 11. Portfel (`/wallet`)

|                          |                                                         |
| ------------------------ | ------------------------------------------------------- |
| **Komponent**            | `features/wallet/wallet.component.ts` (inline template) |
| **Szablon referencyjny** | **`page-wallet.html`**                                  |
| **Stan**                 | ✅ Zmigrowany do Tailwind                               |

### Opis stanu

- Karta salda z przyciskiem "Doładuj" → inline input kwoty + Zapłać.
- Historia transakcji: lista kart z opisem, datą, linkiem do eventu, kwotą (zielona/czerwona).
- Paginacja.

### Porównanie z szablonem

- `page-wallet.html` — karta z saldem (duży numer), zakładki History/Overview/Notifications, lista transakcji z ikonami, wykres.
- **Obecna implementacja**: brak zakładek i wykresu, prostsza wersja. Adekwatne do MVP.

### Zgodność z wytycznymi ✅

---

## 12. Chat wydarzenia (`/events/:id/chat`)

|                          |                                                           |
| ------------------------ | --------------------------------------------------------- |
| **Komponent**            | `features/chat/event-chat.component.ts` (inline template) |
| **Szablon referencyjny** | **`page-chat-bubbles-4.html`** (chat grupowy z avatarami) |
| **Stan**                 | ✅ Zmigrowany do Tailwind                                 |

### Opis stanu

- Header z powrotem do eventu.
- Lista wiadomości: bubble layout, rozróżnienie nadawca/odbiorca, avatary, timestamps.
- Typing indicator.
- Input + przycisk send.
- WebSocket: `ChatService.connect/disconnect/sendMessage/onMessage/onTyping`.

### Porównanie z szablonem

- `page-chat-bubbles-4.html` — grupowy chat, avatary, badge ADMIN, input + przyciski na dole.
- **Obecna implementacja pokrywa** te wzorce i jest czysto Tailwindowa.

### Zgodność z wytycznymi ✅

---

## 13. Strony autentykacji

| Podstrona               | Komponent                                                    | Szablon ref.                                                              |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `/auth/login`           | `features/auth/login/login.component.ts`                     | `page-signin.html` (lub brak bezpośredniego — generyczna forma logowania) |
| `/auth/register`        | `features/auth/register/register.component.ts`               | `page-signup.html`                                                        |
| `/auth/activate`        | `features/auth/activate/activate.component.ts`               | brak bezpośredniego                                                       |
| `/auth/forgot-password` | `features/auth/forgot-password/forgot-password.component.ts` | brak bezpośredniego                                                       |
| `/auth/reset-password`  | `features/auth/reset-password/reset-password.component.ts`   | brak bezpośredniego                                                       |

### Stan ✅ Zmigrowany do Tailwind

- Login: formularz email/hasło, show/hide password, social login (Google, Facebook), link do rejestracji/forgot-password.
- Wszystkie używają `CardComponent`, `ButtonComponent`, `IconComponent`, Tailwind inputs.

### Uwaga

Szablon sticky-mobile-template ma pliki `page-signin.html` i `page-signup.html` — warto upewnić się, że są w katalogu. Jeśli nie, obecne implementacje są samowystarczalne i zgodne z wytycznymi.

---

## 14. Podstrony profilowe użytkownika

| Podstrona                 | Komponent                                                        | Szablon ref.                                            |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `/profile/events`         | `features/user/my-events/my-events.component.ts`                 | `page-events-category-tabs.html` (lista)                |
| `/profile/participations` | `features/user/my-participations/my-participations.component.ts` | j.w.                                                    |
| `/profile/media`          | `features/user/media-gallery/media-gallery.component.ts`         | `page-profile-1.html` (galeria zdjęć, grid 3-kolumnowy) |

### Stan ✅

Podstrony profilowe użytkownika — zestawy list z filtrowaniem statusu.

---

## 15. Formularz tworzenia/edycji wydarzenia (`/events/new`, `/events/:id/edit`)

|                          |                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Komponent**            | `features/events/event-form/event-form.component.ts`                                      |
| **Szablon referencyjny** | **`component-inputs.html`** (pola formularza) + **`component-file-upload.html`** (upload) |
| **Stan**                 | ✅ Zmigrowany                                                                             |

Formularz reużywalny (tryb tworzenia i edycji na podstawie obecności `:id` w URL).

---

## Podsumowanie globalne

| #   | Podstrona                            | Route                             | Szablon referencyjny                                                | Status |
| --- | ------------------------------------ | --------------------------------- | ------------------------------------------------------------------- | ------ |
| 0   | Layout (Header + Footer)             | —                                 | `_starter.html`                                                     | ✅ OK  |
| 1   | Strona główna                        | `/`                               | `splash-2.html`                                                     | ✅ OK  |
| 2   | Listing eventów                      | `/events`                         | `page-events-category-tabs.html` (Recommended)                      | ✅ OK  |
| 3   | Karta eventu                         | `/events/:id`                     | `page-events-detailed-3.html`                                       | ✅ OK  |
| 4   | FAQ                                  | `/faq`                            | `page-faq.html` + `component-accordion.html`                        | ✅ OK  |
| 5   | Kontakt                              | `/contact`                        | `page-contact.html`                                                 | ✅ OK  |
| 6   | Polityka prywatności                 | `/privacy`                        | `page-terms.html` (sekcja Privacy)                                  | ✅ OK  |
| 7   | Regulamin                            | `/terms`                          | `page-terms.html` (sekcja Terms)                                    | ✅ OK  |
| 8   | Profil użytkownika                   | `/profile`                        | `page-account.html` + `page-profile-1.html`                         | ✅ OK  |
| 9   | Panel organizatora                   | `/events/:id/manage`              | `page-admin-home-1.html` + lista uczestników                        | ✅ OK  |
| 10  | Panel admina                         | `/admin/*`                        | `admin.html` + `page-admin-home-1.html` + `page-admin-widgets.html` | ✅ OK  |
| 11  | Portfel                              | `/wallet`                         | `page-wallet.html`                                                  | ✅ OK  |
| 12  | Chat                                 | `/events/:id/chat`                | `page-chat-bubbles-4.html`                                          | ✅ OK  |
| 13  | Autentykacja                         | `/auth/*`                         | formularze z szablonu (signin/signup)                               | ✅ OK  |
| 14  | Moje eventy / uczestnictwa / galeria | `/profile/*`                      | `page-events-category-tabs.html` + `page-profile-1.html`            | ✅ OK  |
| 15  | Formularz wydarzenia                 | `/events/new`, `/events/:id/edit` | `component-inputs.html`                                             | ✅ OK  |

### Kluczowe wnioski

1. **Wszystkie podstrony są już zmigrowane do Tailwind** — brak klas Bootstrap w żadnym z komponentów.
2. **Architektura Angular** jest poprawna: standalone, OnPush, signals, `@for`/`@if`, `input()`/`output()`.
3. **Ikony** obsługiwane przez `IconComponent` — brak font icons.
4. **Shared UI** prawidłowo wydzielone: `ButtonComponent`, `CardComponent`, `EventCardComponent`, `UserAvatarComponent`, `MapComponent`, `LoadingSpinnerComponent`, `EmptyStateComponent`, `PaginationComponent`, `FileUploadComponent`, `DialogComponent`, `SnackbarComponent`.
5. **Layout** — wspólny kontener `max-w-md` z header sticky top + bottom nav sticky bottom. Zgodny z mobile-first PWA.
6. **Dark mode** — obsługiwany przez `dark:` prefiksy Tailwind + `ThemeService`.

### Potencjalne ulepszenia (nie-blokujące, na przyszłość)

- Strona główna: dodanie hero image/gradient jak w `splash-2.html` (obecna wersja jest minimalistyczna).
- Listing eventów: opcjonalne filtry/wyszukiwanie (jak w "Near You" tab szablonu).
- Portfel: zakładki History/Overview (jak w `page-wallet.html`).
- FAQ: opcjonalne pole wyszukiwania (jak w `page-faq.html`).
