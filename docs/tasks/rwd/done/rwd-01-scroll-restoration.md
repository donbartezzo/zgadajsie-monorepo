# RWD 01 — Scroll position restoration

| Pole            | Wartość           |
| --------------- | ----------------- |
| Priorytet       | Wysoki            |
| Ryzyko regresji | Niskie            |
| Zależności      | brak (niezależny) |
| Sekcje audytu   | 8.2, 17.1         |

## Cel

Przy nawigacji lista wydarzeń → szczegóły → powrót przeglądarka ma przywracać pozycję scrolla.
Obecnie powrót resetuje listę na górę — szczególnie uciążliwe na mobile przy długiej liście.

## Stan obecny

- `frontend/src/app/app.config.ts` — `provideRouter(...)` bez `withInMemoryScrolling`.

## Zakres / kroki

1. W `app.config.ts` dodać do `provideRouter`:
   ```ts
   withInMemoryScrolling({
     scrollPositionRestoration: 'enabled',
     anchorScrolling: 'enabled',
   });
   ```
2. Zweryfikować, że ekrany `fullscreenContent` (mapa, czat) nie regresują — mają własny scroll
   wewnętrzny, restoration działa na poziomie dokumentu.
3. Dla list z własnym kontenerem scrolla (jeśli istnieją) rozważyć ręczne zapisywanie pozycji
   (tylko jeśli okaże się potrzebne — najpierw sprawdzić domyślne zachowanie).

## Kryteria akceptacji

- [ ] Powrót z `/w/:citySlug/:id` do `/w/:citySlug` zachowuje pozycję scrolla listy.
- [ ] Anchor links (`#fragment`) działają.
- [ ] Brak regresji na ekranach fullscreen.

## Ryzyka / rollback

- Rollback: usunięcie `withInMemoryScrolling`. Zmiana izolowana do jednego pliku.
