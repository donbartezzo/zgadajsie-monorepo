# RWD 04 — Orientacja pozioma (landscape) na telefonie

| Pole            | Wartość           |
| --------------- | ----------------- |
| Priorytet       | Średni            |
| Ryzyko regresji | Niskie            |
| Zależności      | brak (niezależny) |
| Sekcje audytu   | 16.4              |

## Cel

W orientacji poziomej na telefonie (niski viewport, np. 844×390) hero o stałej wysokości 250px
zajmuje większość ekranu, spychając treść/CTA poza widok. Dostosować hero i widoki fullscreen do
niskich viewportów.

## Stan obecny

- `styles.scss:98-100,115-117` — `--hero-extended-h: 250px`, `--hero-compact-h: 120px` (stałe).
- Brak `@media (orientation: landscape)` / `@media (max-height: ...)`.

## Zakres / kroki

1. Dodać query dla niskich viewportów (preferuj `max-height` zamiast `orientation`, bo łapie też
   małe okna):
   ```scss
   @media (max-height: 480px) {
     :root {
       --hero-extended-h: 140px;
       --hero-compact-h: 72px;
     }
   }
   ```
2. Zweryfikować `page-layout` (mini-bar, sentinel) przy skróconym hero.
3. Czat/mapa w landscape z otwartą klawiaturą: sprawdzić wraz z taskiem 02 (`dvh`), czy pole input
   pozostaje widoczne.

## Kryteria akceptacji

- [ ] W landscape telefonu hero nie zasłania treści; CTA/formularz dostępne bez nadmiernego scrolla.
- [ ] Mini-bar i przewijanie hero działają po skróceniu.
- [ ] Brak regresji w portrait.

## Ryzyka / rollback

- Niskie. Rollback: usunięcie media query. Zmiany w `styles.scss`.
