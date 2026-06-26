# RWD 11 — Strategia szerokości shella (700px → progresywna)

| Pole            | Wartość                                                          |
| --------------- | ---------------------------------------------------------------- |
| Priorytet       | Wysoki (fundament desktopu)                                      |
| Ryzyko regresji | **Wysokie** (zmiana globalna)                                    |
| Zależności      | brak, ale prerequisite dla tasków 12, 14, 15, 16, 17, 18, 19, 20 |
| Sekcje audytu   | 1.1, 1.2, 4.2                                                    |

## Cel

Zlikwidować root cause braku adaptacji desktop: sztywne `max-width: 700px` z breakpointem
`@media (min-width: 700px)`, który od 700px „zamyka” aplikację w wąskiej ramce na środku. Wprowadzić
progresywną szerokość kontenera, otwierającą drogę do layoutów wielokolumnowych.

> **To jest task wysokiego ryzyka — realizować po domknięciu Fazy A/B.** Dotyka praktycznie każdego
> widoku, bo zmienia globalny shell i wiele miejsc z `max-w-app`.

## Stan obecny

- `frontend/src/styles.scss:97` — `$app-max-width: 700px`, `--app-max-width`.
- `frontend/src/styles.scss:144` — `@media (min-width: $app-max-width)` włącza boxed look (max-width,
  border-radius, box-shadow, pattern tła) **od 700px**.
- `tailwind.config.js:34-36` — `maxWidth.app = var(--app-max-width)`; `max-w-app` używane w wielu
  komponentach (hero, back button, sticky, bottom-nav, cookie consent).

## Decyzje do podjęcia (przed implementacją)

1. **Docelowy model szerokości:**
   - opcja A: kilka progów (`md` → 800–900px treść, `lg` → pełny layout z marginesami)
   - opcja B: `clamp()` na szerokości treści + osobne strefy (sidebar/content/aside) dla `lg+`
2. **Co z boxed look (ramka + cień + pattern):** zostaje tylko dla wąskiego „tablet portrait”, czy
   znika na rzecz pełnego layoutu desktop? (rekomendacja: znika od `lg`, pełna szerokość z marginesami)
3. **Rola `max-w-app`:** czy zostaje jako wrapper treści wewnątrz szerszego shella, czy jest
   stopniowo zastępowane.

## Zakres / kroki

1. Wprowadzić nową skalę szerokości w `styles.scss` (np. zmienne per breakpoint lub `clamp`).
2. Przesunąć/zmienić breakpoint boxed look tak, by tablet (768–1023px) mógł korzystać z szerszej
   treści przed desktopowym layoutem.
3. Zweryfikować wszystkie miejsca z `max-w-app` (hero `fixed ... mx-auto max-w-app`, back button,
   sticky, bottom-nav, cookie consent) — czy mają być pełnej szerokości czy ograniczone.
4. Zapewnić, że fixed elementy (bottom-nav, back button, sticky CTA) wyrównują się do właściwej
   szerokości w nowym modelu (współgra z safe-area — task 02).
5. Ustalić maksymalną szerokość treści tekstowej (ultrawide) — patrz task 08 (`70ch`).

## Kryteria akceptacji

- [ ] Tablet (768–1024px) wykorzystuje szerszą treść (nie „telefon w ramce”).
- [ ] Desktop/ultrawide: brak mikroskopijnej kolumny 700px; treść tekstowa ograniczona sensownie.
- [ ] Brak poziomego scrolla w pełnym zakresie testowym (320 → 1920px).
- [ ] Fixed elementy (bottom-nav, back, sticky) poprawnie pozycjonowane we wszystkich szerokościach.
- [ ] Brak regresji mobile (≤ 700px wygląda jak dziś).

## Ryzyka / rollback

- **Wysokie.** Każdy widok może wyglądać inaczej. Wymaga przeglądu wszystkich stron i komponentów z
  `max-w-app`.
- Rekomendacja: wdrożenie za flagą / na osobnej gałęzi z pełnym przeglądem wizualnym (320/768/1024/1440/1920).
- Rollback: przywrócenie `$app-max-width: 700px` + breakpointu. Zmiany skupione w `styles.scss` +
  `tailwind.config.js`, ale konsumentów `max-w-app` jest wielu.
