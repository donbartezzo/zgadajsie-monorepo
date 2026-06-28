# RWD 12 — Nawigacja desktopowa (top bar + dropdown)

| Pole            | Wartość       |
| --------------- | ------------- |
| Priorytet       | Średni        |
| Ryzyko regresji | **Wysokie**   |
| Zależności      | 11 (shell)    |
| Sekcje audytu   | 1.3, 5.1, 5.2 |

## Cel

Na desktopie zastąpić wąski mobilny bottom-nav naturalną nawigacją górną (top bar) z menu użytkownika.
Bottom-nav pozostaje dla `< lg`.

## Stan obecny

- `layout/footer/bottom-nav.component.ts` — `fixed bottom-0 ... max-w-app` (wąski pasek na środku na desktopie).
- Nawigacja główna przez overlay (hamburger → bottom sheet). Brak top bara, sidebara, breadcrumbs.

## Zakres / kroki

1. Stworzyć `top-nav` widoczny od `lg:` (logo, miasto/dropdown, wydarzenia, kontakt, FAQ, avatar z
   dropdown menu).
2. Ukryć bottom-nav od `lg:` (`lg:hidden`), pokazać top-nav (`hidden lg:flex`).
3. Cookie consent (5.2): na desktopie full-width / wyśrodkowany box zamiast wąskiego paska; usunąć
   kolizję z bottom-nav.
4. Zsynchronizować akcje (miasto, udostępnij, powiadomienia z badge) między bottom-nav a top-nav
   (współdzielić serwisy: `CityContextService`, `NotificationService`, `BottomOverlaysService`).
5. Hover/dropdown tylko dla `[@media(hover:hover)]`.

## Kryteria akceptacji

- [ ] Desktop: top bar z pełną nawigacją; bottom-nav ukryty.
- [ ] Mobile/tablet: bottom-nav bez zmian.
- [ ] Badge powiadomień spójny między wariantami.
- [ ] Brak duplikacji logiki nawigacji.

## Ryzyka / rollback

- Wysokie: nawigacja to krytyczny element. Testować wszystkie akcje i stany (zalogowany/nie).
- Rollback: ukrycie top-nav, przywrócenie bottom-nav na wszystkich szerokościach.
