import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { JoinEventDto, JoinGuestDto } from './join-event.dto';

describe('JoinEventDto', () => {
  it('przechodzi walidację bez roleKey (pole opcjonalne)', async () => {
    const dto = plainToInstance(JoinEventDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('przechodzi walidację z roleKey', async () => {
    const dto = plainToInstance(JoinEventDto, { roleKey: 'gracz' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('JoinGuestDto', () => {
  it('przechodzi walidację z poprawnym displayName i levelSlug', async () => {
    const dto = plainToInstance(JoinGuestDto, {
      displayName: 'Jan Kowalski',
      levelSlug: 'regular',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('odrzuca brak levelSlug (wymagany)', async () => {
    const dto = plainToInstance(JoinGuestDto, { displayName: 'Jan Kowalski' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'levelSlug')).toBe(true);
  });

  it('odrzuca bio dłuższe niż 500 znaków', async () => {
    const dto = plainToInstance(JoinGuestDto, {
      displayName: 'Jan',
      levelSlug: 'regular',
      bio: 'x'.repeat(501),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'bio')).toBe(true);
  });

  it('odrzuca brak displayName', async () => {
    const dto = plainToInstance(JoinGuestDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'displayName')).toBe(true);
  });

  it('odrzuca zbyt krótkie displayName (< 2 znaków)', async () => {
    const dto = plainToInstance(JoinGuestDto, { displayName: 'J' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'displayName')).toBe(true);
  });

  it('akceptuje opcjonalne roleKey w JoinGuestDto', async () => {
    const dto = plainToInstance(JoinGuestDto, {
      displayName: 'Jan',
      levelSlug: 'regular',
      roleKey: 'bramkarz',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('akceptuje opcjonalne avatarSeed w JoinGuestDto', async () => {
    const dto = plainToInstance(JoinGuestDto, {
      displayName: 'Jan',
      levelSlug: 'regular',
      avatarSeed: 'abc123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('przechodzi walidację bez avatarSeed (pole opcjonalne)', async () => {
    const dto = plainToInstance(JoinGuestDto, { displayName: 'Jan', levelSlug: 'regular' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('akceptuje opcjonalne userId w formacie UUID', async () => {
    const dto = plainToInstance(JoinGuestDto, {
      displayName: 'Jan',
      levelSlug: 'regular',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('odrzuca userId, który nie jest UUID', async () => {
    const dto = plainToInstance(JoinGuestDto, { displayName: 'Jan', userId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });
});
