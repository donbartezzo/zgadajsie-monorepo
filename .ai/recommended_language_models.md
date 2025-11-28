# 🧠 Rekomendowane modele językowe (LLM) dla stacku Angular + NestJS + Nx + Prisma

Dokument opisuje zalecane modele LLM do wykorzystania w procesie developmentu oraz automatyzacji, dopasowane do środowiska: [Stack technologiczny](../docs/tech-stack.md)

---

## 1. Modele do codziennego developmentu

| Zastosowanie                                             | Zalecany model                    | Powód / komentarz                                                                                 |
| -------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Generowanie kodu (frontend / backend)**                | **GPT-5 / GPT-4o (OpenAI)**       | Najlepsza jakość TypeScript, rozumienie Angulara, RxJS i NestJS, dobre wsparcie dla Zod i Prisma. |
| **Refaktoryzacja i optymalizacja kodu Nx monorepo**      | **Claude 3.5 Sonnet (Anthropic)** | Bardzo dobre rozumienie dużych struktur repozytorium (Nx workspaces, zależności między libami).   |
| **Dokumentacja API (Swagger, OpenAPI)**                  | **GPT-4o-mini / GPT-5**           | Szybkie generowanie/aktualizacja plików OpenAPI i komentarzy JSDoc.                               |
| **Testy jednostkowe (Jest) i e2e (Playwright)**          | **GPT-4o-mini / Gemini 1.5 Pro**  | Dobrze radzą sobie z testami UI, mockami i setupami CI/CD.                                        |
| **Generowanie commitów i opisów (Conventional Commits)** | **GPT-4o-mini**                   | Lekki model, szybki, wystarczający do generowania komunikatów commitów.                           |

---

## 2. Modele dedykowane pod integracje i automatyzację

| Obszar                                                      | Model                              | Przykładowe użycie                                                 |
| ----------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| **Walidacja i generacja DTO (Zod, Prisma)**                 | **GPT-5 / Claude 3.5 Sonnet**      | Generowanie typów i walidatorów Zod na podstawie schematów Prisma. |
| **SSR i SEO-ready content (Angular + Nest SSR)**            | **GPT-5-turbo / Gemini 1.5 Flash** | Dynamiczne generowanie meta-tagów i SEO contentu.                  |
| **Push notifications / treści dynamiczne (Web Push / FCM)** | **GPT-4o-mini**                    | Generowanie personalizowanych komunikatów powiadomień.             |
| **Integracje OAuth / Passport**                             | **GPT-4o / Claude 3.5**            | Pomoc przy konfiguracjach strategii OAuth, JWT, refresh tokenów.   |
| **Analiza logów CI/CD (Nx Cloud, Husky, lint-staged)**      | **Claude 3 Haiku**                 | Szybka analiza logów pipeline’ów i błędów lintingu.                |

---
