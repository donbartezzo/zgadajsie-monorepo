# libs

Współdzielone biblioteki dla monorepo ZgadajSie.pl.

## Struktura

- `src/lib/` — @zgadajsie/shared (constants, utils, enums)
- `email/` — @zgadajsie/email (szablony email oparte na React Email)

## Dokumentacja

- [Email templates README](./email/README.md)

## Testy

```bash
# Wszystkie testy libs
nx test libs

# Testy email (snapshots)
pnpm test:email
```
