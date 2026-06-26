# RWD 02 — Mobile viewport: safe-area + dynamiczne jednostki (dvh/svh)

| Pole            | Wartość                         |
| --------------- | ------------------------------- |
| Priorytet       | Wysoki                          |
| Ryzyko regresji | Średnie (dotyka globalny shell) |
| Zależności      | brak (niezależny)               |
| Sekcje audytu   | 16.1, 16.2, 16.3                |

## Cel

Naprawić poprawność wyświetlania na realnych telefonach: notch / home indicator / dynamiczny pasek
przeglądarki. Trzy powiązane problemy domknięte w jednym tasku, bo dotyczą tego samego shella.

## Stan obecny

- `frontend/src/index.html:7` — `<meta name="viewport" content="width=device-width, initial-scale=1" />`
  (brak `viewport-fit=cover`).
- `frontend/src/styles.scss:121,133` — `.app` i `.app-container` używają `min-height: 100vh`.
- `frontend/src/styles.scss:114` — `--footer-height: 70px`; clearance `padding-bottom: var(--footer-height)`.
- `bottom-nav.component.ts:15` — `fixed bottom-0` bez `safe-area-inset`.
- Grep `safe-area-inset|env(` → 0 trafień w `frontend/src`.

## Zakres / kroki

### 1. viewport-fit=cover

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 2. Safe-area dla bottom-nav i clearance

- `bottom-nav` `<footer>`: dodać `padding-bottom: env(safe-area-inset-bottom)` i powiększyć realną
  wysokość o inset (np. wrapper z `padding-bottom`).
- `.app-container` clearance:
  ```scss
  padding-bottom: calc(var(--footer-height) + env(safe-area-inset-bottom));
  ```
- Cookie consent (`bottom-[75px]`) i sticky CTA: uwzględnić inset, żeby nie ładowały na pasek systemowy.

### 3. Dynamiczne jednostki viewportu

- W `styles.scss` zamienić `100vh` → `100svh` (shell) z fallbackiem:
  ```scss
  min-height: 100vh;
  min-height: 100svh;
  ```
- Ekrany `fullscreenContent` (mapa, czat) — preferuj `100dvh` dla wypełnienia bez „skoków”.
- Zweryfikować flex chain w `page-layout` i komponentach fullscreen (host `flex flex-col flex-1 min-h-0`).

## Kryteria akceptacji

- [ ] Na iPhone (notch + gesture bar, Safari) dolne przyciski nie są zasłaniane przez home indicator.
- [ ] Pokazanie/ukrycie paska adresu nie powoduje „skoku” layoutu ani ucięcia treści.
- [ ] Czat/mapa wypełniają dokładnie widoczny viewport (bez podwójnego scrolla).
- [ ] PWA standalone: dół aplikacji respektuje safe-area.

## Ryzyka / rollback

- Ryzyko: `100svh`/`dvh` zmienia wysokości — zweryfikować fullscreen i sticky elementy.
- Rollback: przywrócić `100vh` i usunąć `env()` paddingi. Zmiany skupione w `styles.scss`,
  `index.html`, `bottom-nav`.
