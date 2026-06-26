# RWD 03 — Audyt tap targetów (≥ 44×44 px)

| Pole            | Wartość           |
| --------------- | ----------------- |
| Priorytet       | Średni            |
| Ryzyko regresji | Niskie            |
| Zależności      | brak (niezależny) |
| Sekcje audytu   | 16.5              |

## Cel

Zapewnić minimalny rozmiar obszaru dotykowego 44×44 px (Apple HIG / WCAG 2.5.5) dla wszystkich
elementów interaktywnych, zwłaszcza ikonowych akcji w gęstych listach.

## Stan obecny

- `app-button` z `iconOnly` używany w wielu listach.
- Drobne akcje inline: `×` zamykania alertów, badge'y akcji w wierszach powiadomień, akcje przy
  uczestnikach/slotach.

## Zakres / kroki

1. Przejść po komponentach z elementami dotykowymi i zmierzyć realny hit-area:
   - `bottom-nav.component.html`
   - `shared/ui/button/button.component.ts` (warianty `size`, `iconOnly`)
   - akcje w `notifications-page`, `event-participants`, sloty organizatora
   - przyciski zamykania w overlayach/alertach
2. Dla zbyt małych: powiększyć padding / dodać niewidoczny hit-area (`before:absolute before:inset-...`)
   bez zmiany wyglądu ikony.
3. Zapewnić min. odstęp między sąsiednimi targetami (unikać przypadkowych kliknięć).

## Kryteria akceptacji

- [ ] Wszystkie interaktywne ikony/akcje mają hit-area ≥ 44×44 px.
- [ ] Brak zmiany wizualnej layoutu (tylko hit-area).
- [ ] Weryfikacja na realnym telefonie w gęstych listach.

## Ryzyka / rollback

- Niskie. Zmiany czysto prezentacyjne (padding / pseudo-element). Rollback per komponent.
