export interface ChatAccessDeniedError {
  status?: number;
  message?: string;
  error?: {
    message?: string;
  };
}

export function isChatAccessDeniedMessage(message?: string | null): boolean {
  if (!message) {
    return false;
  }

  return (
    message.includes('Brak dostępu do czatu grupowego') ||
    message.includes('Użytkownik nie jest uczestnikiem tego wydarzenia') ||
    message.includes('Prywatny czat jest dostępny tylko między organizatorem a uczestnikiem')
  );
}

export function isChatAccessDeniedError(error?: ChatAccessDeniedError | null): boolean {
  if (!error) {
    return false;
  }

  if (error.status === 403) {
    return true;
  }

  return isChatAccessDeniedMessage(error.error?.message ?? error.message);
}
