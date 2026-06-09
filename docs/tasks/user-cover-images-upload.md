# Wdrożenie - Galeria własnych cover images organizatora

## Cel

Umożliwienie organizatorom wgrywania własnych grafik (cover image) dla wydarzeń, niezależnie od ogólnodostępnej galerii admina. Każde wydarzenie ma od teraz wymagać cover image. Cała galeria (publiczna + własna) trafia do R2.

## Decyzje architektoniczne (potwierdzone)

| Obszar                                 | Decyzja                                                                                                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage                                | Cloudflare R2 (już skonfigurowane przez `R2StorageService`). Migrujemy też publiczne cover images z FS (`frontend/public/assets/covers/events/`) do R2.                                                                 |
| Model danych                           | Jedna tabela `CoverImage` z dyskryminatorem `ownerUserId` (NULL = publiczna admin, NOT NULL = własna organizatora). CHECK constraint pilnuje spójności pól.                                                             |
| Format / rozmiar                       | Wejście: jpeg, png, webp (max 8 MB). Wyjście zawsze: webp 700×250, jakość 75. Upload przez `app-image-cropper-modal` (preset `cover-image`) - user wybiera obszar do wycięcia.                                          |
| Walidacja minimalnego rozmiaru wejścia | Zdjęcie musi mieć co najmniej 700×250 px (już obsłużone w `image-cropper-modal`).                                                                                                                                       |
| Walidacja bezpieczeństwa               | Multer (rozmiar) + walidacja MIME header + **magic bytes** (`file-type`) + `sharp` jako finalna warstwa. Akceptowane: `image/jpeg`, `image/png`, `image/webp`. Wszystko inne odrzucamy.                                 |
| Galeria własna - zakres                | Uniwersalna (bez powiązania z dyscypliną). Limit 5 plików per użytkownik. Pole `name` (min 3 znaki) wymagane.                                                                                                           |
| Reguły edycji/usuwania (własne)        | Spójne z publicznymi: usunięcie zabronione gdy używany w jakimkolwiek wydarzeniu (z UX-em proponującym podmianę). Replace obrazu i edycja nazwy zawsze dozwolone.                                                       |
| Wymóg cover image dla event            | Tak. `Event.coverImageId` NOT NULL. Migracja: istniejące eventy bez covera dostają **globalny default cover** (niepowiązany z dyscypliną, `ownerUserId = NULL`, `disciplineSlug = NULL`, flagowany `isDefault = true`). |
| Domyślny tryb w event-form (pkt 5)     | Bez auto-zaznaczania konkretnego cover image. Wybór zakładki: "Galeria własna" jeśli user ma >=1 własny cover LUB nie ma publicznych dla danej dyscypliny; w przeciwnym wypadku "Galeria publiczna".                    |
| Auto cover image w seriach             | Bez zmian - dotyczy tylko galerii publicznej per dyscyplina.                                                                                                                                                            |
| UX dodawania w event-form              | Modal upload w zakładce "Galeria własna" (przycisk `+ Dodaj nowe cover image`). Po sukcesie obraz wraca do galerii, nie jest auto-zaznaczany (zgodnie z pkt 5). User decyduje czy go wybierze.                          |
| `MediaController` (pkt 7)              | Ujednolicenie walidacji uploadu (MIME + magic bytes + limit rozmiaru), w ramach tego samego zadania.                                                                                                                    |

---

## 1. Model danych

### 1.1 Schemat Prisma (`backend/prisma/schema.prisma`)

Zmiany w `model CoverImage`:

