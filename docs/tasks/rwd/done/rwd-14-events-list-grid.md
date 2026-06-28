# RWD 14 — Lista wydarzeń: responsywny grid

| Pole            | Wartość                       |
| --------------- | ----------------------------- |
| Priorytet       | Średni                        |
| Ryzyko regresji | Średnie                       |
| Zależności      | 11 (shell); współgra z 06, 09 |
| Sekcje audytu   | 3.1                           |

## Cel

Na tablecie/desktopie pokazać więcej wydarzeń naraz (grid 2–3 kolumny) zamiast jednej długiej kolumny.

## Stan obecny

- `features/events/pages/events/events.component.html` — `flex flex-col gap-3`, karty zawsze 100% szerokości.

## Zakres / kroki

1. Zmienić kontener listy na grid: `grid gap-3 md:grid-cols-2 lg:grid-cols-3` (po poszerzeniu shella — task 11).
2. Dla `lg:` rozważyć lewy sidebar z filtrami (opcjonalnie, osobny pod-zakres).
3. Współgrać z taskiem 06 (`srcset`/`sizes` — `sizes` zależne od liczby kolumn) i 09 (container queries
   w `event-card`).
4. Zweryfikować `event-card` w wąskiej kolumnie gridu (~350px).

## Kryteria akceptacji

- [ ] Tablet: 2 kolumny; desktop: 3 kolumny; mobile: 1 kolumna.
- [ ] Karty wyglądają poprawnie w każdej szerokości.
- [ ] Brak poziomego scrolla.

## Ryzyka / rollback

- Średnie. Rollback: powrót do `flex flex-col`. Zmiana skupiona w szablonie listy + ewentualnie karcie.
