# Plan wdrożenia — zabezpieczenie i reużycie formularza kontaktowego

> Dokument roboczy. Oznaczaj ukończone etapy checkboxami.
> Dotyczy formularza `/contact`, jego backendowej obsługi oraz reużycia w overlayu na liście wydarzeń miasta.

## Decyzje projektowe (ustalone przed implementacją)

| Punkt                         | Decyzja                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Dostawca captcha              | **Cloudflare Turnstile** (darmowy, prywatny, zwykle niewidoczny)                             |
| Captcha dla zalogowanych      | **Nie** — captcha tylko dla anonimowych; zalogowani chronieni rate-limitem                   |
| Pola Imię/Email z profilu     | **Prefill edytowalny** — wstępnie wypełnione, user może nadpisać                             |
| Zapis wiadomości              | **Tak, tabela `ContactMessage` w Prisma** — audyt + per-user rate-limit + fallback           |
| Rate-limit                    | `@nestjs/throttler` **punktowo na `/contact`** (per-IP) + per-user/limit czasowy z DB        |
| ThrottlerGuard                | **Punktowy** (`@UseGuards(ThrottlerGuard)` + `@Throttle()`), NIE globalny `APP_GUARD`        |
| Honeypot                      | **Off-screen** (`position:absolute; left:-9999px`, `aria-hidden`, `tabindex=-1`) + time-trap |
| Kontekst/źródło (`source`)    | Enum: `CONTACT_PAGE` (domyślny) i `CITY_EVENTS` (overlay z listy miasta); rozszerzalny       |
| Wyodrębnienie formularza (FE) | `shared/contact/ui/contact-form.component.ts` — nowa domena współdzielona `contact`          |
| Backend kontaktu              | Dedykowany `backend/src/modules/contact/` (`ContactModule` + `ContactController` + service)  |
| Klucze Turnstile (dev)        | Klucze testowe Cloudflare (always-pass); prod przez env `TURNSTILE_*` przy wdrożeniu         |

---

## Faza 0 — Przygotowanie / konfiguracja

- [x] **Dev:** użyć kluczy testowych Cloudflare — site `1x00000000000000000000AA` / secret `1x0000000000000000000000000000000AA` (always-pass); do testów negatywnych always-block: site `2x00000000000000000000AB` / secret `2x0000000000000000000000000000000AA`
- [x] **Prod:** klucze produkcyjne dostarczone przy wdrożeniu (do uzupełnienia w env produkcyjnym)
- [x] Backend `.env` / `.env.example`: dodać `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`
- [x] Rozszerzyć `AppService.getClientConfig()` (`backend/src/app/app.service.ts`) o `turnstileSiteKey` (obok `vapidPublicKey`) — frontend pobiera klucz publiczny przez `/config`, bez hardcode

---

## Faza 1 — Backend: model danych (Prisma)

**Plik:** `backend/prisma/schema.prisma`

- [x] Dodać enum `ContactSource { CONTACT_PAGE CITY_EVENTS }`
- [x] Dodać model `ContactMessage`:
  - `id` (cuid), `name`, `email`, `message`
  - `userId String?` + relacja opcjonalna do `User` (onDelete: SetNull)
  - `source ContactSource @default(CONTACT_PAGE)`
  - `citySlug String?` (kontekst dodatkowy dla `CITY_EVENTS`)
  - `ipHash String?` (do per-IP rate-limitu/audytu — hash, nie surowe IP)
  - `createdAt DateTime @default(now())`
  - indeksy: `@@index([email, createdAt])`, `@@index([userId, createdAt])`
- [x] `pnpm prisma:generate`
- [x] `pnpm prisma:migrate` (nazwa migracji np. `add_contact_message`)

---

## Faza 2 — Backend: walidacja, DTO, rate-limit, captcha

### 2.1 DTO + walidacja (class-validator)

**Nowy plik:** `backend/src/modules/contact/dto/submit-contact.dto.ts`

- [x] `name`: `@IsString @IsNotEmpty @MaxLength(100)`
- [x] `email`: `@IsEmail @MaxLength(150)`
- [x] `message`: `@IsString @MinLength(10) @MaxLength(5000)`
- [x] `source`: `@IsEnum(ContactSource) @IsOptional` (domyślnie `CONTACT_PAGE`)
- [x] `citySlug`: `@IsString @IsOptional`
- [x] `captchaToken`: `@IsString @IsOptional` (wymagany tylko dla anonimowych — walidacja warunkowa w serwisie)
- [x] honeypot `website`/`company`: `@IsEmpty` (musi być puste — bot je wypełni)
- [x] `formRenderedAt` (timestamp/nonce z momentu wyrenderowania formularza) — do time-trap
- [x] Upewnić się, że globalny `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`) jest aktywny w `main.ts` (jeśli nie — dodać)

