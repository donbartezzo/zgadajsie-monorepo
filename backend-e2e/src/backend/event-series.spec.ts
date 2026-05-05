import axios from 'axios';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';

const TEST_USER = { email: 'jan.kowalski@example.com', password: 'Test1234!' };

async function loginAsJan(): Promise<string> {
  const res = await axios.post('/api/auth/login', TEST_USER);
  return res.data.access_token as string;
}

function futureDateISO(daysAhead = 1): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().substring(0, 10);
}

const BASE_SERIES_PAYLOAD = {
  name: 'E2E Trening tygodniowy',
  recurrenceType: EventSeriesRecurrenceType.INTERVAL,
  intervalDays: 7,
  time: '19:00',
  timezone: 'Europe/Warsaw',
  durationMinutes: 120,
  startDate: futureDateISO(1),
  title: 'E2E Test - Trening piłkarski',
  description: 'Opis testowy',
  disciplineSlug: 'football',
  facilitySlug: 'orlik',
  levelSlug: 'open',
  citySlug: 'zielona-gora',
  address: 'ul. Testowa 1',
  lat: 51.935,
  lng: 15.506,
  maxParticipants: 10,
  minParticipants: 2,
  visibility: 'PUBLIC',
  gender: 'ANY',
  facilityReserved: false,
};

describe('POST /api/event-series', () => {
  it('zwraca 401 bez tokenu JWT', async () => {
    const res = await axios.post('/api/event-series', BASE_SERIES_PAYLOAD, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(401);
  });

  it('tworzy serię i zwraca 201 z id serii', async () => {
    const token = await loginAsJan();

    const res = await axios.post('/api/event-series', BASE_SERIES_PAYLOAD, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({
      id: expect.any(String),
      name: BASE_SERIES_PAYLOAD.name,
      recurrenceType: EventSeriesRecurrenceType.INTERVAL,
      isActive: true,
    });
  });
});

describe('GET /api/event-series/:id', () => {
  let seriesId: string;
  let token: string;

  beforeAll(async () => {
    token = await loginAsJan();
    const res = await axios.post(
      '/api/event-series',
      { ...BASE_SERIES_PAYLOAD, name: 'E2E Seria do odczytu' },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      },
    );
    seriesId = res.data.id as string;
  });

  it('zwraca 401 bez tokenu JWT', async () => {
    const res = await axios.get(`/api/event-series/${seriesId}`, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(401);
  });

  it('zwraca szczegóły serii i listę nadchodzących wydarzeń', async () => {
    const res = await axios.get(`/api/event-series/${seriesId}`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      id: seriesId,
      name: 'E2E Seria do odczytu',
      isActive: true,
    });
    expect(Array.isArray(res.data.events)).toBe(true);
    expect(res.data.events.length).toBeGreaterThan(0);
    res.data.events.forEach((event: Record<string, unknown>) => {
      expect(event).toMatchObject({
        id: expect.any(String),
        seriesId,
        startsAt: expect.any(String),
      });
    });
  });
});

describe('GET /api/event-series/mine', () => {
  it('zwraca 401 bez tokenu JWT', async () => {
    const res = await axios.get('/api/event-series/mine', {
      validateStatus: () => true,
    });
    expect(res.status).toBe(401);
  });

  it('zwraca listę serii zalogowanego organizatora', async () => {
    const token = await loginAsJan();

    const res = await axios.get('/api/event-series/mine', {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

describe('DELETE /api/event-series/:id', () => {
  it('inny użytkownik nie może dezaktywować cudzej serii (403)', async () => {
    const ownerToken = await loginAsJan();
    const createRes = await axios.post(
      '/api/event-series',
      { ...BASE_SERIES_PAYLOAD, name: 'E2E Seria do dezaktywacji' },
      {
        headers: { Authorization: `Bearer ${ownerToken}` },
        validateStatus: () => true,
      },
    );
    const sid = createRes.data.id as string;

    const otherUser = await axios.post('/api/auth/login', {
      email: 'anna.nowak@example.com',
      password: TEST_USER.password,
    });
    const otherToken = otherUser.data.access_token as string;

    const res = await axios.delete(`/api/event-series/${sid}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
      validateStatus: () => true,
    });

    expect(res.status).toBe(403);
  });

  it('organizator może dezaktywować własną serię', async () => {
    const token = await loginAsJan();
    const createRes = await axios.post(
      '/api/event-series',
      { ...BASE_SERIES_PAYLOAD, name: 'E2E Seria do usunięcia' },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      },
    );
    const sid = createRes.data.id as string;

    const res = await axios.delete(`/api/event-series/${sid}`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ deactivated: true });
  });
});
