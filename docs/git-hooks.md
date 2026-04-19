# Git Hooks — automatyczna walidacja kodu

Projekt używa **husky** + **lint-staged** do automatycznego sprawdzania jakości kodu przy commitach i pushach.

## Setup

Hooki instalują się automatycznie po `pnpm install` (skrypt `prepare` w `package.json`).

Jeśli hooki nie działają, uruchom ręcznie:

```bash
pnpm exec husky init
```

---

## Hooki

### Pre-commit — lint-staged

**Kiedy:** Przed każdym `git commit`.

**Co robi:** Uruchamia ESLint + Prettier **tylko na zmienionych plikach** (staged files).

| Pliki                                                            | Akcje                               |
| ---------------------------------------------------------------- | ----------------------------------- |
| `*.ts`, `*.js`, `*.mjs`                                          | `eslint --fix` → `prettier --write` |
| `*.json`, `*.md`, `*.yml`, `*.yaml`, `*.scss`, `*.css`, `*.html` | `prettier --write`                  |

**Czas:** <5 sekund (tylko zmienione pliki).

**Efekt:** Poprawione pliki są automatycznie dodane do commita. Jeśli ESLint znajdzie błąd, którego nie może naprawić automatycznie — commit zostaje zablokowany.

### Pre-push — unit testy

**Kiedy:** Przed każdym `git push`.

**Co robi:** Uruchamia `pnpm test` (unit testy backend + frontend + libs z cache Nx).

**Czas:** ~10s (z cache) do ~30s (bez cache).

**Efekt:** Push zostaje zablokowany, jeśli jakikolwiek unit test nie przechodzi.

---

## Pominięcie hooków

W sytuacjach awaryjnych można pominąć hooki:

```bash
# Pomiń pre-commit
git commit --no-verify -m "wip: quick fix"

# Pomiń pre-push
git push --no-verify
```

> **Uwaga:** Używaj `--no-verify` tylko w wyjątkowych sytuacjach. CI i tak wykryje problemy.

---

## Pełny pipeline walidacji

```
                    LOKALNE                           │         ZDALNE (GitHub)
                                                      │
  git commit                                          │
    └─ pre-commit: lint-staged                        │
         ├─ ESLint --fix (zmienione .ts/.js)          │
         └─ Prettier --write (zmienione pliki)        │
                                                      │
  git push                                            │
    └─ pre-push: pnpm test                            │
         └─ Unit testy (backend + frontend + libs)    │
                                                      │
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                                                      │
                                                      │  push → main / GitHub Release
                                                      │    └─ CI job:
                                                      │         1. pnpm lint
                                                      │         2. pnpm format:check
                                                      │         3. pnpm test:ci (no cache)
                                                      │         4. build backend + frontend
                                                      │    └─ deploy-dev / deploy-prod
```

### Manualne komendy uzupełniające

| Komenda                 | Kiedy                         | Opis                                           |
| ----------------------- | ----------------------------- | ---------------------------------------------- |
| `pnpm validate`         | Przed ważnym PR               | Lint + format + unit (no cache) + build        |
| `pnpm test:integration` | Po zmianach logiki biznesowej | Wymaga test DB (`docker-compose.test.yml`)     |
| `pnpm test:e2e`         | Przed release                 | Wymaga działającego full stacku (`pnpm start`) |
| `pnpm test:all`         | Pełna weryfikacja             | Unit + integration + E2E sekwencyjnie          |

---

## Konfiguracja

### Pliki

- `.husky/pre-commit` — hook pre-commit
- `.husky/pre-push` — hook pre-push
- `.husky/common.sh` — wrapper znajdujący pnpm (rozwiązuje problem PATH w git hookach)
- `package.json` → sekcja `lint-staged` — reguły lint-staged
- `package.json` → `scripts.prepare` → `husky` — automatyczna instalacja hooków

### Zależności

- `husky` — zarządzanie git hookami
- `lint-staged` — uruchamianie linterów na staged files
