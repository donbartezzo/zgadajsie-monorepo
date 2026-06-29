# RWD 16 — Formularz wydarzenia: layout desktopowy

| Pole            | Wartość    |
| --------------- | ---------- |
| Priorytet       | Niski      |
| Ryzyko regresji | Średnie    |
| Zależności      | 11 (shell) |
| Sekcje audytu   | 3.3, 11.7  |

## Cel

Lepiej wykorzystać przestrzeń desktopu w formularzu tworzenia/edycji wydarzenia oraz w formularzu
edycji serii (11.7), zamiast jednej długiej kolumny.

## Stan obecny

- `features/events/pages/event-form/event-form.component.ts` (inline template) — `grid-cols-2` dla
  dyscyplina/poziom/obiekt; mapa `h-[250px]`.
- Series edit form (`series-details`) — pola konfiguracji w jednej kolumnie.

## Zakres / kroki

1. `md:` — `grid-cols-3` dla pól dyscyplina/poziom/obiekt.
2. `lg:` — układ 2-kolumnowy: lewa (podstawowe dane), prawa (zaawansowane: zasady, płatności, mapa).
3. Mapa `md:h-[350px] lg:h-[400px]`.
4. Series edit form: `md:grid-cols-2` dla pól konfiguracji (target occupancy, cleanup, min free slots).
5. Współgrać z taskiem 05 (autocomplete/inputmode — niezależnie, ale w tych samych plikach).

## Kryteria akceptacji

- [ ] Desktop: formularz zwarty, mniej scrolla.
- [ ] Mobile: bez zmian.
- [ ] Walidacja i submit działają we wszystkich szerokościach.

## Ryzyka / rollback

- Średnie: formularz inline template, dużo pól i walidacji. Rozważyć wydzielenie templateUrl (zgodnie
  z konwencją złożonych template — patrz styleguide).
- Rollback: powrót do obecnego gridu.
