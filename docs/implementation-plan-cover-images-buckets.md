# Plan wdrożeniowy: rozdział bucketów R2 (prod / dev / public)

> Status: do realizacji. Dotyczy cover images, ale wprowadza generalną zasadę
> separacji storage per środowisko + wspólny bucket publiczny dla zasobów
> kuratorowanych przez admina.

## 1. Cel

- Twarda izolacja danych **prod ↔ non-prod** na poziomie bucketa (granica zaufania,
  scoped credentials, ograniczony blast radius) — istotne, bo w przyszłości dojdą
  inne rodzaje plików.
- Jedna, **identyczna galeria publiczna** (covery dyscyplin zarządzane wyłącznie
  przez admina) współdzielona przez wszystkie środowiska, bez ręcznego syncu.
- Domyślny cover pozostaje lokalnym assetem frontu (`assets/default-cover.webp`),
  poza R2 (zrobione wcześniej).

## 1a. Decyzje ustalone

- **Osobne buckety per env + wspólny public**: `zgadajsie-media-prod`, `zgadajsie-media-dev`,
  `zgadajsie-media-public` (izolacja prod/non-prod — w przyszłości dojdą inne typy plików).
- **Zapis do `public` tylko z produkcji** — egzekwowane dwutorowo: scope tokenów R2
  (dev bez write do `public`) + flaga `PUBLIC_COVERS_WRITABLE` (czytelny 403) + ukrycie akcji w UI.
- **Tokeny R2 = Object Read & Write** (nie Admin), scope per-bucket:
  prod → `*-prod` + `*-public`; dev → `*-dev` (tylko).
- **CORS per bucket**: prod → origins prod; dev → dev + localhost; public → wszystkie 4. GET/HEAD.
- **Custom domain** (zamiast `pub-*.r2.dev`) — **odłożone na później**; nie koliduje (zmiana wartości env).
- **Ścieżka bez `public/`**: skoro bucket `zgadajsie-media-public` sam znaczy „publiczny", publiczne
  covery mają klucz `cover-images/<discipline>/<uuid>.webp` (bez segmentu `public/`).
  Routing na froncie: `isPublic = !storageKey.startsWith('cover-images/user/')` (prywatne userów →
  per-env, reszta → public).

## 2. Stan obecny (z kodu)

- **Frontend** buduje URL okładki wyłącznie przez `buildCoverImageUrl()`
  (`frontend/src/app/shared/utils/cover-image.utils.ts`) z `environment.mediaUrl`.
- `mediaUrl` jest per-env:
  - `environment.local.ts` → `pub-a402…r2.dev` (bucket **dev**, używany przez local i dev)
  - `environment.production.ts` → `pub-036e…r2.dev` (bucket **prod** `zgadajsie-media`)
