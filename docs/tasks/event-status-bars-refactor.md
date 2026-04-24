# Refaktor: event status bars — podział na event bar + participation bar

## Kontekst

Obecne status bary (inline + sticky) obsługują jednocześnie status eventu, status uczestnictwa i bar organizatora w jednym computed `notificationBars`. Po refaktorze:

1. **Event Status Bar** — zawsze wyświetlany, oparty na `EventLifecycleStatus` (UPCOMING / ONGOING / ENDED / CANCELLED). Zawiera help icon otwierający `enrollmentDetails` overlay + opcjonalny action button (np. "Zapisz się").
2. **Participation Status Bar** — wyświetlany warunkowo gdy `currentUserParticipation !== null` (w tym WITHDRAWN/REJECTED). Oparty na `ParticipationStatusConfig`. Zawiera action button "Szczegóły" otwierający participation overlay (bez help icon).
3. **Organizer Bar** — usunięty. Trigger do `organizerActions` overlay przeniesiony do sekcji organizatora w event-detail.

## Decyzje

| Obszar                               | Decyzja                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Nazewnictwo statusów                 | Zgodne z `EventLifecycleStatus`: UPCOMING, ONGOING, ENDED, CANCELLED                                      |
| Help icon                            | Tylko na event status barze (zawsze)                                                                      |
| Action button na event barze         | Opcjonalny — "Zapisz się" gdy `canJoin`, brak dla ENDED/ONGOING/CANCELLED                                 |
| Action button na participation barze | Zawsze — "Szczegóły" (lub "Potwierdź" dla APPROVED)                                                       |
| Info button hardcode                 | Usunięty z `EventStatusBarItemComponent` — zastąpiony generycznym `infoActionId`                          |
| Organizer trigger                    | Button "Zarządzaj" w `organizer-panel` w event-detail HTML                                                |
| Rename overlay                       | `join-confirm-overlay` → `my-participation-details-overlay`                                               |
| Konfiguracja statusów                | Wspólny `ParticipationStatusConfig` z `participation-status.util.ts` (dodane pole `color: SemanticColor`) |

---

## Checklist

### 1. `EventStatusBarConfig` — rozszerzenie interfejsu

- [x] Dodać pole `infoActionId?: string` do `EventStatusBarConfig` w `event-status-bar-item.component.ts`
- [x] Usunąć `showInfoButton?: boolean` (zastąpione przez `infoActionId`)

### 2. `EventStatusBarItemComponent` — generyczny info action

- [x] Usunąć inject `BottomOverlaysService`
- [x] Usunąć metodę `openInfo()` z hardcoded `overlays.open('enrollmentDetails')`
- [x] Dodać output `infoAction` emitujący `bar.infoActionId`
- [x] W szablonie: warunek `@if (_bar.infoActionId)` zamiast `@if (_bar.showInfoButton)`
- [x] Help icon button emituje `infoAction.emit(_bar.infoActionId)` zamiast `openInfo()`

### 3. `EventStatusBarStickyComponent` — propagacja info action

- [x] Dodać output `infoAction` i propagować z `EventStatusBarItemComponent`

### 4. `EventStatusBarsInlineComponent` — propagacja info action

- [x] Dodać output `infoAction` i propagować z child components (inline items + sticky)

### 5. `ParticipationStatusConfig` — dodanie pola `color`

- [x] Dodać pole `color: SemanticColor` do interfejsu `ParticipationStatusConfig`
- [x] Ustawić kolor w każdym statusie: PENDING→warning, APPROVED→info, CONFIRMED→success, WITHDRAWN→neutral, REJECTED→danger
- [x] Zaktualizować `DEFAULT_CONFIG` z kolorem
- [x] Zaktualizować testy `participation-status.util.spec.ts`

### 6. `event-area.service.ts` — przebudowa `notificationBars`

- [x] Usunąć blok organizer bar z `notificationBars` computed
- [x] Refaktorować event status bar: dodać `infoActionId: 'enrollmentDetails'`, usunąć `showInfoButton`
- [x] Dodać participation status bar (warunkowo, gdy `currentUserParticipation() !== null`)
- [x] Usunąć `resolveStatusBarContent()` i `resolveStatusBarActionButton()` (logika przeniesiona)

### 7. `event-area.service.ts` — przebudowa `handleNotificationBarAction`

- [x] Usunąć obsługę `barId === 'organizer'`
- [x] Dodać obsługę `barId === 'participation'` → `openJoinConfirmOverlay()`
- [x] `barId === 'status'` → `openJoinSheet()` (bez zmian)

### 8. `event-area.service.ts` — nowa metoda obsługi info action

- [x] Dodać `handleInfoAction(actionId: string)`

### 9. `event-detail.component.html` — propagacja info action

- [x] Dodać binding `(infoAction)="eventArea.handleInfoAction($event)"`

### 10. `event-detail.component.html` — button organizatora

- [x] W sekcji `data-testid="organizer-panel"` dodać button "Zarządzaj" otwierający `organizerActions`

### 11. Rename: `join-confirm-overlay` → `my-participation-details-overlay`

- [x] Zmienić nazwę pliku
- [x] Zmienić selektor na `app-my-participation-details-overlay`
- [x] Zmienić nazwę klasy na `MyParticipationDetailsOverlayComponent`
- [x] Zaktualizować import i selektor w `bottom-overlays.component.html`
- [x] Zaktualizować import w `bottom-overlays.component.ts`

### 12. Design system page

- [x] Zaktualizowano `/dev/design-system` — usunięto organizer bar, dodano przykłady participation barów, zamieniono `showInfoButton` na `infoActionId`

### 13. Testy

- [x] Zaktualizować `event-area.service.spec.ts` — bez zmian (nie testował organizer bar bezpośrednio)
- [x] Zaktualizować `event-detail.component.spec.ts` — dodano `handleInfoAction` do mocka
- [x] Zweryfikować kompilację (`ng build`) — OK
- [x] Uruchomić testy frontendowe — 221 testów, wszystkie przechodzą

---

## Kolejność implementacji

1. Rozszerzenie interfejsów (EventStatusBarConfig, ParticipationStatusConfig)
2. EventStatusBarItemComponent — generyczny info action
3. Propagacja w sticky/inline
4. event-area.service.ts — przebudowa notificationBars + handlery
5. event-detail.component — bindingi + button organizatora
6. Rename overlay
7. Design system + testy + weryfikacja kompilacji
