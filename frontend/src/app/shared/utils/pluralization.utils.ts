export type PolishPluralKey = 'one' | 'few' | 'many';

export function getPolishPluralKey(n: number): PolishPluralKey {
  if (n === 1) return 'one';

  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'few';
  }

  return 'many';
}
