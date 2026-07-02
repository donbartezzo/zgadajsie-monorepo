// Blokada scrolla tła pod overlaye/modale, bez skoku layoutu.
//
// Zamiast trzymać `scrollbar-gutter: stable` na stałe (co na krótkich stronach
// zostawia pusty pionowy pasek przy krawędzi), rezerwujemy gutter tylko na czas
// blokady — przez klasę `scroll-locked` na <html> (reguła w `styles.scss`).
// Licznik obsługuje zagnieżdżone overlaye: odblokowanie następuje dopiero po
// zamknięciu ostatniego.

let lockCount = 0;

export function lockBodyScroll(): void {
  lockCount += 1;
  if (lockCount === 1) {
    document.documentElement.classList.add('scroll-locked');
  }
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount === 0) {
    document.documentElement.classList.remove('scroll-locked');
  }
}
