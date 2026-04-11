# Konfiguracja Cloudflare R2

R2 jest używane do przechowywania mediów uploadowanych przez użytkowników (avatary, zdjęcia).
Upload przechodzi przez backend (nie bezpośrednio z przeglądarki), więc konfiguracja CORS dotyczy tylko odczytu.

Env vars do uzupełnienia: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

## Krok 1 — Konto i włączenie R2

1. Zaloguj / zarejestruj się na [cloudflare.com](https://cloudflare.com)
2. Dashboard → **R2 Object Storage → Get started**

> Wymagana karta kredytowa do aktywacji. Free tier: **10 GB + 1M operacji/mies.** — stały, bez limitu czasowego. Karta tylko jako zabezpieczenie przy przekroczeniu limitu.

## Krok 2 — Utwórz dwa buckety

**R2 → Create bucket** (dwa osobne — izolacja danych prod/dev):

| Pole | Prod | Dev |
|---|---|---|
| Bucket name | `zgadajsie-media` | `zgadajsie-media-dev` |
| Location | Automatic | Automatic |

## Krok 3 — Publiczny dostęp

Pliki muszą być publicznie dostępne przez URL (wyświetlanie avatarów w przeglądarce).

**Bucket `zgadajsie-media` (prod) — zalecana opcja z custom domain:**

Settings → **Custom Domains → Connect Domain** → wpisz `media.zgadajsie.pl`
(wymaga żeby `zgadajsie.pl` był na Cloudflare DNS — Cloudflare skonfiguruje subdomenę automatycznie)

`R2_PUBLIC_URL` = `https://media.zgadajsie.pl`

**Bucket `zgadajsie-media-dev` (dev) — wystarczy r2.dev URL:**

Settings → **Public Access → Allow Access** → wygeneruje URL w stylu `pub-xxx.r2.dev`

`R2_PUBLIC_URL` = wygenerowany URL `pub-xxx.r2.dev`

## Krok 4 — API Tokens

**R2 → Manage R2 API Tokens → Create API Token** — utwórz dwa tokeny:

**Token prod:**
- Token name: `zgadajsie-media-prod`
- Permissions: **Object Read & Write**
- Specify bucket: `zgadajsie-media`

**Token dev:**
- Token name: `zgadajsie-media-dev`
- Permissions: **Object Read & Write**
- Specify bucket: `zgadajsie-media-dev`

Po utworzeniu każdego tokena zapisz **Access Key ID** i **Secret Access Key** — Secret widoczny tylko raz.

**Account ID** — widoczny w prawym panelu głównego dashboardu Cloudflare (ten sam dla obu tokenów).

## Krok 5 — CORS

W każdym buckecie → **Settings → CORS** → wklej poniższą konfigurację:

```json
[
  {
    "AllowedOrigins": [
      "https://zgadajsie.pl",
      "https://www.zgadajsie.pl",
      "https://dev.zgadajsie.pl",
      "http://localhost:4300"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Krok 6 — Env vars w Coolify

**Coolify → zgadajsie-prod → PROD-zgadajsie-backend → Environment Variables:**

```
R2_ACCOUNT_ID=<Cloudflare Account ID>
R2_ACCESS_KEY_ID=<Access Key ID z tokena prod>
R2_SECRET_ACCESS_KEY=<Secret Access Key z tokena prod>
R2_BUCKET_NAME=zgadajsie-media
R2_PUBLIC_URL=https://media.zgadajsie.pl
```

**Coolify → zgadajsie-dev → DEV-zgadajsie-backend → Environment Variables:**

```
R2_ACCOUNT_ID=<Cloudflare Account ID>
R2_ACCESS_KEY_ID=<Access Key ID z tokena dev>
R2_SECRET_ACCESS_KEY=<Secret Access Key z tokena dev>
R2_BUCKET_NAME=zgadajsie-media-dev
R2_PUBLIC_URL=<r2.dev URL z bucketu dev>
```

Po ustawieniu zmiennych — **redeploy** obu backendów.

## Krok 7 — Env vars lokalnie

W `config/env/.env.local`:

```env
R2_ACCOUNT_ID=<Cloudflare Account ID>
R2_ACCESS_KEY_ID=<Access Key ID z tokena dev>
R2_SECRET_ACCESS_KEY=<Secret Access Key z tokena dev>
R2_BUCKET_NAME=zgadajsie-media-dev
R2_PUBLIC_URL=<r2.dev URL z bucketu dev>
```

## Krok 8 — R2 jako S3 Storage w Coolify (backup bazy danych)

**Coolify → Settings → S3 Storages → Add:**

```
Name:       Cloudflare R2
Endpoint:   https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
Bucket:     zgadajsie-backups  (osobny bucket, żeby nie mieszać z mediami)
Region:     auto
Access Key: <Access Key ID>
Secret Key: <Secret Access Key>
```

Kliknij **Validate** — Coolify przetestuje połączenie.

Następnie: **Coolify → zgadajsie-prod → zgadajsie-prod-db → Backups → New Scheduled Backup:**
- Frequency: `0 3 * * *` (codziennie o 3:00)
- S3: wybierz skonfigurowany storage

> Rozważ osobny bucket `zgadajsie-backups` dla backupów DB — oddzielenie od mediów użytkowników ułatwia zarządzanie retencją i uprawnieniami.
