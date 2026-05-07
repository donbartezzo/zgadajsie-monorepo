# Design Tokens - System Kolorów

> **Single Source of Truth (hex):** `libs/src/lib/constants/color-palette.json` > **Single Source of Truth (semantic→foundation mapping):** `libs/src/lib/constants/semantic-color-mapping.json` > **CSS vars (auto-generated):** `frontend/src/styles/_tokens.scss` (regenerowany przez `pnpm tokens:generate`) > **Tailwind mapping:** `frontend/tailwind.config.js` > **Podgląd wizualny:** `/dev/design-system` (tylko dev mode, synchronizowany z live CSS vars w przeglądarce)

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│  0. SINGLE SOURCE OF TRUTH (JSON)                               │
│     libs/src/lib/constants/color-palette.json (foundation hex)  │
│     libs/src/lib/constants/semantic-color-mapping.json (mapping)│
└─────────────────────────────────────────────────────────────────┘
            │                                       │
            ↓                                       ↓
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  TAILWIND CONFIG             │    │  CODEGEN SCRIPT              │
│  tailwind.config.js          │    │  scripts/generate-color-     │
│  require('color-palette.json')│    │  tokens.mjs                  │
│  + withOpacity(--color-*)    │    │  (czyta oba JSON-y)          │
└──────────────────────────────┘    └──────────────────────────────┘
            │                                       │
            │                                       ↓
            │                       ┌──────────────────────────────┐
            │                       │  AUTO-GENERATED              │
            │                       │  frontend/src/styles/        │
            │                       │  _tokens.scss (CSS vars)     │
            │                       │  Format: "R G B" (RGB space) │
            │                       └──────────────────────────────┘
            │                                       │
            └───────────────┬───────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  TAILWIND OUTPUT (przeglądarka)                                 │
│  Foundation: bg-mint-500 → #37bc9b (z JSON)                     │
│  Semantic:   bg-primary-500 → rgb(var(--color-primary-500))     │
│              (rezolwowane z _tokens.scss runtime)               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  KOMPONENTY ANGULAR + EMAIL TEMPLATES                           │
│  Angular: TYLKO semantic Tailwind classes (bg-primary-500)      │
│  Email:   EMAIL_THEME (libs/email/src/theme.ts) → COLOR_PALETTE │
└─────────────────────────────────────────────────────────────────┘
```

**Brak dark mode. Jeden statyczny theme. Brak ręcznej synchronizacji** — jedna edycja JSON-a propaguje wszędzie automatycznie (Tailwind reload + `pnpm tokens:generate` regeneruje SCSS).

## Pliki konfiguracyjne

| Plik                                                 | Rola                                                      |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `libs/src/lib/constants/color-palette.json`          | **Single Source of Truth** — foundation hex values        |
| `libs/src/lib/constants/semantic-color-mapping.json` | **Single Source of Truth** — semantic→foundation map      |
| `libs/src/lib/constants/color-palette.ts`            | TS wrapper (re-export JSON jako `COLOR_PALETTE`)          |
| `libs/src/lib/constants/semantic-color-mapping.ts`   | TS wrapper (re-export JSON jako `SEMANTIC_COLOR_MAPPING`) |
| `scripts/generate-color-tokens.mjs`                  | Codegen `_tokens.scss` z JSON-ów                          |
| `frontend/src/styles/_tokens.scss`                   | **AUTO-GENERATED** CSS vars (nie edytować ręcznie)        |
| `frontend/tailwind.config.js`                        | Wymaga `color-palette.json` + semantic mapping (CSS vars) |
| `frontend/.postcssrc.json`                           | PostCSS config z `@tailwindcss/postcss` (Tailwind v4)     |
| `frontend/src/styles.scss`                           | `@use 'tailwindcss'` + `@config` + layout vars            |
| `/dev/design-system`                                 | Podgląd wizualny (tylko dev mode)                         |

## Workflow

1. **Edytuj** `color-palette.json` (foundation hex) lub `semantic-color-mapping.json` (mapping).
2. **`pnpm tokens:generate`** regeneruje `_tokens.scss`.
   - Auto-uruchamiany przed `nx build frontend` i `nx serve frontend` (dependsOn).
   - Manualnie: `pnpm tokens:generate` lub `nx run frontend:tokens:generate`.
3. Tailwind od razu widzi nowe wartości z JSON (foundation) i z `_tokens.scss` (semantic).

---

## SEMANTIC PALETTES (główne - używaj w komponentach)

### Primary (mint) - Brand, CTA, przyciski, linki

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                         |
| ------------- | ------------- | --------- | ------------------------------------ |
| `primary-50`  | `232 250 245` | `#e8faf5` | Delikatne tło akcentowe              |
| `primary-100` | `209 245 234` | `#d1f5ea` | Tło hover                            |
| `primary-200` | `167 237 216` | `#a7edd8` | Border notification bar              |
| `primary-300` | `114 223 189` | `#72dfbd` | -                                    |
| `primary-400` | `72 207 173`  | `#48cfad` | Jaśniejszy wariant (gradienty)       |
| `primary-500` | `55 188 155`  | `#37bc9b` | **Główny** - przyciski, badge, linki |
| `primary-600` | `38 163 134`  | `#26a386` | Hover na przyciskach                 |
| `primary-700` | `30 130 107`  | `#1e826b` | Ciemny akcent                        |
| `primary-800` | `24 104 86`   | `#186856` | -                                    |
| `primary-900` | `18 78 64`    | `#124e40` | -                                    |

