import bcrypt from 'bcrypt';

/**
 * Salt rounds dla bcrypt - zalecane minimum 12 dla bezpiecznego hashowania
 */
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashuje haslo z uyciem bcrypt i sta liczba salt rounds
 * @param password Haslo do zahashowania
 * @returns Zahashowane haslo
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Porownuje haslo z zahashowanym haslem
 * @param password Haslo w plaintext
 * @param hash Zahashowane haslo
 * @returns True jesli hasla pasuja
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hashuje haslo dla seederow (mniejsza liczba salt rounds dla szybszego developmentu)
 * @param password Haslo do zahashowania
 * @param saltRows Liczba salt rounds (domyslnie 10 dla seederow)
 * @returns Zahashowane haslo
 */
export async function hashPasswordForSeed(password: string, saltRows = 10): Promise<string> {
  return bcrypt.hash(password, saltRows);
}
