import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto } from './create-event.dto';

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FUTURE_END = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString();

function makeValid(overrides: Record<string, unknown> = {}): object {
  return {
    title: 'Test Event',
    disciplineSlug: 'pilka-nozna',
    facilitySlug: 'stadion',
    levelSlug: 'beginner',
    citySlug: 'warszawa',
    startsAt: FUTURE,
    endsAt: FUTURE_END,
    maxParticipants: 10,
    address: 'ul. Testowa 1, Warszawa',
    lat: 52.2297,
    lng: 21.0122,
    ...overrides,
  };
}

async function validateDto(data: object) {
  const dto = plainToInstance(CreateEventDto, data);
  return validate(dto);
}

describe('CreateEventDto', () => {
  it('przechodzi walidację dla poprawnych danych', async () => {
    const errors = await validateDto(makeValid());
    expect(errors).toHaveLength(0);
  });

  it('odrzuca brak title', async () => {
    const errors = await validateDto(makeValid({ title: undefined }));
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('odrzuca brak startsAt', async () => {
    const errors = await validateDto(makeValid({ startsAt: undefined }));
    expect(errors.some((e) => e.property === 'startsAt')).toBe(true);
  });

  it('odrzuca nieprawidłowy format daty', async () => {
    const errors = await validateDto(makeValid({ startsAt: 'not-a-date' }));
    expect(errors.some((e) => e.property === 'startsAt')).toBe(true);
  });

  it('odrzuca maxParticipants < 2', async () => {
    const errors = await validateDto(makeValid({ maxParticipants: 1 }));
    expect(errors.some((e) => e.property === 'maxParticipants')).toBe(true);
  });

  it('odrzuca maxParticipants > 100', async () => {
    const errors = await validateDto(makeValid({ maxParticipants: 101 }));
    expect(errors.some((e) => e.property === 'maxParticipants')).toBe(true);
  });

  it('odrzuca costPerPerson < 0', async () => {
    const errors = await validateDto(makeValid({ costPerPerson: -1 }));
    expect(errors.some((e) => e.property === 'costPerPerson')).toBe(true);
  });

  it('akceptuje brak opcjonalnych pól (description, coverImageId, etc.)', async () => {
    const errors = await validateDto(makeValid());
    expect(errors).toHaveLength(0);
  });

  it('akceptuje poprawne roleConfig z jedną rolą domyślną', async () => {
    const errors = await validateDto(
      makeValid({
        roleConfig: {
          disciplineSlug: 'pilka-nozna',
          roles: [
            { key: 'gracz', slots: 5, isDefault: true },
            { key: 'bramkarz', slots: 5, isDefault: false },
          ],
        },
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('odrzuca roleConfig z brakującym isDefault w roli', async () => {
    const errors = await validateDto(
      makeValid({
        roleConfig: {
          disciplineSlug: 'pilka-nozna',
          roles: [{ key: 'gracz', slots: 5 }],
        },
      }),
    );
    expect(errors.some((e) => e.property === 'roleConfig')).toBe(true);
  });
});
