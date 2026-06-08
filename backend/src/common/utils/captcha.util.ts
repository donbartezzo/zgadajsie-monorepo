import { Logger } from '@nestjs/common';
import { TURNSTILE_SITEVERIFY_URL } from '@zgadajsie/shared';

/**
 * Wynik weryfikacji Turnstile:
 * - `valid` — Cloudflare potwierdził token,
 * - `invalid` — Cloudflare jednoznacznie odrzucił token (realnie zły/duplikat),
 * - `unverifiable` — nie udało się dokończyć weryfikacji (sieć/egress/HTTP); w trybie
 *   best-effort traktujemy to jak brak tokena i NIE blokujemy użytkownika.
 */
export type CaptchaOutcome = 'valid' | 'invalid' | 'unverifiable';

/**
 * Weryfikuje token Turnstile z Cloudflare.
 *
 * @param token - Token wygenerowany przez widget Turnstile
 * @param remoteIp - Adres IP użytkownika (opcjonalny dla Cloudflare, ale zalecany)
 * @param secret - Secret key z Cloudflare Dashboard
 * @param logger - Logger do logowania błędów i ostrzeżeń
 * @returns Wynik weryfikacji
 */
export async function verifyTurnstile(
  token: string,
  remoteIp: string,
  secret: string,
  logger: Logger,
): Promise<CaptchaOutcome> {
  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    if (!response.ok) {
      logger.warn(
        `Turnstile siteverify returned HTTP ${response.status} — treating as unverifiable`,
      );
      return 'unverifiable';
    }

    const result = (await response.json()) as {
      success: boolean;
      'error-codes'?: string[];
      hostname?: string;
    };

    if (result.success) {
      return 'valid';
    }

    logger.warn(
      `Turnstile verification rejected by Cloudflare: ` +
        `errorCodes=${JSON.stringify(result['error-codes'] ?? [])}, ` +
        `hostname=${result.hostname ?? 'n/a'}`,
    );
    return 'invalid';
  } catch (error) {
    // Nie udało się połączyć z Cloudflare (np. brak egresu kontenera, DNS, timeout).
    // W trybie best-effort nie blokujemy — ochronę dają honeypot, time-trap i rate-limit.
    logger.error(
      `Turnstile verification error (treated as unverifiable): ${(error as Error).message}`,
    );
    return 'unverifiable';
  }
}