### 2.2 Serwis kontaktu

**Nowy plik:** `backend/src/modules/contact/contact.service.ts` (+ `contact.module.ts`)

- [x] Wydzielić logikę z `app.controller.ts` do dedykowanego modułu/serwisu
- [x] Weryfikacja Turnstile: POST do `https://challenges.cloudflare.com/turnstile/v0/siteverify` z `secret` + `token` + `remoteip` — **tylko gdy user niezalogowany**; brak/nieudana weryfikacja → `403`
- [x] Honeypot: jeśli pole-pułapka niepuste → cicho odrzuć (zwróć `200` udawany sukces, nic nie wysyłaj — nie ujawniaj botowi)
- [x] Time-trap: jeśli czas wypełnienia < ~3 s → odrzuć jak bota
- [x] Per-user/per-email rate-limit z DB: max N zgłoszeń / okno (np. 3 / 1h) — liczone po `userId` (zalogowany) lub `email`+`ipHash` (anonim); przekroczenie → `429` z czytelnym komunikatem
- [x] Zapis `ContactMessage` do bazy (z `userId`, `source`, `citySlug`, `ipHash`)
- [x] Wysyłka maila do admina przez `EmailService.sendContactEmail(...)` (rozszerzone — patrz Faza 3)

### 2.3 Throttler na endpoint (per-IP) — punktowo

> Decyzja: **NIE** rejestrujemy globalnego `APP_GUARD` (uniknięcie regresji na chat/WS/powiadomieniach).

- [x] `@UseGuards(ThrottlerGuard)` punktowo na endpoincie `/contact` (lub na `ContactController`)
- [x] Nałożyć ostrzejszy `@Throttle()` na endpoint `/contact` (np. 3 żądania / 60 s / IP)

### 2.4 Kontroler

**Plik:** `backend/src/app/app.controller.ts` (lub przeniesienie do `ContactController` w nowym module)

- [x] Zamienić ręczną walidację na DTO + `ContactService`
- [x] Wstrzyknąć IP (`@Ip()`) → przekazać do serwisu (do hash + rate-limit)
- [x] Zwracać spójne kody błędów (`400` walidacja, `403` captcha, `429` rate-limit)

---

## Faza 3 — Backend/email: kontekst + userId w mailu

### 3.1 Typy szablonu

**Plik:** `libs/email/src/types/templates.ts`

- [x] Rozszerzyć `ContactEmailProps` o: `userId?: string | null`, `source: string` (czytelna etykieta), `citySlug?: string | null`

### 3.2 Szablon maila

**Plik:** `libs/email/src/templates/ContactEmail.tsx`

- [x] Dodać sekcję meta: „ID użytkownika: {userId ?? '— (niezalogowany)'}" oraz „Źródło: {source}" (+ miasto dla `CITY_EVENTS`)
- [x] Zmapować enum `source` na czytelną PL etykietę (np. `CONTACT_PAGE` → „Strona kontaktowa", `CITY_EVENTS` → „Lista wydarzeń miasta")

### 3.3 EmailService

**Plik:** `backend/src/modules/notifications/email.service.tsx`

- [x] Rozszerzyć sygnaturę `sendContactEmail(...)` o `userId`, `source`, `citySlug` i przekazać do szablonu
- [x] Dostosować `subject` (np. dopisać źródło)

---

## Faza 4 — Frontend: reużywalny `ContactFormComponent` (TASK 3 część 1)

**Nowy plik:** `frontend/src/app/shared/contact/ui/contact-form.component.ts` (nowa domena współdzielona `contact`, zgodnie z `project-structure.md`: komponenty domenowe → `shared/<domena>/ui/`)

- [x] Przenieść formularz + logikę z `contact.component.ts` do `ContactFormComponent`
- [x] `@Input() source: ContactSource` (domyślnie `CONTACT_PAGE`)
- [x] `@Input() citySlug?: string`
- [x] `@Output() sent` (emit po sukcesie — overlay sam zdecyduje czy zamknąć)
- [x] Wstrzyknąć `AuthService`: jeśli `isLoggedIn()` → prefill `name = displayName`, `email = email` (edytowalne)
- [x] Dołożyć ukryte pola: honeypot (`website`) ukryty **off-screen** (`position:absolute; left:-9999px`, `aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`) — NIE `display:none` + `formRenderedAt`
- [x] Captcha Turnstile **tylko gdy `!isLoggedIn()`**:
  - załadować skrypt Turnstile, wyrenderować widget, pobrać `turnstileSiteKey` z configu (`/config`)
  - przekazać `captchaToken` w payloadzie
