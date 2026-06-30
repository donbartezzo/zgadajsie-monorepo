# RWD 19 — Czat: side panel na desktopie

| Pole            | Wartość                         |
| --------------- | ------------------------------- |
| Priorytet       | Średni                          |
| Ryzyko regresji | **Wysokie**                     |
| Zależności      | 11 (shell); współgra z 02 (dvh) |
| Sekcje audytu   | 3.6                             |

## Cel

Na desktopie wykorzystać szerokość ekranu w czacie: stały panel boczny (lista uczestników dla czatu
grupowego / lista konwersacji dla czatu organizatora) obok okna rozmowy.

## Stan obecny

- `features/chat/pages/unified-chat/unified-chat.component.ts` — `fullscreenContent: true`, wypełnia
  viewport; brak podziału ekranu. Lista uczestników w overlayu (na żądanie).
- `host-chat.component.ts` — konwersacje organizatora.

## Zakres / kroki

1. Dla `lg:` — layout 2-kolumnowy:
   - lewa kolumna (~300px): lista uczestników (czat grupowy) / lista konwersacji (organizator)
   - prawa: okno czatu
2. Mobile/tablet: bez zmian (lista w overlayu, pełnoekranowy czat).
3. Zachować flex chain fullscreen (`flex flex-col flex-1 min-h-0`) i poprawność wysokości (dvh — task 02).
4. Zweryfikować pole input + klawiatura na mobile (task 05/02) — niezmienione.

## Kryteria akceptacji

- [ ] Desktop: side panel + czat widoczne jednocześnie.
- [ ] Mobile: dotychczasowe zachowanie (overlay + fullscreen czat).
- [ ] Brak podwójnego scrolla / ucięcia pola wiadomości.

## Ryzyka / rollback

- Wysokie: czat fullscreen z WebSocket, typing indicator, stany dostępu/ban. Dużo do regresji.
- Rollback: powrót do pojedynczej kolumny fullscreen (usunięcie `lg:` side panelu).
