# RWD 13 — Desktopowe modale zamiast bottom sheetów

| Pole            | Wartość                                           |
| --------------- | ------------------------------------------------- |
| Priorytet       | Średni                                            |
| Ryzyko regresji | **Wysokie**                                       |
| Zależności      | częściowo 07 (zachowanie overlay), opcjonalnie 11 |
| Sekcje audytu   | 2.1, 11.1                                         |

## Cel

Na desktopie wyświetlać overlaye jako wyśrodkowane modale zamiast bottom sheetów (które są naturalne
tylko na mobile). Dotyczy: navigation, share, city options, auth, join rules/confirm, organizer
actions, enrollment details, cancel payment, notifications, contact, discipline profile.

## Stan obecny

- `shared/overlay/ui/bottom-overlays/bottom-overlay.component.ts` — jeden wzorzec (slide-up od dołu,
  pełna szerokość kontenera, blokada scrolla body).
- Auth (11.1): logowanie w bottom sheet — wąskie i niskie na desktopie.

## Zakres / kroki

1. Wprowadzić tryb prezentacji modala dla `lg:` (centered, `max-w-md/lg`, overlay tła) — albo nowy
   `DesktopModalComponent`, albo wariant w istniejącym komponencie sterowany breakpointem.
2. `BottomOverlayComponent` używać tylko dla `< lg`; dla `lg+` modal centered.
3. Auth: na desktopie centered modal (`max-w-sm/md`) lub redirect do `/auth/login`.
4. Współgrać z taskiem 07 (kompensacja scrollbara, blokada scrolla — na desktopie centered modal może
   nie blokować scrolla tła lub blokować z kompensacją).
5. Zachować jeden kontrakt API overlayów (`BottomOverlaysService` / `OverlayType`).

## Kryteria akceptacji

- [ ] Desktop: overlaye jako centered modale; mobile: bez zmian (bottom sheet).
- [ ] Auth wygodny na desktopie.
- [ ] Wszystkie typy overlayów przetestowane w obu trybach.
- [ ] Brak shiftu layoutu przy otwarciu (task 07).

## Ryzyka / rollback

- Wysokie: jeden współdzielony mechanizm dla wszystkich overlayów. Regresja dotknęłaby wszystkich.
- Rollback: wymusić bottom sheet na wszystkich szerokościach.
