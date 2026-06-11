// Poziom „open" oznacza wydarzenie otwarte, a nie realny poziom uczestnika —
// jest zabroniony jako poziom w profilu dyscypliny (uczestnika i gościa).
// Decyzja: blacklista (!= 'open'), patrz docs/tasks/implementacja_profilu_gracza.md (sekcja 9).
export const FORBIDDEN_PARTICIPANT_LEVEL_SLUG = 'open';
