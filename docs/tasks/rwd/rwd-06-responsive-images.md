# RWD 06 — Responsywne obrazy (srcset / sizes)

| Pole            | Wartość                                              |
| --------------- | ---------------------------------------------------- |
| Priorytet       | Średni                                               |
| Ryzyko regresji | Niskie                                               |
| Zależności      | brak (niezależny; opcjonalnie backend dla wariantów) |
| Sekcje audytu   | 4.1, 6.1, 13.1, 13.2                                 |

## Cel

Ograniczyć transfer i poprawić LCP/CLS przez responsywne obrazy. Obecnie zawsze ładowany jest jeden
rozmiar cover (700×250), nawet gdy karta jest mała.

## Stan obecny

- `event-card.component.ts` — `<img width="700" height="250" loading="lazy">`, brak `srcset`/`sizes`.
- `page-layout.component.html` (extended hero) — `<img width="700" height="250" fetchpriority="high">`,
  brak `srcset`.
- Home page — `<picture>` z webp, ale bez wielu rozmiarów.

## Zakres / kroki

1. **Decyzja o wariantach rozmiarów:** czy backend generuje warianty (np. 400w/700w/1000w) cover image,
   czy korzystamy z parametrów URL / CDN. (Cover images: `sharp` 700×250 — patrz pamięć o galerii.)
2. Dodać `srcset` + `sizes` do:
   - `event-card` (sizes ~ `(min-width: 768px) 350px, 100vw` po wprowadzeniu gridu — task 14)
   - extended hero w `page-layout`
3. Home background — dodać warianty rozmiarów w `<picture>` + ustawić `width`/`height` lub
   `aspect-ratio` (CLS).
4. Zachować `loading="lazy"` dla list, `fetchpriority="high"` dla hero/LCP.

## Kryteria akceptacji

- [ ] Karty w gridzie ładują mniejszy wariant obrazu (Network < pełny 700w).
- [ ] CLS dla home/hero/kart OK (zdefiniowane wymiary / aspect-ratio).
- [ ] Brak rozmycia na ekranach hi-dpi.

## Ryzyka / rollback

- Niskie po stronie FE. Jeśli wymaga generowania wariantów w backendzie → osobny pod-zakres
  (rozważyć przy `CoverImagesService` / `sharp`).
- Rollback: usunięcie `srcset`/`sizes`, powrót do pojedynczego `src`.
