# RWD 15 — Szczegóły wydarzenia: layout side-by-side (desktop)

| Pole            | Wartość     |
| --------------- | ----------- |
| Priorytet       | Średni      |
| Ryzyko regresji | **Wysokie** |
| Zależności      | 11 (shell)  |
| Sekcje audytu   | 3.2         |

## Cel

Skrócić bardzo długą stronę szczegółów wydarzenia na desktopie przez układ 2-kolumnowy ze sticky
panelem akcji.

## Stan obecny

- `features/event/pages/event-detail/event-detail.component.html` — wszystko w jednej kolumnie
  (info, uczestnicy, opis, zasady, udogodnienia, countdown, czat, organizator).
- Mapa `h-[200px]`; countdown `grid grid-cols-4` `text-3xl`.

## Zakres / kroki

1. Dla `lg:` ułożyć w 2 kolumny:
   - lewa (2/3): info, opis, zasady, mapa
   - prawa (1/3): sticky card z CTA (Dołącz), lista uczestników, czat (link), info o organizatorze
2. `md:` — powiększyć mapę (`md:h-[250px]`), countdown (`md:text-4xl`).
3. Zweryfikować integrację z `page-layout` (hero extended) i sticky elementami.
4. Mobile: bez zmian (stacked).

## Kryteria akceptacji

- [ ] Desktop: 2 kolumny, sticky panel akcji, krótszy scroll.
- [ ] Mobile/tablet portrait: stacked jak dziś.
- [ ] CTA „Dołącz” zawsze dostępne (sticky na desktopie, fixed na mobile).

## Ryzyka / rollback

- Wysokie: złożona strona z wieloma sekcjami i stanami (uczestnik/organizator/cykl życia). Testować
  wszystkie warianty statusu.
- Rollback: powrót do jednej kolumny (usunięcie `lg:` gridu).
