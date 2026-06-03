import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitContactDto } from './submit-contact.dto';

async function validateDto(data: object) {
  const dto = plainToInstance(SubmitContactDto, data);
  return validate(dto);
}

describe('SubmitContactDto', () => {
  it('przechodzi walidację dla poprawnych danych', async () => {
    const errors = await validateDto({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      message: 'To jest przykładowa wiadomość kontaktowa.',
      source: 'CONTACT_PAGE',
      citySlug: 'warszawa',
      captchaToken: 'valid-token',
      website: '',
      company: '',
      formRenderedAt: new Date(Date.now() - 5000).toISOString(),
    });
    expect(errors).toHaveLength(0);
  });

  it('odrzuca brak name', async () => {
    const errors = await validateDto({
      email: 'jan@example.com',
      message: 'Wiadomość',
      source: 'CONTACT_PAGE',
    });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('odrzuca nieprawidłowy email', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'not-an-email',
      message: 'Wiadomość',
      source: 'CONTACT_PAGE',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('odrzuca zbyt krótką wiadomość (< 10 znaków)', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'Krótkie',
      source: 'CONTACT_PAGE',
    });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('odrzuca zbyt długą wiadomość (> 5000 znaków)', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'A'.repeat(5001),
      source: 'CONTACT_PAGE',
    });
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('odrzuca nieprawidłowy source', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'Wiadomość testowa z wystarczającą długością',
      source: 'INVALID_SOURCE',
    });
    expect(errors.some((e) => e.property === 'source')).toBe(true);
  });

  it('odrzuca honeypot website jeśli niepuste', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'Wiadomość testowa z wystarczającą długością',
      source: 'CONTACT_PAGE',
      website: 'bot-attempt',
    });
    expect(errors.some((e) => e.property === 'website')).toBe(true);
  });

  it('odrzuca honeypot company jeśli niepuste', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'Wiadomość testowa z wystarczającą długością',
      source: 'CONTACT_PAGE',
      company: 'bot-attempt',
    });
    expect(errors.some((e) => e.property === 'company')).toBe(true);
  });

  it('akceptuje brak captchaToken (walidacja warunkowa w serwisie)', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'Wiadomość testowa z wystarczającą długością',
      source: 'CONTACT_PAGE',
    });
    expect(errors).toHaveLength(0);
  });

  it('akceptuje CITY_EVENTS jako source', async () => {
    const errors = await validateDto({
      name: 'Jan',
      email: 'jan@example.com',
      message: 'Wiadomość testowa z wystarczającą długością',
      source: 'CITY_EVENTS',
      citySlug: 'krakow',
    });
    expect(errors).toHaveLength(0);
  });
});
