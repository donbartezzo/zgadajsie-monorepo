# RWD 08 — Płynna typografia (clamp / skala desktop)

| Pole            | Wartość                           |
| --------------- | --------------------------------- |
| Priorytet       | Niski                             |
| Ryzyko regresji | Średnie (wpływ wizualny globalny) |
| Zależności      | brak (niezależny)                 |
| Sekcje audytu   | 7.1                               |

## Cel

Utrzymać czytelność i proporcje typografii na szerokich ekranach. Obecnie nagłówki i tekst mają
stałe rozmiary (`text-xl`, `text-sm` …) bez płynnego skalowania.

## Stan obecny

- Nagłówki: `text-xl/2xl/3xl`; body: `text-sm/xs`; brak `clamp()`.
- Brak globalnego skalowania `html { font-size }` dla większych ekranów.

## Zakres / kroki

1. Zdecydować strategię (zgodnie ze styleguide — TYLKO semantyczne klasy kolorów; tu chodzi o rozmiar):
   - opcja A: globalne `@media (min-width: 1024px) { html { font-size: 18px; } }` (proste, wpływa na `rem`)
   - opcja B: `clamp()` dla kluczowych nagłówków stron
2. Zachować limit długości linii treści (~60–80 znaków, `max-w-[70ch]`) dla bloków tekstu (opisy,
   strony statyczne) — ważne po poszerzeniu kontenera (task 11).
3. Zweryfikować, czy skalowanie nie psuje komponentów opartych na px (ikony, bottom-nav).

## Kryteria akceptacji

- [ ] Na desktopie nagłówki/tekst są proporcjonalne, nie „mikroskopijne”.
- [ ] Bloki tekstu nie przekraczają ~80 znaków w linii.
- [ ] Brak regresji na mobile.

## Ryzyka / rollback

- Średnie: zmiana bazowego `font-size` wpływa na cały layout oparty na `rem`. Preferuj opcję B
  (punktowy `clamp`) jeśli ryzyko globalne zbyt duże.
- Rollback: usunięcie media query / `clamp`.
