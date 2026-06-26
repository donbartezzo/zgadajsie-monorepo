# RWD 05 — UX formularzy na mobile (autocomplete / inputmode / klawiatura)

| Pole            | Wartość           |
| --------------- | ----------------- |
| Priorytet       | Średni            |
| Ryzyko regresji | Niskie            |
| Zależności      | brak (niezależny) |
| Sekcje audytu   | 8.1, 11.2, 17.3   |

## Cel

Poprawić ergonomię formularzy na mobile: właściwa klawiatura ekranowa, autouzupełnianie, oraz
widoczność aktywnego pola po pojawieniu się klawiatury.

## Stan obecny

- Event-form: brak `autocomplete`, `inputmode`, `enterkeyhint`.
- `login-form.component.ts`: brak `autocomplete="email"` / `autocomplete="current-password"`,
  brak `inputmode="email"`.
- Brak gwarancji `scrollIntoView` dla pól niżej w długim formularzu / czacie.

## Zakres / kroki

1. **Atrybuty pól** (wszystkie formularze: login, register, contact, event-form, organizer-settings):
   - `autocomplete` (`email`, `current-password`, `new-password`, `name`, `tel`, `street-address`…)
   - `inputmode` (`numeric` dla kosztu / max uczestników, `email`, `tel`)
   - `enterkeyhint` (`next` / `done`)
2. **Fokus a klawiatura**: dla pól w długich formularzach dodać `scroll-margin` lub `scrollIntoView`
   przy focusie; w czacie zapewnić, że pole wiadomości pozostaje nad klawiaturą (współgra z dvh — task 02).
3. Zweryfikować typy pól (`type="email"`, `type="number"` vs `inputmode`).

## Kryteria akceptacji

- [ ] Pola liczbowe otwierają klawiaturę numeryczną.
- [ ] Logowanie/rejestracja podpowiadają zapisane dane (autofill).
- [ ] Aktywne pole jest widoczne po pojawieniu się klawiatury.
- [ ] `enterkeyhint` poprawnie steruje przyciskiem klawiatury.

## Ryzyka / rollback

- Niskie. Atrybuty HTML, brak zmian logiki. Rollback per pole/komponent.
