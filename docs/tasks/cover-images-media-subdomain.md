# Podpięcie subdomeny `media.zgadajsie.pl` pod bucket R2 (prod)

## Cel

Zastąpić publiczny URL bucketu prod (`https://pub-19c789f4a4204aa3b3a63add2d7f97a4.r2.dev`) własną
subdomeną `media.zgadajsie.pl`. Korzyści: stabilny, brandowany URL niezależny od `r2.dev`, lepsza
kontrola cache/CDN, brak zależności od domyślnej domeny Cloudflare.

> Status: **nieobowiązkowe / odłożone**. Obecnie covery prod ładują się poprawnie z `r2.dev`.
> Ten task realizujemy gdy chcemy docelowy, brandowany host mediów.

## Stan obecny

- Bucket prod (media): publiczny dostęp przez `r2.dev`.
- `frontend/src/environments/environment.production.ts` → `mediaUrl: 'https://pub-19c789f4a4204aa3b3a63add2d7f97a4.r2.dev'`.
- `frontend/src/environments/base.ts` → `publicMediaUrl: 'https://pub-1ae4230bedb64658a034b3a7c70804c1.r2.dev'` (wspólny bucket publicznej galerii dyscyplin).
- Backend: `R2_PUBLIC_URL` ustawiony w Coolify na URL `r2.dev`.

## Zakres

Decyzja: czy subdomena ma obsługiwać **tylko bucket mediów per-env** (`mediaUrl`), czy także
**wspólny bucket publicznej galerii** (`publicMediaUrl`). Rekomendacja: osobne subdomeny, np.
`media.zgadajsie.pl` (mediaUrl prod) oraz ewentualnie `media-public.zgadajsie.pl` (publicMediaUrl),
albo świadomie zostawić publiczną galerię na `r2.dev` (jest współdzielona między środowiskami).

## Kroki

### 1. Cloudflare — Custom Domain dla bucketu prod

1. Wymóg: `zgadajsie.pl` musi być zarządzane przez Cloudflare DNS.
2. R2 → bucket prod (media) → **Settings → Custom Domains → Connect Domain** → `media.zgadajsie.pl`.
3. Cloudflare automatycznie utworzy rekord CNAME i wystawi certyfikat TLS.
4. Poczekać aż status domeny = **Active** (propagacja + cert).

### 2. CORS

Zweryfikować, że konfiguracja CORS bucketu nadal obejmuje originy aplikacji
(`https://zgadajsie.pl`, `https://www.zgadajsie.pl`, `https://dev.zgadajsie.pl`,
`http://localhost:4300`) — patrz `docs/tasks/cloudflare-r2-setup.md` krok 5. Custom domain nie zmienia
CORS, ale warto potwierdzić po podpięciu.

### 3. Backend — `R2_PUBLIC_URL`

W Coolify → PROD backend → Environment Variables:

```
R2_PUBLIC_URL=https://media.zgadajsie.pl
```

Redeploy backendu prod. (Dotyczy storageKey budowanych po stronie backendu, jeśli gdziekolwiek
zwracany jest pełny URL — w obecnej architekturze FE składa URL sam, więc kluczowe jest pole frontendowe.)

### 4. Frontend — `environment.production.ts`

```ts
mediaUrl: 'https://media.zgadajsie.pl',
```

Rebuild + redeploy frontend prod (`BUILD_CONFIGURATION=production`).

### 5. Weryfikacja

- [ ] `https://media.zgadajsie.pl/<dowolny-storageKey>` zwraca obraz (200, poprawny `content-type`).
- [ ] Cover images wydarzeń na prodzie ładują się z `media.zgadajsie.pl` (DevTools → Network).
- [ ] Brak błędów CORS w konsoli.
- [ ] Cache-busting `?v={updatedAt}` działa po podmianie obrazu.
- [ ] Stare URL-e `r2.dev` nadal działają (fallback przez okres przejściowy) — opcjonalnie.

## Uwagi / rollback

- Rollback: przywrócić poprzedni `r2.dev` URL w `environment.production.ts` + `R2_PUBLIC_URL`, redeploy.
- `storageKey` w bazie są względne (bez hosta), więc zmiana hosta nie wymaga migracji danych.
- Cache przeglądarek/CDN może przez chwilę serwować stary host — bez wpływu na poprawność.
