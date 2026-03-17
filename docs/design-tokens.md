# Design Tokens — System Kolorów (3-warstwowa architektura)

> **Source of Truth:** CSS variables w `frontend/src/styles/_tokens.scss` > **Tailwind mapping:** `frontend/tailwind.config.js` > **Podgląd wizualny:** `/dev/design-system` (tylko dev mode)

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│  1. FOUNDATION PALETTE (tailwind.config.js)                     │
│     Raw hex colors: red, orange, yellow, green, mint, blue,     │
│     magenta, pink, brown, dark                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. SEMANTIC TOKENS (_tokens.scss) ← SOURCE OF TRUTH            │
│     CSS variables: --color-primary-*, --color-neutral-*, etc.   │
│     Format: RGB space-separated (np. "55 188 155")              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. TAILWIND MAPPING (tailwind.config.js)                       │
│     Semantic palettes: primary, neutral, success, warning,      │
│     danger, info → rgb(var(--color-*) / <alpha-value>)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. KOMPONENTY ANGULAR                                          │
│     TYLKO semantyczne klasy: bg-primary-500, text-danger-400    │
│     Raw palettes (bg-mint-500) tylko dla dekoracji              │
└─────────────────────────────────────────────────────────────────┘
```

**Brak dark mode. Jeden statyczny theme.**

## Pliki konfiguracyjne

| Plik                               | Rola                                                    |
| ---------------------------------- | ------------------------------------------------------- |
| `frontend/src/styles/_tokens.scss` | **Source of Truth** — CSS vars semantycznych palet      |
| `frontend/tailwind.config.js`      | Foundation palettes (raw) + Semantic mapping (CSS vars) |
| `frontend/src/styles.scss`         | Import \_tokens.scss + layout vars                      |
| `/dev/design-system`               | Podgląd wizualny (tylko dev mode)                       |

---

## SEMANTIC PALETTES (główne — używaj w komponentach)

### Primary (mint) — Brand, CTA, przyciski, linki

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                         |
| ------------- | ------------- | --------- | ------------------------------------ |
| `primary-50`  | `232 250 245` | `#e8faf5` | Delikatne tło akcentowe              |
| `primary-100` | `209 245 234` | `#d1f5ea` | Tło hover                            |
| `primary-200` | `167 237 216` | `#a7edd8` | Border notification bar              |
| `primary-300` | `114 223 189` | `#72dfbd` | —                                    |
| `primary-400` | `72 207 173`  | `#48cfad` | Jaśniejszy wariant (gradienty)       |
| `primary-500` | `55 188 155`  | `#37bc9b` | **Główny** — przyciski, badge, linki |
| `primary-600` | `38 163 134`  | `#26a386` | Hover na przyciskach                 |
| `primary-700` | `30 130 107`  | `#1e826b` | Ciemny akcent                        |
| `primary-800` | `24 104 86`   | `#186856` | —                                    |
| `primary-900` | `18 78 64`    | `#124e40` | —                                    |

### Neutral (dark/gray) — Tła, tekst, bordery

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                                |
| ------------- | ------------- | --------- | ------------------------------------------- |
| `neutral-50`  | `248 249 250` | `#f8f9fa` | Najjaśniejsze tło (alternatywa dla `white`) |
| `neutral-100` | `234 236 240` | `#eaecf0` | **Tło strony** (`bg-neutral-100`)           |
| `neutral-200` | `218 220 226` | `#dadce2` | **Bordery** (`border-neutral-200`)          |
| `neutral-300` | `188 192 202` | `#bcc0ca` | Placeholder text, disabled                  |
| `neutral-400` | `158 162 174` | `#9ea2ae` | Ikony muted, secondary text                 |
| `neutral-500` | `101 109 120` | `#656d78` | **Tekst drugorzędny** (`text-neutral-500`)  |
| `neutral-600` | `67 74 84`    | `#434a54` | —                                           |
| `neutral-700` | `52 57 65`    | `#343941` | —                                           |
| `neutral-800` | `38 42 48`    | `#262a30` | —                                           |
| `neutral-900` | `28 31 35`    | `#1c1f23` | **Tekst główny** (`text-neutral-900`)       |
| `neutral-950` | `18 20 23`    | `#121417` | —                                           |

