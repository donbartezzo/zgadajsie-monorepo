# RWD 09 — Container queries dla komponentów reużywalnych

| Pole            | Wartość                                 |
| --------------- | --------------------------------------- |
| Priorytet       | Niski                                   |
| Ryzyko regresji | Średnie                                 |
| Zależności      | brak (niezależny; fundament pod Fazę D) |
| Sekcje audytu   | 18 (oraz checklist 6, 10)               |

## Cel

Umożliwić komponentom adaptację do realnie dostępnej szerokości kontenera, a nie tylko do viewportu.
To fundament pod późniejsze gridy/side panele (Faza D), gdzie ta sama karta występuje w różnych
szerokościach.

## Stan obecny

- Brak `@container` / Tailwind `@container` w projekcie. Komponenty reagują tylko na breakpointy viewportu.

## Zakres / kroki

1. Wytypować komponenty kandydujące: `event-card`, `participant-slot`/grid slotów, kafelki profilu,
   `event-manage-card`.
2. Włączyć container queries (Tailwind v4 wspiera natywnie; oznaczyć kontener `@container` i używać
   wariantów `@sm:`/`@md:` na elemencie dziecka — zweryfikować konfigurację w projekcie).
3. Przerobić układ wewnętrzny tych komponentów tak, by zależał od szerokości kontenera (np. karta
   wąska → pionowo, szeroka → poziomo).
4. Zachować zgodność ze styleguide (semantyczne klasy kolorów, brak CSS vars w szablonach).

## Kryteria akceptacji

- [ ] `event-card` poprawnie układa się i w wąskim gridzie (~350px), i w pełnej szerokości.
- [ ] Brak regresji obecnego wyglądu na mobile (pełna szerokość).
- [ ] Komponenty nie zależą już wyłącznie od breakpointów viewportu tam, gdzie liczy się kontener.

## Ryzyka / rollback

- Średnie: zmiana układu wewnętrznego komponentów współdzielonych. Robić per komponent z weryfikacją
  we wszystkich miejscach użycia.
- Rollback: powrót do klas opartych na viewport per komponent.