### Neutral (dark/gray) - Tła, tekst, bordery

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                                |
| ------------- | ------------- | --------- | ------------------------------------------- |
| `neutral-50`  | `248 249 250` | `#f8f9fa` | Najjaśniejsze tło (alternatywa dla `white`) |
| `neutral-100` | `234 236 240` | `#eaecf0` | **Tło strony** (`bg-neutral-100`)           |
| `neutral-200` | `218 220 226` | `#dadce2` | **Bordery** (`border-neutral-200`)          |
| `neutral-300` | `188 192 202` | `#bcc0ca` | Placeholder text, disabled                  |
| `neutral-400` | `158 162 174` | `#9ea2ae` | Ikony muted, secondary text                 |
| `neutral-500` | `101 109 120` | `#656d78` | **Tekst drugorzędny** (`text-neutral-500`)  |
| `neutral-600` | `67 74 84`    | `#434a54` | -                                           |
| `neutral-700` | `52 57 65`    | `#343941` | -                                           |
| `neutral-800` | `38 42 48`    | `#262a30` | -                                           |
| `neutral-900` | `28 31 35`    | `#1c1f23` | **Tekst główny** (`text-neutral-900`)       |
| `neutral-950` | `18 20 23`    | `#121417` | -                                           |

### Success (green) - Pozytywne statusy

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                   |
| ------------- | ------------- | --------- | ------------------------------ |
| `success-50`  | `240 249 232` | `#f0f9e8` | Tło notification bar           |
| `success-200` | `197 225 165` | `#c5e1a5` | Border notification bar        |
| `success-400` | `140 193 82`  | `#8cc152` | Badge "trwa", cena "Bezpłatne" |
| `success-600` | `85 139 47`   | `#558b2f` | Tekst w notification bar       |

### Warning (orange) - Ostrzeżenia

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                        |
| ------------- | ------------- | --------- | ----------------------------------- |
| `warning-50`  | `255 243 224` | `#fff3e0` | Tło notification bar ostrzegawczego |
| `warning-200` | `255 204 128` | `#ffcc80` | Border                              |
| `warning-400` | `233 87 63`   | `#e9573f` | Badge warning                       |
| `warning-600` | `191 54 12`   | `#bf360c` | Tekst                               |

### Danger (red) - Błędy, destrukcyjne akcje

| Odcień       | RGB (CSS var) | Hex       | Zastosowanie                           |
| ------------ | ------------- | --------- | -------------------------------------- |
| `danger-50`  | `254 236 238` | `#feecee` | Tło notification bar                   |
| `danger-200` | `249 180 188` | `#f9b4bc` | Border                                 |
| `danger-400` | `237 85 101`  | `#ed5565` | Badge error                            |
| `danger-500` | `218 68 83`   | `#da4453` | Tekst                                  |
| `danger-600` | `192 57 43`   | `#c0392b` | Mocniejszy tekst / destructive surface |
| `danger-700` | `160 32 32`   | `#a02020` | Bardzo mocny akcent                    |
| `danger-800` | `122 26 36`   | `#7a1a24` | Głębokie tło / hover                   |
| `danger-900` | `80 16 21`    | `#501015` | Najciemniejszy wariant                 |

### Info (blue) - Informacje, focus ring

