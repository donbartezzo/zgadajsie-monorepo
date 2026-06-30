# RWD 18 — Profil użytkownika: grid + layout 2-kolumnowy

| Pole            | Wartość    |
| --------------- | ---------- |
| Priorytet       | Niski      |
| Ryzyko regresji | Średnie    |
| Zależności      | 11 (shell) |
| Sekcje audytu   | 3.5        |

## Cel

Lepiej zagospodarować profil na desktopie — kafelki w szerszym gridzie, formularz edycji obok karty
profilu.

## Stan obecny

- `features/user/pages/profile/profile.component.html` — `grid-cols-2` dla kafelków (Moje wydarzenia,
  Zestawienie, Cover images, Ustawienia, Uczestnictwa, Płatności, Vouchery). Formularz edycji full-width.

## Zakres / kroki

1. Kafelki: `md:grid-cols-3 lg:grid-cols-4`.
2. `lg:` — układ 2-kolumnowy: lewa (karta profilu + statystyki uczestnika), prawa (formularz edycji).
3. Avatar: rozważyć większy rozmiar na desktopie (patrz 12.2 — brak `2xl` w `user-avatar`; ew. dodać).
4. Mobile: bez zmian.

## Kryteria akceptacji

- [ ] Desktop: kafelki w 3–4 kolumnach, formularz obok karty profilu.
- [ ] Mobile: 2 kolumny kafelków jak dziś.
- [ ] Edycja profilu działa w obu układach.

## Ryzyka / rollback

- Średnie. Rollback: powrót do `grid-cols-2` + full-width formularz.
