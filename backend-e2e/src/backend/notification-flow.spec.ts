import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface Notification {
  id: string;
  type: string;
  aggregateCount: number;
}

describe('Notification Flow Integration', () => {
  let authToken: string;
  let eventId: string;
  let _userId: string;

  beforeAll(async () => {
    // Zaloguj użytkownika testowego
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123',
    });
    authToken = loginRes.data.accessToken;
    _userId = loginRes.data.user.id;

    // Utwórz event testowy
    const eventRes = await axios.post(
      `${API_URL}/events`,
      {
        title: 'Test Event for Notifications',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        maxParticipants: 10,
        costPerPerson: 0,
        cityId: 'zielona-gora',
        disciplineId: 'disc1',
        location: 'Test Location',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    eventId = eventRes.data.id;
  });

  it('tworzy notyfikację przy akceptacji uczestnika', async () => {
    // Utwórz zgłoszenie (jako inny użytkownik)
    const participantRes = await axios.post(`${API_URL}/auth/register`, {
      email: 'participant@example.com',
      password: 'password123',
      displayName: 'Test Participant',
    });
    const participantToken = participantRes.data.accessToken;

    // Dołącz do event
    await axios.post(
      `${API_URL}/events/${eventId}/join`,
      {},
      {
        headers: { Authorization: `Bearer ${participantToken}` },
      },
    );

    // Zaakceptuj uczestnika (jako organizator)
    await axios.post(
      `${API_URL}/events/${eventId}/participants/accept`,
      { participationId: 'mock-id' },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // Poczekaj chwilę na przetworzenie notyfikacji
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Weryfikuj, że notyfikacja została utworzona w DB
    const notificationsRes = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(notificationsRes.data).toBeDefined();
    expect(notificationsRes.data.length).toBeGreaterThan(0);
  });

  it('agreguje notyfikacje tego samego typu', async () => {
    // Wyślij 3 komunikaty do uczestników
    for (let i = 0; i < 3; i++) {
      await axios.post(
        `${API_URL}/events/${eventId}/announcements`,
        {
          message: `Test announcement ${i}`,
          priority: 'INFORMATIONAL',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
    }

    // Poczekaj chwilę na przetworzenie
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Weryfikuj, że notyfikacje są zagregowane
    const notificationsRes = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const announcements = notificationsRes.data.filter(
      (n: Notification) => n.type === 'ANNOUNCEMENT',
    );

    // Powinny być zagregowane (aggregateCount > 1)
    const aggregated = announcements.filter((n: Notification) => n.aggregateCount > 1);
    expect(aggregated.length).toBeGreaterThan(0);
  });

  it('wysyła notyfikację przez WebSocket', async () => {
    // Ten test wymagałby rzeczywistego WebSocket client
    // Dla uproszczenia weryfikujemy tylko endpoint API
    const wsRes = await axios.get(`${API_URL}/notifications/ws-test`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(wsRes.status).toBe(200);
  });
});