| Odcień     | RGB (CSS var) | Hex       | Zastosowanie           |
| ---------- | ------------- | --------- | ---------------------- |
| `info-50`  | `232 243 254` | `#e8f3fe` | Tło notification bar   |
| `info-200` | `157 204 248` | `#9dccf8` | Border                 |
| `info-400` | `74 137 220`  | `#4a89dc` | Badge info, focus ring |
| `info-600` | `21 101 192`  | `#1565c0` | Tekst                  |

---

## FOUNDATION PALETTES (raw - dla dekoracji)

Dostępne jako raw kolory z szablonu sticky-mobile. Używaj do kart dekoracyjnych, akcentów, gradientów.

| Paleta    | 400 (light) | 500 (dark) | Zastosowanie          |
| --------- | ----------- | ---------- | --------------------- |
| `red`     | `#ed5565`   | `#da4453`  | Bazowy dla danger     |
| `orange`  | `#e9573f`   | `#d84315`  | Bazowy dla warning    |
| `yellow`  | `#ffce54`   | `#f6bb42`  | Dekoracyjny           |
| `green`   | `#8cc152`   | `#6fa834`  | Bazowy dla success    |
| `mint`    | `#48cfad`   | `#37bc9b`  | Bazowy dla primary    |
| `blue`    | `#4a89dc`   | `#3070c4`  | Bazowy dla info       |
| `magenta` | `#ac92ec`   | `#967adc`  | Dekoracyjny fioletowy |
| `pink`    | `#ec87c0`   | `#d770ad`  | Dekoracyjny różowy    |
| `brown`   | `#aa8e69`   | `#8d6e4c`  | Dekoracyjny brązowy   |
| `dark`    | `#9ea2ae`   | `#656d78`  | Bazowy dla neutral    |

## Konwencje użycia w szablonach

```html
<!-- Tła -->
bg-neutral-100
<!-- tło strony -->
bg-white
<!-- karta / panel -->
bg-primary-500
<!-- przycisk primary -->
bg-primary-50
<!-- delikatne tło akcentowe -->

<!-- Tekst -->
text-neutral-900
<!-- tekst główny -->
text-neutral-500
<!-- tekst drugorzędny / muted -->
text-neutral-400
<!-- ikony muted, placeholder -->
text-white
<!-- tekst na ciemnym tle -->

<!-- Bordery -->
border-neutral-200
<!-- standardowy border -->

<!-- Przyciski -->
bg-primary-100 text-primary-600 hover:bg-primary-200
<!-- soft + primary -->
border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50
<!-- outline + neutral -->
border border-primary-300 bg-white text-primary-600 hover:bg-primary-50
<!-- outline + primary -->
bg-danger-50 text-danger-500 hover:bg-danger-100
<!-- soft + danger -->
bg-success-50 text-success-600 hover:bg-success-100
<!-- soft + success -->
bg-warning-50 text-warning-600 hover:bg-warning-100
<!-- soft + warning -->
text-neutral-600 hover:bg-neutral-100
<!-- ghost + neutral -->
text-primary-500 underline hover:text-primary-600
<!-- link + primary -->

<!-- Focus ring -->
focus:ring-2 focus:ring-primary-300

<!-- Linki -->
text-primary-500 hover:text-primary-600

<!-- Notification bary / alerty (lekkie pastelowe tła) -->
bg-success-50 border-success-200 text-success-600
<!-- sukces -->
bg-info-50 border-info-200 text-info-600
<!-- info -->
bg-warning-50 border-warning-200 text-warning-600
<!-- ostrzeżenie -->
bg-danger-50 border-danger-200 text-danger-500
<!-- błąd -->

<!-- Status badge (solidne tła) -->
bg-success-400 text-white
<!-- TRWA / aktywne -->
bg-warning-400 text-white
<!-- countdown urgent -->
bg-info-400 text-white
<!-- countdown soon -->
bg-danger-400 text-white
<!-- error -->

<!-- Gradienty -->
from-primary-400 to-primary-500
<!-- cover image fallback -->
```

## Kontrakty komponentów oparte o `SemanticColor`

Kolory semantyczne nie powinny żyć jako lokalne unie typu `'success' | 'warning' | ...` w wielu komponentach.

**Source of Truth dla osi koloru komponentów:**

- `frontend/src/app/shared/types/colors.ts`
- typ: `SemanticColor = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral'`
- mapy klas: `SEMANTIC_COLOR_CLASSES`

