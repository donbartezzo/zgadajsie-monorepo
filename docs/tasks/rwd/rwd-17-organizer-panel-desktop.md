# RWD 17 — Panel organizatora: tabele + side panel + digest grid

| Pole            | Wartość     |
| --------------- | ----------- |
| Priorytet       | Średni      |
| Ryzyko regresji | **Wysokie** |
| Zależności      | 11 (shell)  |
| Sekcje audytu   | 3.4, 11.5   |

## Cel

Na desktopie panel zarządzania wydarzeniem i digest organizatora mają wykorzystywać przestrzeń:
tabele zamiast stacked cards, side panel akcji, grid sekcji.

## Stan obecny

- `features/organizer/pages/event-manage/event-manage.component.ts` — statystyki `grid-cols-3`, lista
  oczekujących pionowa (`space-y-2`), grid slotów.
- `features/organizer/pages/organizer-digest/organizer-digest.component.html` — wiele sekcji stacked,
  brak podsumowania/filtrów.

## Zakres / kroki

1. **event-manage:**
   - `md:` — lista oczekujących/uczestników jako tabela (imię, status, akcje).
   - `lg:` — side panel z szybkimi akcjami + główna treść.
   - Grid slotów: więcej slotów w rzędzie na szerszych ekranach (współgra z 09 container queries).
2. **organizer-digest:**
   - `md:` — pasek statystyk na górze (liczba wydarzeń, zgłoszenia, dochód).
   - `lg:` — grid 2-kolumnowy dla sekcji z kartami; sticky filter/sort bar.
3. Zachować pełną funkcjonalność akcji (approve/confirm/ban/lock slot itd.).

## Kryteria akceptacji

- [ ] Desktop: tabela zgłoszeń + side panel; mobile: karty jak dziś.
- [ ] Digest: statystyki + grid sekcji na desktopie.
- [ ] Wszystkie akcje organizatora działają w obu układach.

## Ryzyka / rollback

- Wysokie: kluczowy panel operacyjny z wieloma akcjami i stanami slotów/płatności. Dużo do
  przetestowania.
- Rollback: powrót do stacked cards (usunięcie `md:`/`lg:` wariantów).
