import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContactService } from './contact.service';
import { EmailService } from '../notifications/email.service';
import { ContactSource } from '@zgadajsie/shared';

function buildPrismaMock() {
  return {
    contactMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;
}

function buildEmailServiceMock() {
  return {
    sendContactEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailService;
}

function buildConfigServiceMock() {
  return {
    get: jest.fn().mockReturnValue('test-secret'),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;
}

describe('ContactService', () => {
  let service: ContactService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let emailService: ReturnType<typeof buildEmailServiceMock>;
  let configService: ReturnType<typeof buildConfigServiceMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    emailService = buildEmailServiceMock();
    configService = buildConfigServiceMock();
    service = new ContactService(prisma as PrismaService, configService, emailService);
    jest.clearAllMocks();
  });

  describe('submitContact()', () => {
    const baseDto = {
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      message: 'To jest przykładowa wiadomość kontaktowa.',
      source: ContactSource.CONTACT_PAGE,
      citySlug: undefined,
      captchaToken: 'valid-token',
      website: '',
      company: '',
      formRenderedAt: new Date(Date.now() - 5000).toISOString(),
    };

    it('odrzuca honeypot jeśli website niepuste', async () => {
      const dto = { ...baseDto, website: 'bot-attempt' };

      await expect(service.submitContact(dto, null, '127.0.0.1')).resolves.toEqual({
        success: true,
        message: 'Wiadomość została wysłana pomyślnie',
        referenceNumber: '',
      });

      expect(prisma.contactMessage.create).not.toHaveBeenCalled();
      expect(emailService.sendContactEmail).not.toHaveBeenCalled();
    });

    it('odrzuca honeypot jeśli company niepuste', async () => {
      const dto = { ...baseDto, company: 'bot-attempt' };

      await expect(service.submitContact(dto, null, '127.0.0.1')).resolves.toEqual({
        success: true,
        message: 'Wiadomość została wysłana pomyślnie',
        referenceNumber: '',
      });

      expect(prisma.contactMessage.create).not.toHaveBeenCalled();
      expect(emailService.sendContactEmail).not.toHaveBeenCalled();
    });

    it('odrzuca time-trap jeśli czas wypełnienia < 3 sekundy', async () => {
      const dto = {
        ...baseDto,
        formRenderedAt: new Date(Date.now() - 1000).toISOString(),
      };

      await expect(service.submitContact(dto, null, '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.contactMessage.create).not.toHaveBeenCalled();
    });

    it('pomija time-trap dla zalogowanego użytkownika', async () => {
      const dto = {
        ...baseDto,
        captchaToken: undefined,
        formRenderedAt: new Date(Date.now() - 500).toISOString(),
      };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(0);
      (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: '1' });

      await expect(service.submitContact(dto, 'user1', '127.0.0.1')).resolves.toBeDefined();

      expect(prisma.contactMessage.create).toHaveBeenCalled();
    });

    it('odrzuca captcha gdy Cloudflare jednoznacznie odrzuci token dla anonima (invalid)', async () => {
      const dto = { ...baseDto, captchaToken: 'invalid-token' };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      });

      await expect(service.submitContact(dto, null, '127.0.0.1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.contactMessage.create).not.toHaveBeenCalled();
    });

    it('NIE blokuje anonima gdy weryfikacji nie da się dokończyć (unverifiable — błąd sieci)', async () => {
      const dto = { ...baseDto, captchaToken: 'some-token' };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(0);
      (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: '1' });

      global.fetch = jest.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

      await expect(service.submitContact(dto, null, '127.0.0.1')).resolves.toBeDefined();

      expect(prisma.contactMessage.create).toHaveBeenCalled();
    });

    it('pomija captcha dla zalogowanego użytkownika', async () => {
      const dto = { ...baseDto, captchaToken: undefined };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(0);
      (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: '1' });

      await service.submitContact(dto, 'user1', '127.0.0.1');

      expect(prisma.contactMessage.create).toHaveBeenCalled();
      expect(emailService.sendContactEmail).toHaveBeenCalledWith(
        'Jan Kowalski',
        'jan@example.com',
        'To jest przykładowa wiadomość kontaktowa.',
        ContactSource.CONTACT_PAGE,
        undefined,
        expect.any(String),
      );
    });

    it('przepuszcza anonima bez captchaToken (degradacja gdy captcha niedostępna)', async () => {
      const dto = { ...baseDto, captchaToken: undefined };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(0);
      (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: '1' });

      await expect(service.submitContact(dto, null, '127.0.0.1')).resolves.toBeDefined();

      expect(prisma.contactMessage.create).toHaveBeenCalled();
    });

    it('odrzuca rate-limit jeśli przekroczony limit (3/1h)', async () => {
      const dto = { ...baseDto };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(3);

      await expect(service.submitContact(dto, null, '127.0.0.1')).rejects.toThrow(HttpException);

      expect(prisma.contactMessage.create).not.toHaveBeenCalled();
    });

    it('akceptuje zgłoszenie jeśli limit nie przekroczony', async () => {
      const dto = { ...baseDto };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(2);
      (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: '1' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.submitContact(dto, null, '127.0.0.1');

      expect(prisma.contactMessage.create).toHaveBeenCalled();
      expect(emailService.sendContactEmail).toHaveBeenCalled();
    });

    it('zapisuje zgłoszenie z poprawnymi polami', async () => {
      const dto = { ...baseDto, citySlug: 'warszawa' };
      (prisma.contactMessage.count as jest.Mock).mockResolvedValue(0);
      (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: '1' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.submitContact(dto, null, '127.0.0.1');

      expect(prisma.contactMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Jan Kowalski',
          email: 'jan@example.com',
          message: 'To jest przykładowa wiadomość kontaktowa.',
          source: ContactSource.CONTACT_PAGE,
          citySlug: 'warszawa',
          userId: null,
        }),
      });
    });
  });
});
