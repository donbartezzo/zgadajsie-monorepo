/**
 * Stałe współdzielone między seed.nonprod.ts a testami e2e (frontend-e2e).
 * Jedyne źródło prawdy dla danych testowych — nie duplikuj ich w .env.test.e2e.
 *
 * Zmiana wartości tutaj automatycznie trafia do seedu i konfiguracji Playwright.
 */
export const E2E_SEED = {
  user: {
    email: 'jan.kowalski@example.com',
    /** Hasło używane dla wszystkich użytkowników testowych (nie tylko jana) */
    password: 'Test1234!',
  },
  city: 'zielona-gora',
  events: {
    /** extraFootball3 — organizator: kasia, OPEN_ENROLLMENT, jan może dołączyć */
    enrollment: 'a6e3d86e-0a65-4ba2-8db7-3a0698d57608',
    /** openEnroll2 — organizator: jan, OPEN_ENROLLMENT */
    organizer: '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',
    /** ten sam event co enrollment — chat dostępny po dołączeniu */
    chat: 'a6e3d86e-0a65-4ba2-8db7-3a0698d57608',
    /** wymaga Tpay sandbox — brak wartości w środowisku dev */
    paid: '',
  },
} as const;
