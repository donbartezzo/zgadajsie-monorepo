import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

async function validateDto(data: object) {
  const dto = plainToInstance(RegisterDto, data);
  return validate(dto);
}

describe('RegisterDto', () => {
  it('przechodzi walidację dla poprawnych danych', async () => {
    const errors = await validateDto({
      email: 'user@example.com',
      password: 'SecurePass123!',
      displayName: 'Jan Kowalski',
    });
    expect(errors).toHaveLength(0);
  });

  it('odrzuca nieprawidłowy email', async () => {
    const errors = await validateDto({
      email: 'not-an-email',
      password: 'SecurePass123!',
      displayName: 'Jan',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('odrzuca zbyt krótkie hasło (< 8 znaków)', async () => {
    const errors = await validateDto({
      email: 'user@example.com',
      password: 'Ab1!',
      displayName: 'Jan',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('odrzuca zbyt długie hasło (> 60 znaków)', async () => {
    const errors = await validateDto({
      email: 'user@example.com',
      password: 'A'.repeat(61) + '1!',
      displayName: 'Jan',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('odrzuca zbyt krótkie displayName (< 2 znaków)', async () => {
    const errors = await validateDto({
      email: 'user@example.com',
      password: 'SecurePass123!',
      displayName: 'J',
    });
    expect(errors.some((e) => e.property === 'displayName')).toBe(true);
  });

  it('odrzuca brak email', async () => {
    const errors = await validateDto({
      password: 'SecurePass123!',
      displayName: 'Jan',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('odrzuca popularne hasła (np. "password1")', async () => {
    const errors = await validateDto({
      email: 'user@example.com',
      password: 'password1',
      displayName: 'Jan Kowalski',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
