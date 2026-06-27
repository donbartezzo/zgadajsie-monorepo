# RWD 07 — Overlaye: kompensacja scrollbara + max-height bottom sheet

| Pole            | Wartość           |
| --------------- | ----------------- |
| Priorytet       | Średni            |
| Ryzyko regresji | Średnie           |
| Zależności      | brak (niezależny) |
| Sekcje audytu   | 8.3, 17.2         |

## Cel

Usunąć skok layoutu przy otwieraniu overlayów (ukryty scrollbar) oraz uodpornić wysokość bottom
sheetów na zmianę orientacji / niski viewport.

## Stan obecny

- `shared/overlay/ui/bottom-overlays/bottom-overlay.component.ts` — przy otwarciu:
  `document.body.classList.add('overflow-hidden')` bez kompensacji szerokości scrollbara.
- Bottom sheet wysokość oparta na wartościach `vh` / animacja `animate-slide-up`.

## Zakres / kroki

1. **Kompensacja scrollbara:** przy blokadzie body dodać `padding-right` równy szerokości scrollbara
   (np. policzyć `window.innerWidth - document.documentElement.clientWidth` i ustawić jako CSS var),
   zdjąć przy zamknięciu. Na mobile zwykle 0 (overlay scrollbar), więc efekt głównie na desktopie.
2. **max-height bottom sheet:** użyć `max-height: 90dvh` (zamiast `vh`) + wewnętrzny scroll treści.
3. Przetestować rotację z otwartym overlayem — wysokość ma się przeliczać poprawnie.

## Kryteria akceptacji

- [ ] Otwarcie overlaya nie przesuwa treści tła (brak shiftu o szerokość scrollbara).
- [ ] Bottom sheet z dużą zawartością scrolluje wewnętrznie, nie wychodzi poza ekran.
- [ ] Rotacja z otwartym overlayem nie psuje wysokości.

## Ryzyka / rollback

- Średnie: zmiana współdzielonego komponentu overlay → dotyczy wszystkich bottom sheetów.
  Testować reprezentatywny zestaw (navigation, share, join-confirm, notifications).
- Rollback: usunięcie kompensacji + powrót do poprzedniej wysokości.