- [x] Walidacje frontowe: `minlength`/`maxlength` na `message`, spójne z DTO
- [x] W payloadzie POST `/contact` wysyłać: `name`, `email`, `message`, `source`, `citySlug?`, `captchaToken?`, honeypot, `formRenderedAt`
- [x] Obsłużyć błędy `429`/`403` czytelnym komunikatem w snackbarze
- [x] Zachować zgodność ze stylem (semantyczne klasy Tailwind: `primary/neutral/success/danger`, BEZ `gray-*`, `blue-*` itd. — patrz `docs/styleguide-frontend.md`)

### 4.1 Refaktor strony `/contact`

**Plik:** `frontend/src/app/features/static/pages/contact/contact.component.ts`

- [x] Zredukować do opakowania `<app-contact-form [source]="'CONTACT_PAGE'" />` + ewentualny nagłówek/success-state
- [x] Usunąć zduplikowaną logikę HTTP/formularza

---

## Faza 5 — Frontend: overlay kontaktowy + trigger na liście miasta (TASK 3 część 2)

### 5.1 Overlay

- [x] Dodać typ `'contact'` do `OverlayType` w `bottom-overlays.service.ts`
- [x] Dodać metodę pomocniczą `openContact(citySlug?: string)` ustawiającą kontekst (source `CITY_EVENTS`, `citySlug`) i `open('contact')`
- [x] Przechować kontekst (source/citySlug) w sygnałach serwisu (analogicznie do innych overlayów)
- [x] **Nowy plik:** `frontend/src/app/shared/contact/ui/contact-overlay.component.ts` — opakowuje `<app-bottom-overlay>` + `<app-contact-form>` z odpowiednim `source`/`citySlug`; zamyka się po `(sent)`
- [x] Zarejestrować w `bottom-overlays.component.ts` (import) + dodać `@case ('contact')` w `bottom-overlays.component.html`

### 5.2 Trigger na liście wydarzeń miasta

**Pliki:** `frontend/src/app/features/events/pages/events/events.component.{ts,html}`

- [x] Dodać widoczny button/CTA — typu „Chcesz organizować wydarzenia w tym mieście? Skontaktuj się z nami" — **niezależnie od tego, czy miasto ma wydarzenia** (umieścić poza gałęzią `@else`, np. pod sekcją lub w empty-state gdy brak wydarzeń)
- [x] `(click)` → `bottomOverlays.openContact(citySlug)`
- [x] Pobrać `citySlug` z `ActivatedRoute`/istniejącego kontekstu komponentu

---

## Faza 6 — Dokumentacja i testy

- [x] `docs/api-endpoints.md` — zaktualizować opis `POST /contact` (nowe pola, kody błędów, rate-limit, captcha)
- [x] Jeśli zmiana dotknie design systemu (nowy komponent UI/wariant) — zaktualizować `docs/design-tokens.md` i stronę `/dev/design-system` (zgodnie z CLAUDE.md). Reużywalny `ContactFormComponent` rozważyć jako pozycję w design-system.
- [x] Testy backend: walidacja DTO, odrzucenie honeypot, time-trap, rate-limit (`429`), pominięcie captchy dla zalogowanego, weryfikacja captchy dla anonima
- [x] Testy frontend: prefill dla zalogowanego, brak widgetu captcha dla zalogowanego, poprawne `source`/`citySlug` w payloadzie z overlaya
- [x] E2E checklist (wzorem istniejących z `docs/testing` w commitach) dla: wysyłka jako gość (z captchą), wysyłka jako zalogowany (prefill, bez captchy), trigger z listy miasta bez wydarzeń

---

## Uwagi / ryzyka

- **`ThrottlerGuard` punktowy** (decyzja): unikamy globalnego `APP_GUARD`, więc istniejące endpointy (chat, powiadomienia, WS) pozostają nietknięte. Gdyby w przyszłości wprowadzać globalny — wymaga retestu całego API + `@SkipThrottle()` na WS.
- **Turnstile w dev/CI**: Cloudflare udostępnia testowe klucze (always-pass/always-block) — użyć w środowisku testowym, by nie blokować E2E.
- **Honeypot vs `display:none`**: część botów pomija pola `display:none`; rozważyć ukrycie wizualne off-screen, by pułapka działała. Decyzja implementacyjna.
- **Per-user rate-limit po `userId`** wymaga, by dla anonima kluczem był `email`+`ipHash` — `email` jest łatwy do podmiany, więc dla anonimów captcha + per-IP throttler są właściwą barierą; DB-limit traktować jako uzupełnienie.
- **`ipHash`**: nie zapisywać surowego IP (RODO) — hashować z solą.
