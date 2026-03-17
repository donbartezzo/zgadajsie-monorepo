# Design Tokens — Centralna Paleta Kolorów

> **Jedyne źródło prawdy kolorystycznej** w projekcie to `frontend/tailwind.config.js`.
> Każdy kolor używany w szablonach **MUSI** pochodzić z tej palety. Bez wyjątków.

## Architektura

```
tailwind.config.js (hex values)  →  klasy Tailwind  →  szablony Angular
```

Brak CSS custom properties dla kolorów. Brak dark mode. Jeden statyczny theme.

## Pliki konfiguracyjne

| Plik                          | Rola                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| `frontend/tailwind.config.js` | Jedyne źródło prawdy — definicje palet hex                              |
| `frontend/src/styles.scss`    | Tylko zmienne layout (`--app-max-width`, `--footer-height`, `--hero-h`) |
| `/dev/design-system`          | Podgląd wizualny (tylko dev mode)                                       |

## Palety kolorów

### Primary (brand)

Główny kolor marki (`#DA4453`). Przyciski, linki, akcenty, gradienty.

| Odcień        | Hex       | Zastosowanie                           |
| ------------- | --------- | -------------------------------------- |
| `primary-50`  | `#fdf2f2` | Delikatne tło (np. ikona na home page) |
| `primary-100` | `#fce4e4` | Tło hover, tło notification bar        |
| `primary-200` | `#f9cece` | Border notification bar                |
| `primary-300` | `#f2a5a5` | —                                      |
| `primary-400` | `#ed5565` | Jaśniejszy wariant (gradienty)         |
| `primary-500` | `#da4453` | **Główny** — przyciski, badge, linki   |
| `primary-600` | `#c0392b` | Hover na przyciskach                   |
| `primary-700` | `#a02020` | Ciemny akcent                          |
| `primary-800` | `#7a1a24` | —                                      |
| `primary-900` | `#501015` | —                                      |

### Neutral (tła, tekst, bordery)

Szara skala używana do: tła strony, kart, tekstu, borderów, ikon muted.

| Odcień        | Hex       | Zastosowanie                                |
| ------------- | --------- | ------------------------------------------- |
| `neutral-50`  | `#fafafa` | Najjaśniejsze tło (alternatywa dla `white`) |
| `neutral-100` | `#eaeaef` | **Tło strony** (`bg-neutral-100`)           |
| `neutral-200` | `#e0e0e5` | **Bordery** (`border-neutral-200`)          |
| `neutral-300` | `#c8c8d0` | Placeholder text, disabled                  |
| `neutral-400` | `#9e9ea8` | Ikony muted, secondary text                 |
| `neutral-500` | `#6c6c6c` | **Tekst drugorzędny** (`text-neutral-500`)  |
| `neutral-600` | `#555555` | —                                           |
| `neutral-700` | `#3f3f3f` | —                                           |
| `neutral-800` | `#2a2a2a` | —                                           |
| `neutral-900` | `#1f1f1f` | **Tekst główny** (`text-neutral-900`)       |
| `neutral-950` | `#0f0f0f` | —                                           |

### Success (zielony)

Statusy pozytywne, potwierdzenia, notification bary uczestnika.

| Odcień        | Hex       | Zastosowanie                                        |
| ------------- | --------- | --------------------------------------------------- |
| `success-50`  | `#e8f5e0` | Tło notification bar (dawne `card-green-bg`)        |
| `success-200` | `#c5e1a5` | Border notification bar (dawne `card-green-border`) |
| `success-400` | `#8cc152` | Badge "trwa", cena "Bezpłatne"                      |
| `success-600` | `#558b2f` | Tekst w notification bar (dawne `card-green-text`)  |

### Warning (pomarańczowy)

Ostrzeżenia, countdown urgent.

| Odcień        | Hex       | Zastosowanie                        |
| ------------- | --------- | ----------------------------------- |
| `warning-50`  | `#fff3e0` | Tło notification bar ostrzegawczego |
| `warning-200` | `#ffcc80` | Border                              |
| `warning-400` | `#e9573f` | Badge warning                       |
| `warning-600` | `#bf360c` | Tekst                               |

### Danger (czerwony)

Błędy, usuwanie, destrukcyjne akcje.

| Odcień       | Hex       | Zastosowanie                                     |
| ------------ | --------- | ------------------------------------------------ |
| `danger-50`  | `#fce4ec` | Tło notification bar błędu (dawne `card-red-bg`) |
| `danger-200` | `#ef9a9a` | Border (dawne `card-red-border`)                 |
| `danger-400` | `#da4453` | Badge error                                      |
| `danger-500` | `#c62828` | Tekst (dawne `card-red-text`)                    |

### Info (niebieski)

Informacje, linki, notification bary organizatora.

| Odcień     | Hex       | Zastosowanie                                |
| ---------- | --------- | ------------------------------------------- |
| `info-50`  | `#e3f2fd` | Tło notification bar (dawne `card-blue-bg`) |
| `info-200` | `#90caf9` | Border (dawne `card-blue-border`)           |
| `info-400` | `#4a89dc` | Badge info, focus ring                      |
| `info-600` | `#1565c0` | Tekst (dawne `card-blue-text`)              |

### Teal (dekoracyjny)

Odcienie turkusowe — do kart dekoracyjnych, akcentów.

| Odcień     | Hex       | Zastosowanie                      |
| ---------- | --------- | --------------------------------- |
| `teal-50`  | `#e0f2f1` | Tło (dawne `card-teal-bg`)        |
| `teal-200` | `#80cbc4` | Border (dawne `card-teal-border`) |
| `teal-600` | `#00695c` | Tekst (dawne `card-teal-text`)    |

### Brown (dekoracyjny)

Odcienie brązowe — do kart dekoracyjnych, akcentów.

| Odcień      | Hex       | Zastosowanie                       |
| ----------- | --------- | ---------------------------------- |
| `brown-50`  | `#efebe9` | Tło (dawne `card-brown-bg`)        |
| `brown-200` | `#bcaaa4` | Border (dawne `card-brown-border`) |
| `brown-600` | `#795548` | Tekst (dawne `card-brown-text`)    |

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
- **CSS custom properties kolorów:** `var(--color-*)`
- **Stare tokeny:** `bg-surface`, `text-foreground`, `bg-highlight`, `bg-card-green-bg`

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
| `bg-card-teal-bg`          | `bg-teal-50`             |
| `border-card-teal-border`  | `border-teal-200`        |
| `text-card-teal-text`      | `text-teal-600`          |
| `bg-card-brown-bg`         | `bg-brown-50`            |
| `border-card-brown-border` | `border-brown-200`       |
| `text-card-brown-text`     | `text-brown-600`         |
| `bg-card-red-bg`           | `bg-danger-50`           |
| `border-card-red-border`   | `border-danger-200`      |
| `text-card-red-text`       | `text-danger-500`        |

## Jak dodać nowy kolor?

1. Dodaj nowy odcień lub nową paletę do `frontend/tailwind.config.js` → `extend.colors`
2. Zaktualizuj tę dokumentację (`docs/design-tokens.md`)
3. Zaktualizuj stronę `/dev/design-system`
4. **Nie twórz** CSS custom properties kolorów — wszystko w Tailwind config
