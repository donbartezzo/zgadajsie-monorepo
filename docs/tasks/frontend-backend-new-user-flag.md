# Frontend-Backend New User Flag Refactor

## Problem

Obecnie frontend próbuje wykrywaæ czy u¿ytkownik jest "nowy" (pierwszy raz z tym organizatorem) na podstawie lokalnych danych:

```typescript
// frontend/src/app/features/event/overlays/join-rules-overlay.component.ts
readonly isNewUser = computed(() => {
  const uid = this.currentUserId();
  const e = this.event();
  if (!uid || !e) return false;
  
  // Check if user has any participations with this organizer
  return !this.participants().some(
    (p) => (!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUserId === uid),
  );
});
```

## Problemy z obecnym podej¶ciem

1. **Niezgodno¶æ frontend-backend** - frontend zgaduje na podstawie lokalnych danych
2. **Niezawodno¶æ** - mo¿e byæ b³êdne jesli frontend nie ma pe³nych danych
3. **Duplikacja logiki** - to samo sprawdzanie jest w backend (`isNewUser()`) i frontend
4. **Potencjalne b³êdy synchronizacji** - ró¿ne stanów danych

## Lepsze rozwi±zanie

Backend powinien zwracaæ flagê `isNewUser` bezpo¶rednio w odpowiedzi API.

### Opcja 1: W odpowiedzi wydarzenia

**Endpoint:** `GET /events/:id`

```typescript
{
  currentUserAccess: {
    isParticipant: boolean,
    isOrganizer: boolean,
    participationStatus?: string,
    isNewUser: boolean  // <- nowa flaga
  }
}
```

### Opcja 2: Dedykowany endpoint

**Endpoint:** `GET /events/:id/join-status`

```typescript
{
  canJoin: boolean,
  isNewUser: boolean,
  isBanned: boolean,
  availableRoles: [...],
  waitingReason?: string
}
```

## Zmiany do wprowadzenia

### Backend

1. **EventsService.findOne()** - dodaæ `isNewUser` do `currentUserAccess`
2. **U¿yæ istniej±cej logiki** - `EnrollmentEligibilityService.isNewUser()`
3. **Obs³uga braku JWT** - zwróæ `null` gdy nie zalogowany

```typescript
// backend/src/modules/events/events.service.ts
const currentUserAccess = userId ? {
  isParticipant: !!existingParticipation,
  isOrganizer: event.organizerId === userId,
  participationStatus: existingParticipation?.status,
  isNewUser: await this.eligibility.isNewUser(userId, event.organizerId),
} : null;
```

### Frontend

1. **Usun±æ computed property** `isNewUser()` z `JoinRulesOverlayComponent`
2. **U¿yæ flagi z API** - `event()?.currentUserAccess?.isNewUser`
3. **Zaktualizowaæ typy** - dodaæ `isNewUser` do `CurrentUserAccess`

```typescript
// frontend/src/app/shared/types/event.interface.ts
export interface CurrentUserAccess {
  isParticipant: boolean;
  isOrganizer: boolean;
  participationStatus?: string;
  isNewUser?: boolean;  // <- nowe pole
}
```

## Korzy¶ci

1. **Single source of truth** - backend jest autorytatywnym ¼ród³em
2. **Niezawodno¶æ** - eliminuje b³êdy synchronizacji
3. **Uproszczenie frontend** - mniej logiki biznesowej w UI
4. **Spójno¶æ** - ta sama logika co w `ParticipationService.handleOpenEnrollmentJoin()`
5. **Przysz³o¶æ** - easy to extend with other flags (isBanned, canAddGuests, etc.)

## Implementacja priorytet

**Wysoki** - krytyczny dla poprawnego dzia³ania systemu zapisów
**Estymowany czas**: 2-3 godziny
**Zale¿no¶ci**: brak
**Ryzyko**: niskie (u¿ywa istniej±cej logiki backend)

## Testowanie

1. **Nowy u¿ytkownik** - powinien zobaczyæ warning o weryfikacji
2. **Istniej±cy u¿ytkownik** - nie powinien zobaczyæ warningu
3. **Organizator** - nie powinien zobaczyæ warningu
4. **Nie zalogowany** - brak `currentUserAccess`

## Related files

- `backend/src/modules/events/events.service.ts`
- `backend/src/modules/participation/enrollment-eligibility.service.ts`
- `frontend/src/app/shared/types/event.interface.ts`
- `frontend/src/app/features/event/overlays/join-rules-overlay.component.ts`
- `frontend/src/app/core/services/event.service.ts`
