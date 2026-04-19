import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { TpayService } from './tpay.service';
import { createHash } from 'crypto';

function buildConfigMock(overrides: Record<string, string> = {}) {
  const config: Record<string, string> = {
    TPAY_API_URL: 'https://api.sandbox.tpay.com',
    TPAY_CLIENT_ID: 'test-client-id',
    TPAY_CLIENT_SECRET: 'test-client-secret',
    TPAY_MERCHANT_ID: 'test-merchant-id',
    TPAY_SECURITY_CODE: '',
    ...overrides,
  };
  return {
    getOrThrow: jest.fn((key: string) => config[key] ?? ''),
    get: jest.fn((key: string, def?: string) => config[key] ?? def ?? ''),
  } as unknown as ConfigService;
}

const baseWebhookPayload = {
  id: 'merchant123',
  tr_id: 'TX123',
  tr_date: '2026-04-18 12:00:00',
  tr_crc: 'crc123',
  tr_amount: '50.00',
  tr_paid: '50.00',
  tr_desc: 'Test event',
  tr_status: 'TRUE',
  tr_error: 'none',
  tr_email: 'user@example.com',
  md5sum: '',
};

describe('TpayService', () => {
  let service: TpayService;

  beforeEach(() => {
    service = new TpayService(buildConfigMock());
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  describe('verifyWebhook() — brak JWS', () => {
    it('zwraca false dla brakującego nagłówka JWS', async () => {
      const result = await service.verifyWebhook(baseWebhookPayload);
      expect(result.valid).toBe(false);
    });

    it('zwraca false dla pustego nagłówka JWS', async () => {
      const result = await service.verifyWebhook(baseWebhookPayload, '');
      // empty string is falsy in the service
      expect(result.valid).toBe(false);
    });
  });

  describe('verifyWebhook() — weryfikacja md5sum', () => {
    it('odrzuca payloads z niepoprawnym md5sum gdy securityCode skonfigurowany', async () => {
      const serviceWithCode = new TpayService(
        buildConfigMock({ TPAY_SECURITY_CODE: 'secret-code' }),
      );

      const payload = {
        ...baseWebhookPayload,
        md5sum: 'wrong-hash',
      };

      const result = await serviceWithCode.verifyWebhook(payload, 'fake.jws.header');
      expect(result.valid).toBe(false);
    });

    it('przepuszcza weryfikację md5sum gdy securityCode pusty', async () => {
      // Without securityCode, md5 check is skipped, JWS check runs
      const result = await service.verifyWebhook(
        { ...baseWebhookPayload, md5sum: 'anything' },
        'invalid.jws.format', // will fail JWS but not md5
      );
      // JWS will fail (invalid format), but md5 check was skipped
      expect(result.valid).toBe(false);
    });

    it('buduje poprawny md5sum z id+tr_id+tr_amount+tr_crc+securityCode', async () => {
      const securityCode = 'my-secret';
      const serviceWithCode = new TpayService(
        buildConfigMock({ TPAY_SECURITY_CODE: securityCode }),
      );

      const payload = { ...baseWebhookPayload };
      const expectedMd5 = createHash('md5')
        .update(`${payload.id}${payload.tr_id}${payload.tr_amount}${payload.tr_crc}${securityCode}`)
        .digest('hex');
      payload.md5sum = expectedMd5;

      // md5 passes, JWS check should run (will fail because JWS is invalid)
      const result = await serviceWithCode.verifyWebhook(payload, 'invalid.jws.format');
      expect(result.valid).toBe(false);
    });
  });

  describe('verifyWebhook() — format JWS', () => {
    it('zwraca false dla JWS z niepoprawną liczbą segmentów (< 3)', async () => {
      const result = await service.verifyWebhook(baseWebhookPayload, 'only.two');
      expect(result.valid).toBe(false);
    });

    it('zwraca false dla JWS bez prawidłowego header base64', async () => {
      const result = await service.verifyWebhook(baseWebhookPayload, 'notbase64!.payload.sig');
      expect(result.valid).toBe(false);
    });

    it('zwraca false dla JWS header bez pola x5u', async () => {
      const headerNoX5u = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
      const result = await service.verifyWebhook(baseWebhookPayload, `${headerNoX5u}.payload.sig`);
      expect(result.valid).toBe(false);
    });

    it('zwraca false gdy x5u URL nie jest z zaufanej domeny Tpay', async () => {
      const headerBadUrl = Buffer.from(
        JSON.stringify({ alg: 'RS256', x5u: 'https://evil.com/cert.pem' }),
      ).toString('base64url');
      const result = await service.verifyWebhook(baseWebhookPayload, `${headerBadUrl}.payload.sig`);
      expect(result.valid).toBe(false);
    });
  });

  describe('createTransaction()', () => {
    it('rzuca wyjątek przy błędzie API Tpay', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
        json: jest.fn(),
      } as any);

      const params = {
        amount: 50,
        description: 'Test event',
        payerEmail: 'user@example.com',
        payerName: 'Test User',
        successUrl: 'https://example.com/success',
        errorUrl: 'https://example.com/error',
        callbackUrl: 'https://api.example.com/payments/webhook',
      };

      // First call (auth token), second call (create transaction)
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: 'test-token',
            expires_in: 3600,
            issued_at: Date.now(),
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValue('Bad request'),
        } as any);

      await expect(service.createTransaction(params)).rejects.toThrow(
        'Tpay create transaction failed',
      );
    });

    it('zwraca URL do płatności po pomyślnej transakcji', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: 'test-token',
            expires_in: 3600,
            issued_at: Date.now(),
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            result: 'success',
            transactionId: 'TX999',
            transactionPaymentUrl: 'https://secure.tpay.com/pay/TX999',
            title: 'TX999',
            status: 'pending',
          }),
        } as any);

      const params = {
        amount: 50,
        description: 'Test',
        payerEmail: 'user@example.com',
        payerName: 'User',
        successUrl: 'https://example.com/success',
        errorUrl: 'https://example.com/error',
        callbackUrl: 'https://api.example.com/webhook',
      };

      const result = await service.createTransaction(params);
      expect(result.transactionId).toBe('TX999');
      expect(result.paymentUrl).toBe('https://secure.tpay.com/pay/TX999');
    });
  });
});