- **Backend** zapisuje przez `R2StorageService` (single-bucket: `R2_BUCKET_NAME`,
  `R2_PUBLIC_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
- Prefiksy storageKey:
  - publiczne covery dyscyplin: `cover-images/public/<discipline>/<uuid>.webp`
  - prywatne covery userów: `cover-images/user/<userId>/<uuid>.webp`
- `seed-common.ts` seeduje publiczne covery z **identycznymi** storageKey we wszystkich
  envach, ale obiekty fizycznie żyją w buckecie **dev** (komentarz w kodzie) → prod
  bywa niekompletny (źródło problemów z wyświetlaniem na prodzie).

## 3. Docelowa architektura

Trzy buckety, rozdzielone **po roli/środowisku, nie po prefiksie**:

| Bucket                   | Zawartość                                              | Zapis          | Odczyt                    |
| ------------------------ | ------------------------------------------------------ | -------------- | ------------------------- |
| `zgadajsie-media-prod`   | dane prod (user covers, media eventów, przyszłe pliki) | backend prod   | publiczny (r2.dev)        |
| `zgadajsie-media-dev`    | dane local + dev                                       | backend dev    | publiczny (r2.dev)        |
| `zgadajsie-media-public` | covery publiczne dyscyplin (admin)                     | **tylko prod** | publiczny, wszystkie envy |

> Uwaga: `zgadajsie-media` → `zgadajsie-media-prod` to **nie** rename (R2 nie wspiera
> renamingu) — to nowy bucket + kopia + repoint. Wiąże się ze zmianą prodowego
> `pub-*.r2.dev` (nowy bucket = nowy public host, chyba że custom domain). Patrz §8.

storageKey **nie zmieniają się**:

- `cover-images/public/...` → rozwiązywane względem `publicMediaUrl` (bucket public)
- wszystko inne (`cover-images/user/...`, media eventów) → względem `mediaUrl` (bucket env)

## 4. Zmiany w kodzie — Frontend

### 4.1. Env (`frontend/src/environments/`)

- `base.ts`: dodać `publicMediaUrl: '' as string`.
- `environment.local.ts`:
  - `mediaUrl`: `https://<pub-dev>.r2.dev` (bez zmian — bucket dev)
  - `publicMediaUrl`: `https://<pub-public>.r2.dev` (bucket public)
- `environment.production.ts`:
  - `mediaUrl`: `https://<pub-prod>.r2.dev` (nowy bucket prod, jeśli rename)
  - `publicMediaUrl`: `https://<pub-public>.r2.dev` (TEN SAM co local)

### 4.2. `buildCoverImageUrl` — routing po prefiksie

```ts
const USER_STORAGE_PREFIX = 'cover-images/user/';

export function buildCoverImageUrl(cover: CoverImage): string {
  if (cover.storageKey) {
    // prywatne covery userów → bucket per-env; publiczne (galeria dyscyplin) → bucket public
    const isPublic = !cover.storageKey.startsWith(USER_STORAGE_PREFIX);
    const baseUrl = (isPublic ? environment.publicMediaUrl : environment.mediaUrl) || '';
    const cacheBuster = cover.updatedAt ? `?v=${new Date(cover.updatedAt).getTime()}` : '';
    return `${baseUrl}/${cover.storageKey}${cacheBuster}`;
  }
  // Brak storageKey = default/legacy → lokalny bundlowany default.
  return DEFAULT_COVER_IMAGE_URL;
}
```

### 4.3. Admin UI — write tylko z proda

- Galeria publiczna jest edytowalna (`Dodaj`/`Zamień`/`Usuń`) **tylko na prodzie**.
- Na non-prod: ukryć/zablokować akcje zapisu (np. za flagą `environment.publicCoversWritable`),
  żeby admin dev nie próbował pisać do bucketa public (i tak dostanie 403 — patrz §5.3).

## 5. Zmiany w kodzie — Backend

### 5.1. Konfiguracja (env)

Nowe zmienne (per deployment):

| Zmienna                  | prod                          | dev                           |
| ------------------------ | ----------------------------- | ----------------------------- |
| `R2_BUCKET_NAME`         | `zgadajsie-media-prod`        | `zgadajsie-media-dev`         |
| `R2_PUBLIC_URL`          | `https://<pub-prod>.r2.dev`   | `https://<pub-dev>.r2.dev`    |
| `R2_PUBLIC_BUCKET_NAME`  | `zgadajsie-media-public`      | `zgadajsie-media-public`      |
| `R2_PUBLIC_BUCKET_URL`   | `https://<pub-public>.r2.dev` | `https://<pub-public>.r2.dev` |
| `PUBLIC_COVERS_WRITABLE` | `true`                        | `false`                       |

Tokeny R2:

- token **prod**: RW na `zgadajsie-media-prod` **i** RW na `zgadajsie-media-public`
- token **dev**: RW na `zgadajsie-media-dev` + **RO** (lub brak) na `zgadajsie-media-public`

### 5.2. `R2StorageService` — drugi target

```ts
type StorageScope = 'env' | 'public';

// w konstruktorze: wczytaj publicBucket + publicUrlPublic z configu
upload(key, buffer, contentType, scope: StorageScope = 'env'): Promise<string>
delete(key, scope: StorageScope = 'env'): Promise<void>
getPublicUrl(key, scope: StorageScope = 'env'): string
// scope === 'public' → Bucket = publicBucket, base = publicUrlPublic
```

Ten sam `S3Client` (jedno konto R2) obsłuży oba buckety, o ile token ma do nich dostęp.

### 5.3. `CoverImagesService` — routing scope

- `create()` (publiczny admin) → `upload(..., 'public')`, delete starego `'public'`
- `replace()` (publiczny admin) → `'public'`
- `remove()` (publiczny admin) → `delete(..., 'public')`
- `createUserCover()` / `replaceUserCover()` / `removeUserCover()` → `'env'` (bez zmian)
- przyszłe media eventów → `'env'`
- Bramka zapisu: jeśli `PUBLIC_COVERS_WRITABLE !== true` → `create/replace/remove` publicznych
  rzucają `ForbiddenException` (autorytatywnie po stronie backendu, niezależnie od UI).

## 6. Seed

- storageKey publicznych pozostają `cover-images/public/...` → **bez zmian** w seedach.
- Warunek poprawnego działania: bucket `zgadajsie-media-public` musi zawierać te obiekty
  (patrz migracja §7).
- Default cover: już `storageKey: null` (lokalny) — bez zmian.

## 7. Migracja obiektów R2 (ops)

```bash
EP=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# 1. Utwórz buckety
#    - zgadajsie-media-public  (+ public read / r2.dev)
#    - zgadajsie-media-prod    (jeśli robimy rename; + public read)
#    (zgadajsie-media-dev już istnieje)

# 2. Populacja bucketa public ze ŹRÓDŁA AUTORYTATYWNEGO (dev — tam komplet żyje)
aws s3 sync s3://zgadajsie-media-dev/cover-images/public/ \
            s3://zgadajsie-media-public/cover-images/public/ --endpoint-url $EP

# 3. (Opcjonalnie, rename prod) skopiuj dane prod do nowego bucketa
aws s3 sync s3://zgadajsie-media/ s3://zgadajsie-media-prod/ --endpoint-url $EP
```

## 8. Rename `zgadajsie-media` → `zgadajsie-media-prod` (opcjonalne, osobny krok)

- R2 nie renamuje bucketów → nowy bucket + `aws s3 sync` + repoint env.
- **Zmienia się prodowy `pub-*.r2.dev`** (nowy bucket = nowy host). Konsekwencje:
  - zaktualizować `environment.production.ts:mediaUrl` na nowy host,
  - storageKey są względne (`cover-images/...`) → tylko baza URL się zmienia, rekordy DB bez zmian.
- Jeśli nie chcesz ruszać hosta — możesz **zostawić `zgadajsie-media`** jako prodowy i pominąć rename
  (spójność nazw kontra koszt migracji + zmiana publicznego URL). Decyzja do potwierdzenia.

## 9. Kolejność wdrożenia (zero broken images)

1. Utwórz + zapopuluj `zgadajsie-media-public` (§7 kroki 1–2).
2. Ustaw tokeny R2 (prod: +public RW, dev: +public RO).
3. Deploy **frontend** z `publicMediaUrl` + routingiem — publiczne covery zaczynają lecieć
   z bucketa public (już zapopulowanego). Reszta bez zmian.
4. Deploy **backend** z `R2_PUBLIC_BUCKET_*` + scope routing + `PUBLIC_COVERS_WRITABLE`.
5. (Opcjonalnie) rename prod bucket (§8).
6. Po weryfikacji — **cleanup**: usuń `cover-images/public/*` z bucketów per-env
   (prod/dev), zostają tam tylko `cover-images/user/*` i media eventów.

## 10. Weryfikacja

- [ ] Prod (incognito): publiczne covery ładują się z `<pub-public>.r2.dev/cover-images/public/...`.
- [ ] Dev (incognito): te same publiczne covery z tego samego hosta public.
- [ ] User covery: prod z `<pub-prod>`, dev z `<pub-dev>` (izolacja).
- [ ] Admin `Dodaj/Zamień/Usuń` publiczny cover: działa na prodzie, zablokowane (403/UI) na dev.
- [ ] Default cover dalej z lokalnego `assets/default-cover.webp`.
- [ ] Brak 404 w Network dla coverów; brak prywatnych w galerii admina (fix `findAll` już jest).

## 11. Rollback

- Przed krokiem cleanup (§9.6) publiczne obiekty są zduplikowane (per-env + public),
  więc rollback jest bezpieczny: revert env (`publicMediaUrl` → `''`) + revert routingu
  w `buildCoverImageUrl` → wszystko wraca do odczytu z bucketów per-env.
- Po cleanup: rollback wymaga ponownego skopiowania `cover-images/public/*` z powrotem
  do bucketów per-env.

---

## Checklista

### Buckety / R2 (ops)

- [ ] Utworzony `zgadajsie-media-public` + public read (r2.dev)
- [ ] `aws s3 sync` public covers: dev → public (komplet)
- [ ] Token prod: RW na `*-prod` + RW na `*-public`
- [ ] Token dev: RW na `*-dev` + RO na `*-public`
- [ ] (Opc.) Utworzony `zgadajsie-media-prod` + sync danych prod

### Frontend (kod) — ZROBIONE

- [x] `base.ts`: `publicMediaUrl` (jeden wspólny host, bez override w environment.\*)
- [x] `environment.local.ts` / `environment.production.ts`: `mediaUrl` per-env wypełnione
- [x] `buildCoverImageUrl`: routing `!startsWith('cover-images/user/')` → public bucket
- [x] Admin UI: akcje zapisu publicznych ukryte poza prodem (`environment.production`)
- [x] Testy `cover-image.utils.spec` — 4/4

### Backend (kod) — ZROBIONE

- [x] `R2StorageService`: scope `env|public` + `Cache-Control: immutable`
- [x] Config: `R2_PUBLIC_BUCKET_NAME`, `R2_PUBLIC_BUCKET_URL`, `PUBLIC_COVERS_WRITABLE`
- [x] `CoverImagesService.create/replace/remove` (publiczne) → scope `public`, klucz `cover-images/<discipline>/`
- [x] Bramka `PUBLIC_COVERS_WRITABLE` (403 poza prodem)
- [x] Seed/`.env.example`/skrypty zaktualizowane (klucze bez `public/`)
- [x] Testy — 27/27

### Migracje DB (prod + dev) — PRZED deployem

- [ ] Default cover → lokalny: `UPDATE "CoverImage" SET "storageKey"=NULL WHERE "isDefault"=true;`
- [ ] Istniejące rekordy publiczne (strip `public/`):
      `UPDATE "CoverImage" SET "storageKey"=replace("storageKey",'cover-images/public/','cover-images/') WHERE "storageKey" LIKE 'cover-images/public/%';`

### Env / deploy

- [ ] Zmienne R2 w Coolify: prod (`*-prod` + `*-public`, `PUBLIC_COVERS_WRITABLE=true`) / dev (`*-dev`)
- [ ] **KRYTYCZNE**: dane proda skopiowane ze starego bucketa do `zgadajsie-media-prod`
      (`aws s3 sync s3://zgadajsie-media/ s3://zgadajsie-media-prod/`) — inaczej istniejące
      user-covery/media eventów znikną (prod `mediaUrl` wskazuje już nowy bucket)
- [ ] `zgadajsie-media-public` zapełniony plikami `cover-images/<discipline>/<uuid>` (UUID-y zgodne z seedem)
- [ ] Skasowany zbędny token „public-only"
- [ ] Deploy frontend → backend (kolejność §9)
- [ ] Weryfikacja §10
- [ ] Cleanup starego bucketa / leftoverów (po weryfikacji)

### Domknięcie

- [ ] (Opc.) rename/usuń stary bucket `zgadajsie-media` po potwierdzeniu, że `-prod` ma komplet
