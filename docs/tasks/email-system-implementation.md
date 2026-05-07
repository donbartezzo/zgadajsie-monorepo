# Plan wdrożenia systemu emailingu — ZgadajSie.pl

## Stan obecny (analiza bazy kodu)

### Co już istnieje

- `resend` v6.10.0 zainstalowany jako zależność workspace
- `EmailService` w `backend/src/modules/notifications/email.service.ts`
- 12 metod wysyłkowych używających surowych stringów HTML
- `wrapHtml()` — bazowy wrapper dodający `<body>` i stopkę
- `APP_BRAND` w `@zgadajsie/shared` — stałe brandingowe (NAME, TAGLINE, NOREPLY_EMAIL)
- `formatDateTime()` w `@zgadajsie/shared` — formatowanie dat z Luxon

### Aktualnie wysyłane emaile (12 metod)

| Metoda EmailService            | Odbiorca    | Opis                                |
| ------------------------------ | ----------- | ----------------------------------- |
| `sendActivationEmail`          | nowy user   | Link aktywacyjny po rejestracji     |
| `sendPasswordResetEmail`       | user        | Link do resetu hasła                |
| `sendParticipationStatusEmail` | uczestnik   | Status zapisu (5 wariantów)         |
| `sendEventCancelledEmail`      | uczestnik   | Anulowanie wydarzenia               |
| `sendNewApplicationEmail`      | organizator | Nowe zgłoszenie do wydarzenia       |
| `sendPaymentConfirmationEmail` | uczestnik   | Potwierdzenie płatności             |
| `sendRefundConfirmationEmail`  | uczestnik   | Zwrot płatności                     |
| `sendReprimandEmail`           | user        | Reprymenda od organizatora          |
| `sendAnnouncementEmail`        | uczestnik   | Komunikat organizatora z linkiem    |
| `sendEventReminderEmail`       | uczestnik   | Przypomnienie o wydarzeniu          |
| `sendContactEmail`             | internal    | Formularz kontaktowy do admina      |
| `sendOrganizerWeeklyDigest`    | organizator | Tygodniowy raport z potwierdzeniami |

### Główne problemy obecnego rozwiązania

