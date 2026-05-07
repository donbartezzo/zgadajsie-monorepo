# @zgadajsie/email

Biblioteka szablonów email dla ZgadajSie.pl oparta na React Email.

## Struktura

```
libs/email/
├── src/
│   ├── components/     # Reusable email components (Button, Header, Footer, etc.)
│   ├── layouts/        # Base layouts (TransactionalLayout)
│   ├── templates/      # Business email templates (13 templates)
│   ├── types/          # TypeScript types for template props
│   └── utils/          # Render helper (renderEmail)
└── email.config.ts     # React Email CLI configuration
```

## Uruchomienie preview server

React Email CLI wymaga specyficznej struktury plików w root katalogu. Dlatego tworzymy symlinki:

```bash
cd libs/email
ln -s src/templates emails
ln -s src/components components
ln -s src/layouts layouts
ln -s src/types types
```

Następnie uruchom preview server:

```bash
# Z root workspace
pnpm email:dev

# Lub bezpośrednio
cd libs/email && pnpm exec email dev
```

Preview server będzie dostępny pod `http://localhost:3001` (lub 3000 jeśli wolny).

## Szablony

- ActivationEmail
- PasswordResetEmail
- ParticipationStatusEmail
- EventCancelledEmail
- NewApplicationEmail
- PaymentConfirmationEmail
- RefundConfirmationEmail
- ReprimandEmail
- AnnouncementEmail
- EventReminderEmail
- OrganizerWeeklyDigestEmail
- ContactEmail
- AdminDailyReportEmail

## Testy

```bash
pnpm test:email
```

Testy snapshot są w `src/templates/__tests__/`.