### `app-button`

Preferowane API:

```html
<app-button appearance="solid" color="primary">Zapisz</app-button>
<app-button appearance="soft" color="primary">Opcjonalna akcja</app-button>
<app-button appearance="outline" color="neutral">Anuluj</app-button>
<app-button appearance="ghost" color="danger">Usuń</app-button>
<app-button appearance="link" color="info">Dowiedz się więcej</app-button>
```

- `appearance` opisuje **krój / styl przycisku**
- `color` opisuje **semantykę koloru** i zawsze powinien bazować na `SemanticColor`
- legacy `variant` jest dopuszczony tylko jako warstwa kompatybilności podczas migracji

Dozwolone appearance:

- `solid` (domyślny)
- `soft`
- `outline`
- `ghost`
- `link`

### `app-icon`

Preferowane API:

```html
<app-icon name="star" color="primary" /> <app-icon name="alert-triangle" color="warning" />
```

- `color` korzysta z `SemanticColor`
- `variant="default"` i `variant="muted"` pozostają jako neutralne presety prezentacyjne
- nie tworzymy nowych lokalnych typów kolorów dla ikon

### `app-bottom-overlay`

Nagłówkowa ikona overlayu używa:

```html
<app-bottom-overlay icon="shield" iconColor="info" />
```

### Inne komponenty

- `UserProfileStats.color` powinno używać `SemanticColor`
- badge/statusy, jeśli opisują **kolor prezentacji**, powinny używać `SemanticColor`
- jeśli typ opisuje **rodzaj komunikatu lub stan domenowy** (np. `SnackbarType`), zachowujemy typ domenowy i mapujemy go do `SemanticColor`, zamiast zastępować go kolorem 1:1

### Ikona `repeat` i badge serii wydarzeń

Ikona `repeat` jest używana do oznaczenia wydarzeń należących do serii:

- W `event-card.component.ts`: pill `bg-primary-600/80 backdrop-blur-sm` z `<app-icon name="repeat" size="xs" class="text-white" />` i etykietą "seria"
- Klasy: `inline-flex items-center gap-1 rounded-full bg-primary-600/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white`
- `aria-label="Wydarzenie z serii"`, `title="Wydarzenie z serii"`
- Badge jest widoczny TYLKO gdy `event.seriesId != null`

## Reguły

### DOZWOLONE

- Klasy z palety: `bg-primary-500`, `text-neutral-900`, `border-success-200`, etc.
- `white`, `black`, `transparent`, `current` - natywne kolory Tailwind
- Opacity modifiers: `bg-primary-500/10`, `border-neutral-200/50`

### ZABRONIONE

- **Tailwind defaults:** `bg-blue-500`, `text-gray-900`, `bg-slate-100`, `text-red-600`
- **Arbitralne hexy:** `bg-[#ff0000]`, `text-[#333]`
- **Dark mode prefixy:** `dark:bg-*`, `dark:text-*`
- **Bezpośrednie CSS vars w szablonach:** `style="color: var(--color-primary-500)"`
- **Stare tokeny:** `bg-surface`, `text-foreground`, `bg-highlight`, `bg-card-green-bg`
- **Usunięte palety:** `teal-*` (zastąpione przez `mint-*` lub `magenta-*`)

### Mapowanie starych tokenów → nowa paleta

