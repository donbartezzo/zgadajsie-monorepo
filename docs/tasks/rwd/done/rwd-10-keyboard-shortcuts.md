# RWD 10 — Skróty klawiszowe i hover states (desktop)

| Pole            | Wartość                         |
| --------------- | ------------------------------- |
| Priorytet       | Niski                           |
| Ryzyko regresji | Niskie                          |
| Zależności      | brak (niezależny)               |
| Sekcje audytu   | 5.1, checklist „Funkcjonalność” |

## Cel

Dodać ergonomię desktopową niezależną od shella: skróty klawiszowe i spójne hover states. Można robić
przed adaptacją layoutu desktop.

## Stan obecny

- Brak globalnych skrótów (`/` wyszukiwanie, `Esc` zamykanie overlayów — częściowo może istnieć).
- Hover states obecne lokalnie (`[@media(hover:hover)]` w page-layout) — brak spójnej konwencji.

## Zakres / kroki

1. `Esc` zamyka aktywny overlay/bottom sheet (zweryfikować, czy już działa; jeśli nie — dodać w
   `BottomOverlaysService` / komponencie overlay).
2. Rozważyć `/` → fokus wyszukiwarki (jeśli istnieje), nawigacja strzałkami w listach (opcjonalnie).
3. Ujednolicić hover states tylko dla urządzeń z hoverem (`[@media(hover:hover)]`), by nie psuć
   zachowania na touch.

## Kryteria akceptacji

- [ ] `Esc` zamyka overlaye.
- [ ] Hover states tylko na urządzeniach z hoverem (brak „lepkiego” hover na touch).
- [ ] Skróty nie kolidują z polami formularzy.

## Ryzyka / rollback

- Niskie. Rollback: usunięcie listenerów skrótów.