### Success (green) — Pozytywne statusy

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                   |
| ------------- | ------------- | --------- | ------------------------------ |
| `success-50`  | `240 249 232` | `#f0f9e8` | Tło notification bar           |
| `success-200` | `197 225 165` | `#c5e1a5` | Border notification bar        |
| `success-400` | `140 193 82`  | `#8cc152` | Badge "trwa", cena "Bezpłatne" |
| `success-600` | `85 139 47`   | `#558b2f` | Tekst w notification bar       |

### Warning (orange) — Ostrzeżenia

| Odcień        | RGB (CSS var) | Hex       | Zastosowanie                        |
| ------------- | ------------- | --------- | ----------------------------------- |
| `warning-50`  | `255 243 224` | `#fff3e0` | Tło notification bar ostrzegawczego |
| `warning-200` | `255 204 128` | `#ffcc80` | Border                              |
| `warning-400` | `233 87 63`   | `#e9573f` | Badge warning                       |
| `warning-600` | `191 54 12`   | `#bf360c` | Tekst                               |

### Danger (red) — Błędy, destrukcyjne akcje

| Odcień       | RGB (CSS var) | Hex       | Zastosowanie         |
| ------------ | ------------- | --------- | -------------------- |
| `danger-50`  | `254 236 238` | `#feecee` | Tło notification bar |
| `danger-200` | `249 180 188` | `#f9b4bc` | Border               |
| `danger-400` | `237 85 101`  | `#ed5565` | Badge error          |
| `danger-500` | `218 68 83`   | `#da4453` | Tekst                |

### Info (blue) — Informacje, focus ring

| Odcień     | RGB (CSS var) | Hex       | Zastosowanie           |
| ---------- | ------------- | --------- | ---------------------- |
| `info-50`  | `232 243 254` | `#e8f3fe` | Tło notification bar   |
| `info-200` | `157 204 248` | `#9dccf8` | Border                 |
| `info-400` | `74 137 220`  | `#4a89dc` | Badge info, focus ring |
| `info-600` | `21 101 192`  | `#1565c0` | Tekst                  |

---

## FOUNDATION PALETTES (raw — dla dekoracji)

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
bg-primary-500 hover:bg-primary-600 text-white
<!-- primary — główna akcja -->
bg-neutral-100 hover:bg-neutral-200 text-neutral-900
<!-- secondary — akcja alternatywna -->
border border-neutral-200 text-neutral-700 hover:bg-neutral-50
<!-- outline — subtelny wariant -->
border border-primary-500 text-primary-500 hover:bg-primary-50
<!-- outline-primary — outline w kolorze brand -->
bg-danger-400 hover:bg-danger-500 text-white
<!-- danger — usuwanie / destrukcja -->
bg-success-400 hover:bg-success-500 text-white
<!-- success — potwierdzenie / akceptacja -->
bg-warning-400 hover:bg-warning-500 text-white
<!-- warning — akcje wymagające uwagi -->
text-neutral-600 hover:bg-neutral-100
<!-- ghost — akcje pomocnicze -->
text-primary-500 underline hover:text-primary-600
<!-- link — styl linkowy -->

<!-- Focus ring -->
focus:ring-2 focus:ring-primary-500

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

## Reguły

### DOZWOLONE

- Klasy z palety: `bg-primary-500`, `text-neutral-900`, `border-success-200`, etc.
- `white`, `black`, `transparent`, `current` — natywne kolory Tailwind
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

## Jak dodać nowy kolor?

### Nowy kolor semantyczny (primary, danger, etc.)

1. Dodaj CSS variables do `frontend/src/styles/_tokens.scss` w formacie RGB space-separated
2. Dodaj mapping w `frontend/tailwind.config.js` → semantic palette z `withOpacity()`
3. Zaktualizuj tę dokumentację
4. Zaktualizuj stronę `/dev/design-system`

### Nowy kolor dekoracyjny (foundation)

1. Dodaj raw hex palette do `frontend/tailwind.config.js` → foundation palette
2. Zaktualizuj tę dokumentację
3. Zaktualizuj stronę `/dev/design-system`

### Zmiana istniejącego koloru semantycznego

1. Zmień wartości RGB w `_tokens.scss` — to jest **jedyne miejsce** do edycji
2. Tailwind automatycznie użyje nowych wartości