```prisma
model CoverImage {
  id             String           @id @default(uuid())
  disciplineSlug String?
  filename       String           // legacy / pozostawione dla kompatybilności
  storageKey     String?          // klucz w R2 (zostanie wypełniony po migracji)
  ownerUserId    String?          // NULL = publiczna admin, NOT NULL = własna organizatora
  name           String?          // wymagane dla własnych, opcjonalne dla publicznych
  isDefault      Boolean          @default(false) // globalny default cover
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  discipline     EventDiscipline? @relation(fields: [disciplineSlug], references: [slug])
  owner          User?            @relation("UserCoverImages", fields: [ownerUserId], references: [id], onDelete: Cascade)
  events         Event[]

  @@index([disciplineSlug])
  @@index([ownerUserId])
}
```

W `model User` dodajemy relację:

```prisma
coverImages CoverImage[] @relation("UserCoverImages")
```

W `model Event`:

```prisma
coverImageId String       // <- usunięta opcjonalność
coverImage   CoverImage   @relation(fields: [coverImageId], references: [id])
```

### 1.2 Migracje SQL

Trzy etapy w jednej lub kilku migracjach Prisma (Prisma generuje pliki SQL automatycznie, ale niektóre kroki dopisujemy ręcznie):

1. **Migracja schema-only** (`add_user_cover_images`): dodaje kolumny `ownerUserId`, `name`, `storageKey`, `isDefault`, `updatedAt` w `CoverImage`; uczynienie `disciplineSlug` opcjonalnym; relacja do User.
2. **Migracja danych** (`backfill_cover_images_storage`): skrypt seedujący `storageKey` po wgraniu plików do R2 (patrz sekcja 2).
3. **Migracja wymogu cover image** (`require_event_cover_image`):
   - Tworzy globalny default cover (insert + upload pliku do R2).
   - Backfill: `UPDATE Event SET coverImageId = <defaultId> WHERE coverImageId IS NULL`.
   - `ALTER TABLE Event ALTER COLUMN coverImageId SET NOT NULL`.
4. **Migracja CHECK** (`cover_image_check_constraint`):

```sql
ALTER TABLE "CoverImage"
ADD CONSTRAINT "cover_image_owner_xor_discipline" CHECK (
  (("ownerUserId" IS NULL AND ("disciplineSlug" IS NOT NULL OR "isDefault" = true))
   OR ("ownerUserId" IS NOT NULL AND "name" IS NOT NULL AND length("name") >= 3))
);
```

(Notatka: kolejność tych migracji jest istotna - przy każdej commit testujemy lokalnie i na devie.)

---

## 2. Migracja publicznych cover images z FS do R2

### 2.1 Strategia

- Skrypt jednorazowy: `backend/scripts/migrate-cover-images-to-r2.ts`.
- Czyta `frontend/public/assets/covers/events/<discipline>/*.webp`.
- Dla każdego pliku:
  - upload do R2 pod klucz `cover-images/public/<discipline>/<uuid>.webp`,
  - zapis `storageKey` w istniejącym rekordzie `CoverImage` (matchujemy po `disciplineSlug + filename`),
  - jeśli rekordu nie ma → fallback do `cover-images-sync.util.ts` (uzupełniamy DB).
- Po sukcesie skrypt drukuje raport.
- **Pliki na FS zostają** do czasu pełnej weryfikacji prod - usunięcie z repo w osobnym, ostatnim commicie.

### 2.2 Naming convention w R2

```
cover-images/
  public/<disciplineSlug>/<uuid>.webp     # publiczne (admin)
  user/<userId>/<uuid>.webp               # własne organizatora
  default/<uuid>.webp                     # globalny default cover
```

### 2.3 Zmiana sposobu składania URLi na FE

