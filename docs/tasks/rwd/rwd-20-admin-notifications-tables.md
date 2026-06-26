# RWD 20 — Tabele/listy na desktopie: admin + powiadomienia

| Pole            | Wartość    |
| --------------- | ---------- |
| Priorytet       | Niski      |
| Ryzyko regresji | Średnie    |
| Zależności      | 11 (shell) |
| Sekcje audytu   | 3.7, 11.4  |

## Cel

Na desktopie listy w panelu admina i lista powiadomień mają korzystać z układu tabelarycznego /
dwukolumnowego zamiast wąskich stacked cards. Mobile zachowuje karty.

## Stan obecny

- `features/admin/pages/admin-dashboard` — statystyki `grid-cols-2`, linki pionowo.
- `features/admin/pages/admin-users` — użytkownicy jako karty (`space-y-2`).
- `features/notifications/pages/notifications/notifications-page.component.html` — lista `space-y-2`,
  akcje ukryte w wierszach; `sm:flex-row` dla nagłówka.

## Zakres / kroki

1. **Admin users:** `md:` — tabela z nagłówkami (sortowanie opcjonalnie); `sm:` — karty.
2. **Admin dashboard:** `md:` — statystyki w 4 kolumnach (ew. większe), grid 2×3/3×2 dla linków.
3. **Notifications:** `md:` — tabela (data, typ, tytuł, akcje) z widocznymi akcjami; `lg:` — opcjonalny
   podział lista + szczegóły wybranego powiadomienia.
4. Mobile: karty/lista jak dziś.

## Kryteria akceptacji

- [ ] Desktop: tabele/grid; mobile: karty.
- [ ] Akcje (oznacz przeczytane, usuń, akcje admina) działają w obu układach.
- [ ] Brak poziomego scrolla (tabela z poziomym scrollem tylko jeśli konieczne, w kontenerze).

## Ryzyka / rollback

- Średnie. Rollback: powrót do kart (usunięcie wariantów `md:`/`lg:`).
