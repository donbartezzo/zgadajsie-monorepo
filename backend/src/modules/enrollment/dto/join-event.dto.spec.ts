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
  it('przechodzi walidację z poprawnym displayName', async () => {
    const dto = plainToInstance(JoinGuestDto, { displayName: 'Jan Kowalski' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
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
    const dto = plainToInstance(JoinGuestDto, { displayName: 'Jan', roleKey: 'bramkarz' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
