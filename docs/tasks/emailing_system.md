# System Emailingu — Plan Wdrożenia

## Cel

Stworzenie nowoczesnego, skalowalnego i łatwego w utrzymaniu systemu emailingu dla aplikacji opartej o:

- Angular 20
- NestJS 11
- Nx monorepo
- TypeScript

System powinien zapewniać:

- komponentowe szablony emaili,
- łatwy styling,
- wysoki poziom reużywalności,
- type safety,
- prosty development workflow,
- preview emaili,
- zgodność z klientami email,
- łatwe skalowanie i rozwój.

---

# Docelowy Stack

## Rendering emaili

- React Email
- @react-email/render
- @react-email/components

## Styling

- Tailwind CSS

## Transport emaili

Opcja A:

- Resend (rekomendowane)

Opcja B:

- Nodemailer + SMTP

## Backend integration

- NestJS EmailService

## Monorepo

- dedykowana biblioteka `libs/email`

---

# Architektura

```txt
apps/
  api/
  web/

libs/
  email/
```

---

# Struktura biblioteki email

```txt
libs/email/
  src/

    components/
      Button.tsx
      Footer.tsx
      Header.tsx

    layouts/
      TransactionalLayout.tsx

    templates/
      WelcomeEmail.tsx
      ResetPasswordEmail.tsx
      MagicLinkEmail.tsx

    types/
      templates.ts

    utils/
      render-email.ts

    index.ts
```

---

# Instalacja zależności

## Core

```bash
pnpm add react react-dom
pnpm add @react-email/components
pnpm add @react-email/render
```

## Tailwind

```bash
pnpm add tailwindcss
```

## Resend

```bash
pnpm add resend
```

lub:

## Nodemailer

```bash
pnpm add nodemailer
```

---

# Konfiguracja Nx

## Utworzenie biblioteki

```bash
nx g @nx/js:lib email
```

lub:

```bash
nx g @nx/react:lib email
```

> React library jest wygodniejsza dla TSX.

---

# Konfiguracja TypeScript

## tsconfig.lib.json

Włączyć:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

---

# Konfiguracja Tailwind

## Cel

Tailwind ma służyć wyłącznie do stylowania emaili.

## Zalecenie

Utworzyć osobny config:

```txt
libs/email/tailwind.config.js
```

Przykład:

```js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
};
```

---

# Layout System

## Cel

Oddzielenie:

- layoutów,
- komponentów,
- templatek biznesowych.

## Struktura

```txt
layouts/
  TransactionalLayout.tsx

components/
  EmailButton.tsx
  EmailFooter.tsx

templates/
  WelcomeEmail.tsx
```

---

# Typed Templates

## Cel

Pełna type safety dla danych przekazywanych do templatek.

## Definicja

```ts
export interface WelcomeEmailProps {
  username: string;
  verifyUrl: string;
}
```

---

# Registry Templatek

## Cel

Centralizacja templatek i typów.

```ts
export interface EmailTemplates {
  welcome: WelcomeEmailProps;
  resetPassword: ResetPasswordProps;
}
```

---

# Rendering Emaili

## render-email.ts

```ts
import { render } from '@react-email/render';

export async function renderEmail(element: React.ReactElement) {
  return render(element);
}
```

---

# Integracja z NestJS

## EmailService

```ts
@Injectable()
export class EmailService {
  async sendWelcomeEmail(data: WelcomeEmailProps) {
    const html = await renderEmail(
      <WelcomeEmail {...data} />
    );

    await this.mailer.sendMail({
      to: data.email,
      subject: 'Welcome',
      html,
    });
  }
}
```

---

# Resend Integration

## Zalecenie

Preferowany provider dla nowoczesnych aplikacji.

## Zalety

- bardzo prosty API,
- świetny DX,
- dobra dostarczalność,
- React Email integration,
- nowoczesny stack developerski.

## Implementacja

```ts
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@domain.com',
  to: email,
  subject: 'Welcome',
  html,
});
```

---

# Nodemailer Integration

## Kiedy użyć

- własny SMTP,
- własny provider,
- SES,
- Mailgun,
- Postmark,
- legacy systems.

---

# Preview Workflow

## Cel

Lokalny podgląd emaili bez wysyłki.

## Rekomendacja

Użycie React Email preview server.

## Komenda

```bash
pnpm email dev
```

---

# Reusable Components

## Rekomendowane komponenty

```txt
components/
  Button.tsx
  Divider.tsx
  Footer.tsx
  Header.tsx
  Logo.tsx
  Section.tsx
  Spacer.tsx
  Text.tsx
```

---

# Best Practices

## 1. Mobile-first

Projektować przede wszystkim pod mobile.

---

## 2. Maksymalna szerokość

```txt
600px
```

---

## 3. Inline-safe styling

Nie używać:

- CSS modules,
- SCSS,
- nowoczesnych layoutów CSS.

Polegać na:

- React Email,
- Tailwind utility classes.

---

## 4. Plain Text Fallback

Generować:

- HTML,
- TEXT version.

---

## 5. Shared Design Tokens

Współdzielić:

- kolory,
- spacing,
- typography constants.

Między:

- Angular frontend,
- email system.

---

## 6. Snapshot Testing

Testować:

- render HTML,
- critical templates.

---

## 7. Oddzielić Email Types

```txt
transactional/
marketing/
system/
```

---

# Suggested Initial Templates

## MVP

```txt
WelcomeEmail
VerifyEmail
ResetPasswordEmail
MagicLinkEmail
NotificationEmail
```

---

# Security

## Nigdy nie umieszczać:

- JWT tokenów bez expiry,
- danych wrażliwych,
- pełnych danych użytkownika.

---

# Performance

## Cache reusable fragments

Opcjonalnie:

- logo,
- footer,
- static blocks.

---

# Monitoring

## Warto wdrożyć

- delivery tracking,
- bounce tracking,
- open tracking,
- resend retry strategy.

---

# Kolejność wdrożenia

## Etap 1 — infrastruktura

- utworzenie `libs/email`
- instalacja React Email
- konfiguracja TSX
- konfiguracja Tailwind

---

## Etap 2 — rendering

- render helper
- EmailService
- provider (Resend/Nodemailer)

---

## Etap 3 — layout system

- layout bazowy
- komponenty współdzielone

---

## Etap 4 — pierwsze templaty

- Welcome
- Reset Password
- Verify Email

---

## Etap 5 — preview workflow

- local preview
- development scripts

---

## Etap 6 — testy

- snapshot tests
- rendering validation

---

# Final Recommendation

Dla obecnego stacku najlepszym rozwiązaniem będzie:

- React Email
- Tailwind
- Resend
- typed templates
- modularna biblioteka Nx

Podejście zapewni:

- bardzo dobry DX,
- łatwe utrzymanie,
- szybki rozwój emailingu,
- wysoką skalowalność,
- zgodność z nowoczesnym TypeScript stackiem.