| Stary token                | Nowy odpowiednik         |
| -------------------------- | ------------------------ |
| `bg-background`            | `bg-neutral-100`         |
| `bg-surface`               | `bg-white`               |
| `bg-surface-elevated`      | `bg-white`               |
| `text-foreground`          | `text-neutral-900`       |
| `text-muted`               | `text-neutral-500`       |
| `text-muted-foreground`    | `text-neutral-500`       |
| `border-border`            | `border-neutral-200`     |
| `ring-ring`                | `ring-info-400`          |
| `bg-primary`               | `bg-primary-500`         |
| `hover:bg-primary-hover`   | `hover:bg-primary-600`   |
| `text-primary-foreground`  | `text-white`             |
| `bg-success`               | `bg-success-400`         |
| `text-success-foreground`  | `text-white`             |
| `bg-warning`               | `bg-warning-400`         |
| `text-warning-foreground`  | `text-white`             |
| `bg-danger`                | `bg-danger-400`          |
| `text-danger-foreground`   | `text-white`             |
| `bg-info`                  | `bg-info-400`            |
| `text-info-foreground`     | `text-white`             |
| `bg-highlight`             | `bg-primary-500`         |
| `text-highlight`           | `text-primary-500`       |
| `hover:text-highlight`     | `hover:text-primary-500` |
| `bg-highlight-light`       | `bg-primary-400`         |
| `bg-highlight-dark`        | `bg-primary-600`         |
| `bg-highlight/10`          | `bg-primary-50`          |
| `focus:ring-highlight`     | `focus:ring-primary-500` |
| `bg-card-green-bg`         | `bg-success-50`          |
| `border-card-green-border` | `border-success-200`     |
| `text-card-green-text`     | `text-success-600`       |
| `bg-card-blue-bg`          | `bg-info-50`             |
| `border-card-blue-border`  | `border-info-200`        |
| `text-card-blue-text`      | `text-info-600`          |
| `bg-card-teal-bg`          | `bg-magenta-50`          |
| `border-card-teal-border`  | `border-magenta-200`     |
| `text-card-teal-text`      | `text-magenta-600`       |
| `bg-card-brown-bg`         | `bg-brown-50`            |
| `border-card-brown-border` | `border-brown-200`       |
| `text-card-brown-text`     | `text-brown-600`         |
| `bg-card-red-bg`           | `bg-danger-50`           |
| `border-card-red-border`   | `border-danger-200`      |
| `text-card-red-text`       | `text-danger-500`        |

## Tokeny w kontekście emaili (libs/email)

Szablony emaili nie mogą korzystać z Tailwind ani CSS variables — klienty pocztowe wymagają inline styles z wartościami hex. Dlatego istnieje dedykowana warstwa TypeScript:

```
┌──────────────────────────────────────────────────────────────────┐
│  libs/src/lib/constants/color-palette.ts                         │
│  (@zgadajsie/shared → COLOR_PALETTE)                             │
│  Foundation palette — te same wartości hex co tailwind.config.js │
│  Sync ręczny (taka sama zasada jak _tokens.scss ↔ tailwind.config)│
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  libs/email/src/theme.ts → EMAIL_THEME                           │
│  (@zgadajsie/email → EMAIL_THEME)                                │
│  Semantic mapping: primary=mint, neutral=dark, success=green,    │
│  warning=orange, danger=red, info=blue                           │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  libs/email/src/components/* i templates/*                       │
│  Używają: const c = EMAIL_THEME.colors;                          │
│  Przykład: color: c.primary[500], backgroundColor: c.neutral[50] │
└──────────────────────────────────────────────────────────────────┘
```

**Ważne:** `color-palette.json` jest jedynym źródłem hex values. `frontend/tailwind.config.js` (foundation) i email templates używają go bezpośrednio. `_tokens.scss` jest auto-generowany przez `scripts/generate-color-tokens.mjs` — żadna ręczna synchronizacja.

---

## Jak dodać nowy kolor?

### Nowy kolor semantyczny (primary, danger, etc.)

1. Dodaj nowy mapping w `libs/src/lib/constants/semantic-color-mapping.json` (np. `"accent": "magenta"`)
2. Dodaj `accent: { 50: withOpacity('--color-accent-50'), ... }` w `frontend/tailwind.config.js` (semantic mapping)
3. Dodaj label do `SEMANTIC_LABELS` w `scripts/generate-color-tokens.mjs`
4. `pnpm tokens:generate` zregeneruje `_tokens.scss` z CSS vars
5. Zaktualizuj tę dokumentację
6. Zaktualizuj stronę `/dev/design-system`

### Nowy kolor dekoracyjny (foundation)

1. Dodaj raw hex palette do `libs/src/lib/constants/color-palette.json` — **jedyne miejsce do edycji hex**
2. `frontend/tailwind.config.js` automatycznie użyje nowej palety przez `...COLOR_PALETTE`
3. Jeśli kolor ma być też dostępny w emailach: dodaj mapping w `libs/email/src/theme.ts`
4. Zaktualizuj tę dokumentację
5. Zaktualizuj stronę `/dev/design-system`

### Zmiana istniejącego koloru

1. Zmień wartości hex w `libs/src/lib/constants/color-palette.json`
2. `pnpm tokens:generate` zregeneruje `_tokens.scss` (auto-run przed `nx build/serve frontend`)
3. Tailwind automatycznie użyje nowych wartości — w foundation (przez JSON) i w semantic (przez CSS vars)