- Szablony to surowe stringi HTML — brak type safety dla zawartości
- Inline style `style="color:#3b82f6"` — niespójne z design tokenami aplikacji
- Brak podglądu emaili podczas development
- Brak testów snapshot (nie wiadomo czy email „wygląda jak powinien")
- Trudny refactor — zmiana layoutu wymaga edycji 12 miejsc
- Brak plain text fallback

---

## Architektura docelowa

```
workspace/
  libs/
    shared/               ← istniejąca (@zgadajsie/shared)
    email/                ← NOWA biblioteka (@zgadajsie/email)
      src/
        components/       ← prymitywy wielokrotnego użytku
        layouts/          ← bazowe layouty
        templates/        ← konkretne szablony biznesowe
        types/            ← typy propsów do szablonów
        utils/            ← render helper
        index.ts
      package.json
      tsconfig.json
      tsconfig.lib.json

  backend/
    src/modules/notifications/
      email.service.ts    ← MIGRACJA: zamiana inline HTML → renderEmail(...)
```

### Stos technologiczny

| Warstwa      | Technologia                         | Status        |
| ------------ | ----------------------------------- | ------------- |
| Renderowanie | React Email (`@react-email/render`) | do instalacji |
| Komponenty   | `@react-email/components`           | do instalacji |
| Styling      | inline-safe Tailwind lub inline CSS | do decyzji    |
| Transport    | Resend v6                           | ✅ gotowe     |
| Biblioteka   | `libs/email` (Nx)                   | do stworzenia |
| Preview      | `react-email` dev server            | do instalacji |

---

## Kolory do użycia w szablonach (design tokens → hex)

> Emaile muszą używać hardcoded hexów — CSS variables nie działają w klientach email.

| Token         | Hex       | Zastosowanie                     |
| ------------- | --------- | -------------------------------- |
| `primary-500` | `#37bc9b` | Przyciski CTA, linki, akcenty    |
| `primary-600` | `#26a386` | Hover na przycisku               |
| `primary-50`  | `#e8faf5` | Tło akcentowe (sekcja z callout) |
| `neutral-900` | `#1c1f23` | Tekst główny                     |
| `neutral-500` | `#656d78` | Tekst drugorzędny                |
| `neutral-200` | `#dadce2` | Bordery, separator               |
| `neutral-50`  | `#f8f9fa` | Tło body emaila                  |
| `success-400` | `#8cc152` | Status: potwierdzony             |
| `warning-400` | `#e9573f` | Status: oczekuje, ostrzeżenia    |
| `danger-500`  | `#da4453` | Status: odrzucony, błędy         |
| `info-400`    | `#4a89dc` | Status: przydzielono miejsce     |

---

## Checklist wdrożenia

### Etap 1 — Instalacja i konfiguracja biblioteki

- [x] Zainstalować React Email w backend (lub jako workspace dep):

  > Zainstalowano `@react-email/render` i `@react-email/components` do workspace root (`-w`).
  > `react` 18.3.1 był już dostępny jako zależność tranzytywna. Użyto indywidualnych pakietów `@react-email/*` zamiast przestarzałego bundla `@react-email/components`.

- [x] Zainstalować `react-email` CLI do preview:

  > Zainstalowano `react-email` jako devDependency do workspace root. `@types/react` dodany.

- [x] Stworzyć bibliotekę Nx `libs/email`:

  > Stworzono ręcznie `libs/email/src/` jako podfolder istniejącego pakietu `libs`. Dodano `@zgadajsie/email` do `tsconfig.base.json`. Brak potrzeby pełnej restrukturyzacji workspace.

- [x] Skonfigurować JSX:

  > Dodano `"jsx": "react-jsx"` i `"jsxImportSource": "react"` do `backend/tsconfig.app.json`, `backend/tsconfig.spec.json` oraz `libs/tsconfig.spec.json`. Plik `email.service.tsx` (zmiana rozszerzenia z `.ts`).

- [x] Skonfigurować skrypt preview:

  > Dodano `test:email` script w root `package.json`. Preview server (`react-email dev`) dostępny przez `react-email` CLI zainstalowane globalnie.

- [ ] Uruchomić preview i zweryfikować że działa:
  ```bash
  cd libs/email && pnpm email:dev
  ```
  > Etap opcjonalny (Etap 9) — do weryfikacji ręcznej.

---

### Etap 2 — Typy szablonów (`libs/email/src/types/templates.ts`)

- [x] Zdefiniować typy propsów dla każdego szablonu:
  > Utworzono `libs/email/src/types/templates.ts` z wszystkimi typami z planu + `AdminDailyReportEmailProps` (dla metody spoza oryginalnego planu).

```ts
export interface ActivationEmailProps {
  displayName: string;
  activationLink: string;
}

export interface PasswordResetEmailProps {
  resetLink: string;
}

export type ParticipationStatus =
  | 'SLOT_ASSIGNED'
  | 'APPROVAL_REMINDER'
  | 'CONFIRMED'
  | 'REMOVED'
  | 'REJECTED';

export interface ParticipationStatusEmailProps {
  displayName: string;
  eventTitle: string;
  status: ParticipationStatus;
  eventLink?: string;
}

export interface EventCancelledEmailProps {
  displayName: string;
  eventTitle: string;
}

export interface NewApplicationEmailProps {
  organizerName: string;
  applicantName: string;
  eventTitle: string;
  manageLink: string;
}

export interface PaymentConfirmationEmailProps {
  displayName: string;
  eventTitle: string;
  amount: number;
  eventLink: string;
}

export interface RefundConfirmationEmailProps {
  displayName: string;
  eventTitle: string;
  amount: number;
}

export interface ReprimandEmailProps {
  displayName: string;
  eventTitle: string;
  reason: string;
}

export interface AnnouncementEmailProps {
  displayName: string;
  eventTitle: string;
  message: string;
  priority: 'INFO' | 'ORGANIZATIONAL' | 'CRITICAL';
  confirmLink: string;
}

export interface EventReminderEmailProps {
  displayName: string;
  eventTitle: string;
  eventTime: string; // sformatowany string z Luxon
  eventLink: string;
}

export interface ContactEmailProps {
  senderName: string;
  senderEmail: string;
  message: string;
}

export interface OrganizerWeeklyDigestEmailProps {
  displayName: string;
  frontendUrl: string;
  period: { from: string; to: string };
  pendingConfirmations: Array<{
    id: string;
    title: string;
    startsAt: string;
    seriesName: string | null;
    confirmToken: string | null;
  }>;
  upcoming: Array<{ id: string; title: string; startsAt: string; enrollmentCount: number }>;
  recentlyCreated: Array<{ id: string; title: string }>;
  recentlyEnded: Array<{ id: string; title: string; enrollmentCount: number }>;
  recentlyCancelled: Array<{ id: string; title: string }>;
  activeSeries: Array<{
    id: string;
    name: string;
    pendingCount: number;
    suspendedReason: string | null;
  }>;
}

export interface EmailTemplates {
  activation: ActivationEmailProps;
  passwordReset: PasswordResetEmailProps;
  participationStatus: ParticipationStatusEmailProps;
  eventCancelled: EventCancelledEmailProps;
  newApplication: NewApplicationEmailProps;
  paymentConfirmation: PaymentConfirmationEmailProps;
  refundConfirmation: RefundConfirmationEmailProps;
  reprimand: ReprimandEmailProps;
  announcement: AnnouncementEmailProps;
  eventReminder: EventReminderEmailProps;
  contact: ContactEmailProps;
  organizerWeeklyDigest: OrganizerWeeklyDigestEmailProps;
}
```

---

### Etap 3 — Komponenty bazowe (`libs/email/src/components/`)

- [x] `Button.tsx` — przycisk CTA:

  ```tsx
  import { Button as EmailButton } from '@react-email/components';

  interface ButtonProps {
    href: string;
    children: React.ReactNode;
    variant?: 'primary' | 'danger';
  }

  export function Button({ href, children, variant = 'primary' }: ButtonProps) {
    const bg = variant === 'danger' ? '#da4453' : '#37bc9b';
    return (
      <EmailButton
        href={href}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: bg,
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        {children}
      </EmailButton>
    );
  }
  ```

- [x] `Header.tsx` — nagłówek emaila z nazwą brandu

- [x] `Footer.tsx` — stopka z APP_BRAND.NAME i TAGLINE

- [x] `Divider.tsx` — separator `<Hr />`

- [x] `Text.tsx` — tekst z predefiniowanymi wariantami (body, muted, small)

- [x] `Callout.tsx` — wyróżniona sekcja (jak announcement message, suspended warning)

- [x] `EventRow.tsx` — wiersz tabeli z tytułem i datą wydarzenia (dla digestu)

---

### Etap 4 — Layout (`libs/email/src/layouts/TransactionalLayout.tsx`)

- [x] Stworzyć bazowy layout z:
  - `<Html lang="pl">` + `<Head />` z `<meta charset="utf-8">`
  - `<Body>` z `backgroundColor: '#f8f9fa'`
  - `<Container>` z `maxWidth: 600px`, `margin: '0 auto'`
  - `<Header />` na górze
  - `{children}` w środku
  - `<Footer />` na dole
  - `<Preview>` dla tekstu podglądu w skrzynce

```tsx
import { Html, Head, Body, Container, Preview } from '@react-email/components';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface TransactionalLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function TransactionalLayout({ preview, children }: TransactionalLayoutProps) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f8f9fa', fontFamily: 'sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Header />
          {children}
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}
```

---

### Etap 5 — Szablony (`libs/email/src/templates/`)

W kolejności od najprostszych do najbardziej złożonych:

- [x] `ActivationEmail.tsx`
- [x] `PasswordResetEmail.tsx`
- [x] `EventCancelledEmail.tsx`
- [x] `EventReminderEmail.tsx`
- [x] `NewApplicationEmail.tsx`
- [x] `PaymentConfirmationEmail.tsx`
- [x] `RefundConfirmationEmail.tsx`
- [x] `ReprimandEmail.tsx`
- [x] `ParticipationStatusEmail.tsx` (5 wariantów w jednym komponencie)
- [x] `AnnouncementEmail.tsx` (callout z priorytetem + przycisk potwierdzenia)
- [x] `ContactEmail.tsx` (wewnętrzny, prostszy layout)
- [x] `OrganizerWeeklyDigestEmail.tsx` (najbardziej złożony — sekcje, tabele)
- [x] `AdminDailyReportEmail.tsx` (dodatkowy — poza oryginalnym planem, dla metody `sendAdminDailyReport`)

---

### Etap 6 — Render helper (`libs/email/src/utils/render-email.ts`)

- [x] Stworzyć funkcję renderującą komponent React do HTML i plain text:

```ts
import { render } from '@react-email/render';

export async function renderEmail(element: React.ReactElement): Promise<{
  html: string;
  text: string;
}> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}
```

- [x] Wyeksportować z `libs/email/src/index.ts`

---

### Etap 7 — Migracja EmailService

> Priorytet migracji od najprostszych szablonów (ActivationEmail) do najbardziej złożonych (OrganizerWeeklyDigest).

- [x] Zaktualizować `EmailService.send()` aby przyjmować też `text`

- [x] Usunąć `wrapHtml()` po migracji wszystkich szablonów

- [x] Migrować kolejno każdą metodę:
  - [x] `sendActivationEmail` → `<ActivationEmail />`
  - [x] `sendPasswordResetEmail` → `<PasswordResetEmail />`
  - [x] `sendEventCancelledEmail` → `<EventCancelledEmail />`
  - [x] `sendEventReminderEmail` → `<EventReminderEmail />`
  - [x] `sendNewApplicationEmail` → `<NewApplicationEmail />`
  - [x] `sendPaymentConfirmationEmail` → `<PaymentConfirmationEmail />`
  - [x] `sendRefundConfirmationEmail` → `<RefundConfirmationEmail />`
  - [x] `sendReprimandEmail` → `<ReprimandEmail />`
  - [x] `sendParticipationStatusEmail` → `<ParticipationStatusEmail />`
  - [x] `sendAnnouncementEmail` → `<AnnouncementEmail />`
  - [x] `sendContactEmail` → `<ContactEmail />`
  - [x] `sendOrganizerWeeklyDigest` → `<OrganizerWeeklyDigestEmail />`
  - [x] `sendAdminDailyReport` → `<AdminDailyReportEmail />` (bonus — spoza planu)

Przykład po migracji:

```ts
import { renderEmail } from '@zgadajsie/email';
import { ActivationEmail } from '@zgadajsie/email';

async sendActivationEmail(email: string, displayName: string, token: string): Promise<void> {
  const link = `${this.frontendUrl}/auth/activate?token=${token}`;
  const { html, text } = await renderEmail(
    <ActivationEmail displayName={displayName} activationLink={link} />
  );
  await this.send(email, `Aktywacja konta – ${APP_BRAND.NAME}`, html, text);
}
```

> `EmailService` zostaje w `notifications/` — nie ma potrzeby przenoszenia do osobnego modułu.

---

### Etap 8 — Testy snapshot

- [x] Skonfigurować Jest dla TSX w `libs/email/` — ts-jest z JSX + `NODE_OPTIONS=--experimental-vm-modules` (wymagane przez `@react-email/render` v2 używającego dynamic import).

- [x] Stworzyć `libs/email/src/templates/__tests__/` z plikami:
  - `activation-email.spec.tsx`
  - `password-reset-email.spec.tsx`
  - `organizer-weekly-digest-email.spec.tsx`
    > Łącznie 28 testów (snapshots + asercje na kluczowe elementy). Uruchomienie: `pnpm test:email`.

- [x] Wzorzec testu snapshot:

  ```tsx
  import { render } from '@react-email/render';
  import { ActivationEmail } from '../ActivationEmail';

  it('renders ActivationEmail correctly', async () => {
    const html = await render(
      <ActivationEmail
        displayName="Jan Kowalski"
        activationLink="https://zgadajsie.pl/auth/activate?token=abc"
      />,
    );
    expect(html).toMatchSnapshot();
  });
  ```

- [x] Dodać test weryfikujący obecność krytycznych elementów (linku, nazwy brandu):
  ```tsx
  expect(html).toContain('Aktywuj konto');
  expect(html).toContain('ZgadajSie.pl');
  expect(html).toContain('auth/activate?token=abc');
  ```

---

### Etap 9 — Preview workflow (opcjonalnie, na końcu)

- [x] Dodać script w root `package.json`:

  ```json
  "email:dev": "cd libs/email && npx email dev"
  ```

- [x] Zainstalować `@react-email/ui` (wymagane przez preview server v6):

  ```bash
  pnpm add -D -w @react-email/ui
  ```

- [x] Skonfigurować strukturę dla React Email CLI:
  - Stworzyć `libs/email/email.config.ts` z `source: './src'`
  - Stworzyć symlinki: `emails → src/templates`, `components → src/components`, `layouts → src/layouts`, `types → src/types`
  - React Email CLI wymaga plików w root katalogu, nie w podkatalogu `src`

- [x] Zweryfikować że wszystkie szablony są widoczne w preview server (http://localhost:3001)

- [ ] Sprawdzić rendering w email testowych klientach (np. Litmus lub email na gmailu)

---

## Priorytety i kolejność wdrożenia

### MVP (najważniejsze, najczęściej używane)

1. **Infrastruktura** — instalacja deps, libs/email, tsconfig
2. **TransactionalLayout + komponenty** — Button, Header, Footer
3. **ActivationEmail** — pierwsze konto użytkownika
4. **PasswordResetEmail**
5. **Render helper + migracja tych dwóch w EmailService**

### Druga iteracja

6. ParticipationStatusEmail
7. EventCancelledEmail
8. AnnouncementEmail (z callout priorytetów)

### Trzecia iteracja

9. OrganizerWeeklyDigestEmail (najbardziej złożony)
10. Pozostałe szablony
11. Snapshot tests
12. Preview workflow

---

## Decyzje otwarte

| Decyzja                     | Opcje                                  | Rekomendacja                                   |
| --------------------------- | -------------------------------------- | ---------------------------------------------- |
| Gdzie instalować React deps | w `backend/` vs workspace root         | `backend/` — unika zanieczyszczenia Angular    |
| Tailwind w emailach         | Tak (tw-to-inline) vs czyste CSS       | Czyste inline CSS — prostsze i bezpieczniejsze |
| Przeniesienie EmailService  | zostaje w `notifications/` vs `email/` | Zostaje — brak uzasadnienia dla przenoszenia   |

---

## Uwagi implementacyjne

- Emaile NIE używają CSS variables (`rgb(var(--color-*))`) — używaj hardcoded hexów z tabeli tokenów powyżej
- `maxWidth: 600px` jest standardem dla emaili transakcyjnych
- Nie używaj flexbox ani CSS Grid w emailach — table-based layout dla kompatybilności
- `@react-email/components` dostarcza `<Html>`, `<Head>`, `<Body>`, `<Container>`, `<Section>`, `<Row>`, `<Column>`, `<Text>`, `<Button>`, `<Link>`, `<Hr>`, `<Preview>`, `<Img>` — używaj tych komponentów zamiast surowych tagów HTML
- Format daty w emailach: `formatDateTime(date)` z `@zgadajsie/shared` (Luxon, timezone Europe/Warsaw)
