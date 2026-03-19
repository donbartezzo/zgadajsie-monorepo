import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ProfileChange {
  type: 'user' | 'guest';
  userId?: string; // dla zmian profilu hosta
  participationId?: string; // dla zmian nazwy gościa
  changes: {
    displayName?: string;
    avatarUrl?: string | null;
  };
}

/**
 * Zastosowuje zmiany profilu do pojedynczego obiektu uczestnika.
 * Wymaga by obiekt posiadał pola id, userId oraz pole user.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyProfileChange<T extends { id?: string; userId?: string | null; user?: any }>(
  participant: T,
  change: ProfileChange,
): T {
  if (!participant.user) {
    return participant;
  }

  const matches = change.userId === participant.userId || change.participationId === participant.id;
  if (matches) {
    return {
      ...participant,
      user: { ...participant.user, ...change.changes },
    };
  }

  return participant;
}

/**
 * Zastosowuje zmiany profilu do tablicy uczestników.
 * Optymalizuje działanie zwracając oryginalną referencję tablicy jeśli nie zaszły żadne zmiany (przydatne przy sygnałach).
 */
export function applyProfileChangeToList<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { id?: string; userId?: string | null; user?: any },
>(participants: T[], change: ProfileChange): T[] {
  let hasChanges = false;
  const updated = participants.map((p) => {
    const nextP = applyProfileChange(p, change);
    if (nextP !== p) hasChanges = true;
    return nextP;
  });
  return hasChanges ? updated : participants;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileBroadcastService {
  private readonly changeSubject = new Subject<ProfileChange>();

  readonly changes$ = this.changeSubject.asObservable();

  notifyUserChange(
    userId: string,
    changes: { displayName?: string; avatarUrl?: string | null },
  ): void {
    this.changeSubject.next({
      type: 'user',
      userId,
      changes,
    });
  }

  notifyGuestChange(
    participationId: string,
    changes: { displayName?: string; avatarUrl?: string | null },
  ): void {
    this.changeSubject.next({
      type: 'guest',
      participationId,
      changes,
    });
  }
}