- Backend zwraca w odpowiedzi `CoverImage` pełny URL w polu `url` (computed: `R2_PUBLIC_URL + '/' + storageKey`) **albo** `storageKey`, a FE składa URL przez helper z `environment.mediaUrl`. Wybieram drugi wariant (mniej danych w odpowiedzi, łatwiej cache'ować, prep pod SSR).
- W `libs/src/lib/utils/` dodaję `cover-image-url.util.ts` z helperem `buildCoverImageUrl(storageKey, mediaBaseUrl)`.
- W `frontend/src/app/shared/types/cover-image.interface.ts` zmieniam `coverImageUrl()` / `getEventCoverUrl()` na bazujące na `storageKey`.

### 2.4 Default cover image

- Plik produkcyjny umieszczamy w R2 pod `cover-images/default/<uuid>.webp` (np. neutralny obraz boiska/hali).
- Plik źródłowy commitujemy do repo w `backend/assets/seed/default-cover.webp` (700×250, webp).
- Skrypt migracji upewnia się, że istnieje dokładnie jeden rekord `CoverImage` z `isDefault = true`.

---

## 3. Backend

### 3.1 Rozszerzenie `CoverImagesModule`

#### `CoverImagesService` - zmiany

- Wszystkie metody pracują na R2 (`R2StorageService.upload/delete`), zamiast FS.
- Nowe metody:
  - `findMy(userId)` - galeria własna danego usera.
  - `createUserCover(userId, file, name)` - upload, walidacja, count limit 5, zapis w R2 i DB.
  - `replaceUserCover(userId, id, file)` - autoryzacja (musi być `ownerUserId === userId`).
  - `renameUserCover(userId, id, name)` - zmiana `name`, walidacja min 3 znaki.
  - `removeUserCover(userId, id)` - autoryzacja + sprawdzenie czy nieużywany (jak publiczne).
- Wspólny prywatny helper `processImage(buffer)` zostaje. Plus nowy `processAndUpload(file, key)`.

#### `CoverImagesController` - rozszerzenie

| Endpoint                         | Method | Auth              | Opis                                             |
| -------------------------------- | ------ | ----------------- | ------------------------------------------------ |
| `GET /cover-images`              | GET    | JwtAuth, IsActive | publiczne (filtr `?disciplineSlug=`)             |
| `GET /cover-images/my`           | GET    | JwtAuth, IsActive | **NOWE** - galeria własna zalogowanego usera     |
| `POST /cover-images/my`          | POST   | JwtAuth, IsActive | **NOWE** - upload własny (file + name)           |
| `PATCH /cover-images/my/:id`     | PATCH  | JwtAuth, IsActive | **NOWE** - rename                                |
| `PUT /cover-images/my/:id/image` | PUT    | JwtAuth, IsActive | **NOWE** - replace                               |
| `DELETE /cover-images/my/:id`    | DELETE | JwtAuth, IsActive | **NOWE** - delete (jeśli nieużywany)             |
| `GET /cover-images/suggest`      | GET    | JwtAuth, IsActive | bez zmian                                        |
| `POST /cover-images`             | POST   | Admin             | bez zmian (tylko storage → R2)                   |
| `POST /cover-images/sync`        | POST   | Admin             | zostaje na potrzeby migracji; potem do usunięcia |
| `PUT /cover-images/:id/image`    | PUT    | Admin             | bez zmian funkcjonalnie (R2)                     |
| `DELETE /cover-images/:id`       | DELETE | Admin             | bez zmian funkcjonalnie                          |

#### `MediaModule` musi być importowany przez `CoverImagesModule`

`CoverImagesModule` dostaje `R2StorageService` z `MediaModule` (`exports` już jest gotowy).

### 3.2 Walidacja uploadu

Nowa wspólna utility: `backend/src/common/utils/image-upload.util.ts`:

```ts
export const COVER_IMAGE_ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const COVER_IMAGE_MAX_INPUT_BYTES = 8 * 1024 * 1024;

export async function validateImageBuffer(buffer: Buffer): Promise<void> {
  const type = await fileTypeFromBuffer(buffer); // package: file-type
  if (!type || !COVER_IMAGE_ACCEPTED_MIMES.includes(type.mime as any)) {
    throw new BadRequestException('Niedozwolony format pliku');
  }
}
```

- W controllerach `ParseFilePipe`: `MaxFileSizeValidator(8MB)` + `FileTypeValidator(/^image\/(jpeg|png|webp)$/)`.
- W service przed `processImage()`: `await validateImageBuffer(file.buffer)` (magic bytes).
- Sharp w `processImage()` zostaje - rzuca błąd na uszkodzonych plikach.

Paczka do dodania: `file-type@^16.5.4` (wersja 17+ jest ESM-only, kolizja z CJS NestJS).

### 3.3 DTO

- `CreateEventDto.coverImageId` → `@IsString()` (bez `@IsOptional()`).
- `UpdateEventDto.coverImageId` → analogicznie, ale w PATCH pozostaje opcjonalne (zmiana nie zawsze obejmuje cover).
- `CreateUserCoverImageDto`:

```ts
export class CreateUserCoverImageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;
}
```

- `RenameUserCoverImageDto` - to samo, samo `name`.

### 3.4 `events.service.ts`

- `resolveCoverImageId()` - usunąć fallback do randomowego coveru z dyscypliny. Jeśli dto.coverImageId puste → BadRequest (wcześniej DTO walidator i tak to złapie).
- W `findOne`/`findMany` dodaj wybór `name` i `storageKey` przy `include: { coverImage: true }`.

### 3.5 `event-series` / generator

- `EventSeriesGenerator` przy auto-doborze: dodać filtr `where: { ownerUserId: null }` (tylko publiczne biorą udział w auto).
- DTO serii: `coverImageId` - jeśli serię oparto na własnym coverze, `autoCoverImage` musi być `false` (walidacja).

### 3.6 `MediaController` (pkt 7)

- Dodać `FileTypeValidator` i walidację magic bytes (ten sam util `validateImageBuffer`, ale rozszerzony o `image/gif` jeśli `MediaFile` ma akceptować GIF-y - sprawdzić use case).
- Sprawdzić czy `MediaService` używa rozszerzenia z `originalName` do budowania klucza - to jest podatność (user może wgrać `.exe.jpg`). Zmienić na rozszerzenie z `file-type`.

---

## 4. Frontend

### 4.1 `CoverImageService`

Rozszerzenie o:

```ts
getMy(): Observable<CoverImage[]>
createMy(file: File, name: string): Observable<CoverImage>
renameMy(id: string, name: string): Observable<CoverImage>
replaceMyImage(id: string, file: File): Observable<CoverImage>
removeMy(id: string): Observable<void>
```

Modele:

```ts
interface CoverImage {
  id: string;
  disciplineSlug?: string;
  filename?: string; // legacy
  storageKey?: string;
  name?: string;
  ownerUserId?: string | null;
  isDefault?: boolean;
  createdAt: string;
}
```

### 4.2 Strona "Moja galeria cover images"

Lokalizacja: `frontend/src/app/features/me/pages/my-cover-images/`.

- Route: `/me/cover-images` (osłonięte JwtAuthGuard).
- Layout: lista 5 slotów (zajęte / puste), przycisk "Dodaj cover image" gdy < 5.
- Dla każdego cover image:
  - miniatura (700×250 proporcje),
  - nazwa (inline edit),
  - data dodania,
  - przyciski: **Podmień grafikę**, **Usuń**.
- Modal upload: drag&drop + file picker → walidacja MIME/rozmiar na FE → `image-cropper-modal` (preset `cover-image`) → pole "Nazwa" (min 3 znaki) → upload.
- Modal podmiany: identyczny, ale bez pola nazwa (zostaje obecna).
- Modal "Usunięcie zablokowane" (gdy używany w eventach):
  - tytuł: "Nie można usunąć - X wydarzeń używa tej grafiki"
  - opis: "Możesz natomiast podmienić ją na inną grafikę. Wszystkie wydarzenia automatycznie zaktualizują swoją grafikę."
  - CTA: **Podmień grafikę** (otwiera modal podmiany) + Anuluj.

### 4.3 `event-form.component.ts` - integracja

- Sekcja "Grafika wydarzenia" zostaje, ale ma teraz dwie zakładki: **Galeria publiczna** | **Galeria własna**.
- Logika domyślnego tabu (pkt 5):

```ts
const defaultTab = myCovers.length > 0 || publicCovers.length === 0 ? 'my' : 'public';
```

- W zakładce "Galeria własna":
  - lista własnych covers + przycisk `+ Dodaj nowe cover image` (jeśli < 5),
  - przycisk otwiera ten sam modal upload co z `/me/cover-images`,
  - po uploadzie lista się odświeża, nowy cover **nie jest** auto-zaznaczany.
- Usunięcie auto-zaznaczania losowego cover po wyborze dyscypliny (`event-form.component.ts:1195-1197`).
- Auto cover image (toggle) przeniesiony tylko do zakładki "Galeria publiczna" - dla "Własnej" niewidoczny.
- Walidacja submita: jeśli `selectedCoverImageId() === null` → komunikat "Wybierz grafikę wydarzenia" (form invalid).
- Auto cover image (seria) - przy zaznaczeniu wymusza tab "Galeria publiczna" i blokuje wybór z własnej.

### 4.4 `admin-cover-images.component.ts`

- Zmiana sposobu wyświetlania URLi (`storageKey` zamiast lokalnego path).
- Sekcja "Synchronizator z katalogu" - po migracji do R2 staje się bezużyteczna. Ukryć (feature flag / hidden) lub usunąć.
- Lista grupowana per dyscyplina - bez zmian funkcjonalnie.
- Komunikat "Nie można usunąć" - wzbogacić o ten sam pattern co dla własnych (CTA podmiany).

### 4.5 Helpery URL

- `coverImageUrl(storageKey)` w `cover-image.interface.ts` - zwraca `${environment.mediaUrl}/${storageKey}` (lub `R2_PUBLIC_URL` przekazany z BE jako `environment.mediaUrl`).
- `getEventCoverUrl(event)` - aktualizacja, fallback do `default` zniknie po wprowadzeniu wymogu.
- `frontend/src/environments/environment*.ts` - dodać pole `mediaUrl: string` zsynchronizowane z `R2_PUBLIC_URL`.

---

## 5. Konfiguracja / infrastruktura

- `config/env/.env.example`, `.env.dev`, `.env.prod`, `.env.local` - sprawdzić czy `R2_*` jest wszędzie wypełnione.
- Limit rozmiaru body w NestJS: sprawdzić `main.ts` (express body limit). Multer ma własny limit, ale wgrywanie 8 MB plików wymaga `bodyParser.json/raw` z odpowiednim limitem.
- CORS R2 (`docs/tasks/cloudflare-r2-setup.md`) - już skonfigurowane dla GET. Bez zmian.
- Wgranie default cover do bucketu dev i prod (manualnie przez R2 dashboard albo skryptem na pierwszym deployu).

---

## 6. Testy

### Backend (Jest)

- `cover-images.service.spec.ts`:
  - upload publiczny (admin) → trafia do R2 z prefixem `public/<discipline>/`,
  - upload własny (user) → trafia do R2 z prefixem `user/<userId>/`, limit 5 egzekwowany,
  - replace - upload nowego, delete starego,
  - delete zablokowane gdy `events.count > 0`,
  - autoryzacja: user nie może modyfikować cover image innego usera ani publicznego,
  - rename - min 3 znaki, max 100.
- `image-upload.util.spec.ts`: walidacja magic bytes (fake `Buffer` z innym header niż MIME → throw).
- `events.service.spec.ts`: tworzenie eventu bez coverImageId → BadRequest; resolve nie próbuje już losować z dyscypliny.

### Frontend (Jest)

- `cover-image.service.spec.ts` - nowe metody (mocki HTTP).
- `my-cover-images.component.spec.ts`:
  - render listy slotów,
  - akcja delete na nieużywanym → wywołanie remove,
  - akcja delete na używanym → modal z propozycją replace.
- `event-form.component.spec.ts`:
  - default tab wyboru wg pkt 5,
  - submit bez coverImageId → form invalid.

### E2E (Playwright)

- Happy path: organizator dodaje cover, tworzy event z własnym coverem, edytuje event, podmienia obraz, usuwa nieużywany.
- Negatywny: próba uploadu pliku < 700×250, .gif, .pdf, .svg → odrzucone z czytelnym komunikatem.

---

## 7. Kolejność deployu (krok po kroku)

1. PR #1 (backend infra): migracja schema (kolumny nullowalne) + skrypt migracji FS → R2 + utility walidacji + default cover seed. **Eventy nadal mogą mieć `coverImageId = NULL`.**
2. Uruchomienie skryptu migracji na devie → weryfikacja → na prod.
3. PR #2 (backend API + frontend zarządzanie galerią własną): endpointy `/cover-images/my`, strona `/me/cover-images`, walidacja uploadu, ujednolicenie `MediaController`.
4. PR #3 (event-form + wymóg cover): integracja zakładek w event-form, walidacja DTO `coverImageId` jako required, data migration backfill default cover, `ALTER TABLE Event ... NOT NULL`, CHECK constraint.
5. PR #4 (cleanup): usunięcie `cover-images-sync.util.ts`, usunięcie endpointu `/cover-images/sync`, usunięcie `frontend/public/assets/covers/events/` z repo (po potwierdzeniu R2 na prodzie).

Każdy PR niezależnie deploybowalny i odwracalny.

---

## Checklisty per etap

> Stan zweryfikowany na branchu `migrate-cover-images-to-r2` (2026-06-09).
> `[x]` = zrobione, `[ ]` = do zrobienia, `[!]` = zrobione częściowo / wymaga uwagi.

### Etap 0 - przygotowanie

- [!] Sprawdzić że R2 prod i dev są skonfigurowane (env vars + bucket public access). — Kod gotowy; buckety, tokeny i env vars w Coolify wymagają manualnej konfiguracji wg `docs/tasks/cloudflare-r2-setup.md`. Lokalnie `config/env/.env.local` ma placeholdery — do wypełnienia.
- [x] Default cover (700×250 webp). `backend/assets/seed/default-cover.webp` istnieje.
- [x] Zainstalowany `file-type@16.5.4` w workspace.
- [ ] Przeczytać style guides przed kolejną sesją kodowania.

### Etap 1 - model danych i migracja storage (PR #1) — **ZREALIZOWANY W KODZIE**

- [x] Kolumny `ownerUserId`, `name`, `storageKey`, `isDefault`, `updatedAt` w `CoverImage` (skonsolidowane w init migration).
- [x] `disciplineSlug` nullowalne w schemacie.
- [x] Relacja `User.coverImages` (`"UserCoverImages"`).
- [x] Skrypt `backend/scripts/migrate-cover-images-to-r2.ts` istnieje.
- [x] Skrypt `backend/scripts/seed-default-cover.ts` istnieje.
- [x] `backend/src/common/utils/image-upload.util.ts` (magic bytes via `file-type`).
- [x] `CoverImagesService.create/replace` — upload przez `R2StorageService`.
- [x] `CoverImagesService.remove` — delete z R2.
- [x] `CoverImagesModule` importuje `MediaModule`.
- [x] FE: `buildCoverImageUrl(cover)` w `cover-image.utils.ts` — używa `storageKey` + `environment.mediaUrl`.
- [x] FE: `CoverImage` interface rozszerzony o `storageKey`, `name`, `ownerUserId`, `isDefault`.
- [x] FE: `environment.production.ts` ma `mediaUrl: 'https://media.zgadajsie.pl'`.
- [x] FE: `admin-cover-images.component.ts` używa `buildCoverImageUrl`.
- [!] **BLOKUJĄCE (manual)**: `environment.local.ts` ma `mediaUrl: ''` — uzupełnić r2.dev URL po skonfigurowaniu bucketu dev w Cloudflare.
- [ ] **BLOKUJĄCE (manual)**: Uruchomić `seed-default-cover.ts` na devie i prodzie.
- [ ] **BLOKUJĄCE (manual)**: Uruchomić `migrate-cover-images-to-r2.ts` na devie → weryfikacja URLi → na prodzie.
- [x] Testy backend: `cover-images.service.spec.ts` (upload R2, limit 5, autoryzacja, replace, rename, delete).

### Etap 2 - galeria własna (PR #2) — **PRAWIE GOTOWY, 2 braki**

- [x] DTO: `CreateUserCoverImageDto`, `RenameUserCoverImageDto`.
- [x] `CoverImagesService`: `findMy`, `createUserCover`, `renameUserCover`, `replaceUserCover`, `removeUserCover` + autoryzacja.
- [x] `CoverImagesController`: endpointy `GET/POST /cover-images/my`, `PATCH /my/:id`, `PUT /my/:id/image`, `DELETE /my/:id`.
- [x] Limit 5 egzekwowany w service.
- [x] Walidacja: `ParseFilePipe` (size 8MB + MIME) + `validateImageBuffer` (magic bytes) + `processImage` (sharp) — w kontrolerze i serwisie.
- [x] FE: `CoverImageService` — `getMy`, `createMy`, `renameMy`, `replaceMyImage`, `removeMy`.
- [x] FE: route `profile/organizer/cover-images` + `MyCoverImagesComponent`.
- [x] FE: modal upload (file picker → cropper preset `cover-image` → pole nazwa min 3 znaki → upload).
- [x] FE: inline edit nazwy w karcie cover image (FormsModule + `renameMy`).
- [x] FE: modal "Nie można usunąć" z CTA "Podmień grafikę" (ConfirmModalComponent, sprawdzenie `getUsage`).
- [x] FE: link do galerii własnej w profilu organizatora (`profile.component.html`).
- [x] **BUG FIXED**: `onReplace()` w `my-cover-images.component.ts` — zaimplementowane. Reużywa modala croppera (signal `replaceTargetId`), po przycięciu od razu woła `replaceMyImage()` (bez kroku z nazwą).
- [x] **BUG FIXED**: `navigation.service.ts` — naprawiona ścieżka `/profile/cover-images` → `/profile/organizer/cover-images`.
- [ ] FE: `/dev/design-system` — nie zaktualizowany o nowy komponent.
- [x] `MediaController` — `FileTypeValidator` dodany; `MediaService` używa `file-type` do rozszerzenia pliku (nie `originalName`).
- [x] Testy BE (limit 5, autoryzacja, replace, rename, delete — wszystkie scenariusze pokryte w spec).
- [ ] Testy FE: `cover-image.service.spec.ts` — brakuje testów nowych metod `getMy/createMy/renameMy/replaceMyImage/removeMy`.
- [ ] Testy FE: `my-cover-images.component.spec.ts` — brak pliku.

### Etap 3 - integracja z event-form i wymóg covera (PR #3) — **NIE ROZPOCZĘTY**

- [x] `CreateEventDto.coverImageId` — `@IsOptional()` usunięte, pole wymagane. Test DTO zaktualizowany.
- [x] `events.service` — usunięty fallback `resolveCoverImageId` i zależność od `CoverImagesService`. `create()` bezpośrednio łączy coverImage przez `dto.coverImageId`.
- [ ] **BLOKUJĄCE (manual)**: `backend/scripts/backfill-event-cover-images.ts` gotowy; uruchomić na devie po `seed-default-cover.ts`.
- [x] Migracja Prisma `20260609000000_require_event_cover_image` przygotowana (NOT NULL + CHECK constraint). **NIE stosować przed backfillem** — patrz komentarz w pliku SQL.
- [x] `event-series-generator` — `findSmartCoverForOrganizer` ma już `ownerUserId: null` (filtruje tylko publiczne).
- [x] FE: event-form — zakładki "Galeria publiczna" / "Galeria własna" z logiką domyślnego tabu (pkt 5).
- [x] FE: brak auto-zaznaczania losowego covera przy zmianie dyscypliny.
- [x] **BUG FIXED**: przycisk `+ Dodaj nowe cover image` w event-form (zakładka "Galeria własna") — zastąpiony inline modal upload (cropper + pole nazwy). Po sukcesie odświeża `myCovers`, bez auto-select.
- [x] FE: walidacja submita — cover image wymagany (snackbar "Wybierz grafikę wydarzenia").
- [x] FE: auto cover image (toggle) widoczny tylko w tabie "Galeria publiczna".
- [x] FE: blokada serii z własnym coverem — `toggleAutoCoverImage(true)` wymusza `coverTab = 'public'`; zakładka "Galeria własna" ma `[disabled]="autoCoverImage()"` z `opacity-40`.
- [x] **BUG FIXED**: `event-card.component.ts` — zmieniony na `buildCoverImageUrl` z `cover-image.utils.ts` (R2 + fallback do FS dla starych rekordów bez `storageKey`).
- [ ] Testy BE: `events.service.spec.ts` — tworzenie bez `coverImageId` → `BadRequest`.
- [ ] Testy FE: `event-form.component.spec.ts` — domyślne tabu, walidacja submita.

### Etap 4 - cleanup (PR #4) — **CZEKA NA ETAP 3**

- [ ] Weryfikacja R2 na prodzie — wszystkie cover images dostępne pod `media.zgadajsie.pl`.
- [ ] Usunięcie `frontend/public/assets/covers/events/` z repo.
- [ ] Sprawdzić czy endpoint `POST /cover-images/sync` i `cover-images-sync.util.ts` jeszcze istnieją — jeśli tak, usunąć.
- [ ] Sprawdzić czy sekcja "Synchronizator z katalogu" w `admin-cover-images.component` istnieje — jeśli tak, usunąć.
- [ ] Aktualizacja `docs/tech-stack.md` (Cloudflare R2 / S3 SDK).
- [ ] Aktualizacja `docs/styleguide-backend.md` / `docs/styleguide-frontend.md` o wzorzec `image-upload.util`.
- [ ] Test E2E (Playwright): happy path organizatora + negatywne (za mały plik, gif, pdf).

---

## Pytania otwarte (do potwierdzenia w trakcie wdrożenia)

1. Domyślny cover image - jaki obraz? Sugeruję neutralne zdjęcie boiska/hali wspólne dla wszystkich dyscyplin. Do wskazania przez właściciela produktu przed Etapem 1.
2. Czy w `/me/cover-images` chcemy dodatkowo licznik użycia per cover (ile eventów go używa)? Nie jest wymagany, ale przydatny UX. Sugestia: tak, ujawnić.
3. Czy chcemy publiczny CDN cache-busting po replace (np. `?v=updatedAt`)? Sugestia: tak, dorzucić query param `?v={updatedAt}` w helperze URL, żeby R2 cache nie pokazywał starej grafiki.

---

## Notatki bezpieczeństwa

- Wszystkie endpointy `/cover-images/my*` wymagają autoryzacji właściciela (sprawdzenie `ownerUserId === user.id` na każdym mutującym evencie).
- Magic bytes walidacja chroni przed wgraniem skryptu z fake MIME.
- Sharp jest finalną warstwą - uszkodzone/spreparowane obrazy zostają odrzucone.
- Limit 5 chroni przed nadużyciem disk space.
- Pliki w R2 są publiczne (URL), ale kluczy `uuid` nie da się zgadnąć - bez stałego rozkładu URL trudno enumerować.
- Soft-delete nie jest potrzebny - kasujemy plik z R2 razem z rekordem z DB.
