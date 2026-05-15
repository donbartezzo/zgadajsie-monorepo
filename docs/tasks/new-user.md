## Zadanie: Refaktoryzacja statusu "Nowy uczestnik" → "Standardowy"

### Cel

Zmień nazwę i semantykę statusu "Nowy uczestnik" na "Standardowy", aby lepiej oddawać rzeczywisty stan (użytkownik nie jest zaufany, ale nie musi być "nowy"). Status "Zaufany" pozostaje bez zmian.

### Nowe definicje statusów

**Zaufany:**

- Label: "Zaufany"
- Opis: "Uczestnictwo jest automatycznie zatwierdzane"
- Icon: `shield-check`
- Color: `success`
- (bez zmian)

**Standardowy:**

- Label: "Standardowy"
- Opis: "Uczestnictwo wymaga zatwierdzenia organizatora"
- Icon: `user` lub `help-circle`
- Color: `neutral` lub `info`
- (zastępuje "Nowy uczestnik")

### Zmiany do wprowadzenia

#### Backend

1. **Zmień waitingReason:**
   - `waitingReason='NEW_USER'` → `waitingReason='STANDARD'`
2. **Zaktualizuj typy:**
   - `WaitingReason` type w `participation.interface.ts`
   - [createWaiting()](cci:1://file:///home/bk/projects/priv/zgadajsie-monorepo/backend/src/modules/enrollment/enrollment.service.ts:742:2-795:3) w [enrollment.service.ts](cci:7://file:///home/bk/projects/priv/zgadajsie-monorepo/backend/src/modules/enrollment/enrollment.service.ts:0:0-0:0)
   - Wszystkie miejsca gdzie używany jest `'NEW_USER'` jako string literal

3. **Opcjonalnie:**
   - Zmień nazwę [isNewUser()](cci:1://file:///home/bk/projects/priv/zgadajsie-monorepo/backend/src/modules/enrollment/enrollment-eligibility.service.ts:7:2-15:3) → `isStandard()` w [enrollment-eligibility.service.ts](cci:7://file:///home/bk/projects/priv/zgadajsie-monorepo/backend/src/modules/enrollment/enrollment-eligibility.service.ts:0:0-0:0)
   - Zmień nazwę `isHostNew` → `isHostStandard` w [enrollment.service.ts](cci:7://file:///home/bk/projects/priv/zgadajsie-monorepo/backend/src/modules/enrollment/enrollment.service.ts:0:0-0:0)

#### Frontend

1. **Zmień status indicator:**
   - [status-indicators.config.ts](cci:7://file:///home/bk/projects/priv/zgadajsie-monorepo/libs/src/lib/config/status-indicators.config.ts:0:0-0:0): dodaj `standard`, usuń `new_user_pending`
   - Label: "Standardowy"
   - Description: "Uczestnictwo wymaga zatwierdzenia organizatora"
   - Icon: `user`
   - Color: `neutral`
   - RequiresAction: true

2. **Zaktualizuj komponenty:**
   - [enrollment-grid-item.component.ts](cci:7://file:///home/bk/projects/priv/zgadajsie-monorepo/frontend/src/app/shared/enrollment/ui/enrollment-grid/enrollment-grid-item/enrollment-grid-item.component.ts:0:0-0:0): `isNewUserPending` → `isStandard`
   - `user-profile-card.component.ts`: sprawdzenie `waitingReason === 'STANDARD'`
   - Wszystkie miejsca gdzie używany jest `'new_user_pending'`

3. **Zmień komunikaty:**
   - `waiting-reason-messages.util.ts`: zaktualizuj toast message dla `STANDARD`
   - [trust-prompt.service.ts](cci:7://file:///home/bk/projects/priv/zgadajsie-monorepo/frontend/src/app/shared/services/trust-prompt.service.ts:0:0-0:0): zaktualizuj komunikaty o "standardowym" statusie
   - Wszystkie teksty UI które wspominają "nowy uczestnik"

4. **Zaktualizuj typy:**
   - `WaitingReason` type w `participation.interface.ts`
   - Wszystkie miejsca gdzie używany jest `'NEW_USER'` jako string literal

#### Dokumentacja

1. Zaktualizuj `docs/design-tokens.md` jeśli zawiera opis statusów
2. Zaktualizuj dokumentację w `docs/tasks/` jeśli istnieją zadania związane z "nowym uczestnikiem"

### Testy

1. Zaktualizuj wszystkie testy które używają `waitingReason='NEW_USER'` → `waitingReason='STANDARD'`
2. Zaktualizuj testy które mockują [isNewUser()](cci:1://file:///home/bk/projects/priv/zgadajsie-monorepo/backend/src/modules/enrollment/enrollment-eligibility.service.ts:7:2-15:3) → `isStandard()` (jeśli zmienisz nazwę)
3. Upewnij się że wszystkie testy przechodzą

### Weryfikacja

1. Uruchom `pnpm test` (unit tests)
2. Uruchom `pnpm lint:frontend` i `pnpm lint:backend`
3. Sprawdź w UI że status "Standardowy" wyświetla się poprawnie
4. Sprawdź że status "Zaufany" nadal działa poprawnie

### Priorytety

1. Backend (zmiana waitingReason)
2. Frontend (status indicators, komponenty)
3. Komunikaty UI
4. Testy
5. Dokumentacja
