import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { importX509, flattenedVerify } from 'jose';

export interface TpayTransactionResult {
  transactionId: string;
  paymentUrl: string;
}

export interface CreateTransactionParams {
  amount: number;
  description: string;
  hiddenDescription?: string;
  payerEmail: string;
  payerName: string;
  successUrl: string;
  errorUrl: string;
  callbackUrl: string;
}

export interface TpayWebhookPayload {
  id: string;
  tr_id: string;
  tr_date: string;
  tr_crc: string;
  tr_amount: string;
  tr_paid: string;
  tr_desc: string;
  tr_status: string;
  tr_error: string;
  tr_email: string;
  md5sum: string;
  test_mode?: string;
  [key: string]: unknown;
}

export interface TpayWebhookVerificationResult {
  valid: boolean;
  transactionId?: string;
  status?: string;
  amount?: number;
}

@Injectable()
export class TpayService {
  private readonly logger = new Logger(TpayService.name);
  private readonly apiUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly merchantId: string;
  private readonly securityCode: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private jwsCertCache: { pem: string; fetchedAt: number } | null = null;
  private jwsCaCertCache: { pem: string; fetchedAt: number } | null = null;
  private static readonly JWS_CERT_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.getOrThrow<string>('TPAY_API_URL');
    this.clientId = this.configService.getOrThrow<string>('TPAY_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('TPAY_CLIENT_SECRET');
    this.merchantId = this.configService.getOrThrow<string>('TPAY_MERCHANT_ID');
    this.securityCode = this.configService.get<string>('TPAY_SECURITY_CODE', '');
  }

  private get isSandbox(): boolean {
    return this.apiUrl.includes('sandbox');
  }

  private get certBaseUrl(): string {
    return this.isSandbox ? 'https://secure.sandbox.tpay.com' : 'https://secure.tpay.com';
  }

  // ─── OAuth2 Token ──────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const response = await fetch(`${this.apiUrl}/oauth/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Tpay OAuth2 token request failed: ${response.status} ${errorText}`);
      throw new Error(`Tpay OAuth2 token request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      issued_at: number;
    };

    // Cache with 60s safety margin
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return data.access_token;
  }

  // ─── Create Transaction ────────────────────────────────────────────────────

  async createTransaction(params: CreateTransactionParams): Promise<TpayTransactionResult> {
    const token = await this.getAccessToken();

    const body = {
      amount: params.amount,
      description: params.description,
      hiddenDescription: params.hiddenDescription ?? '',
      payer: {
        email: params.payerEmail,
        name: params.payerName,
      },
      callbacks: {
        payerUrls: {
          success: params.successUrl,
          error: params.errorUrl,
        },
        notification: {
          url: params.callbackUrl,
        },
      },
    };

    const response = await fetch(`${this.apiUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Tpay create transaction failed: ${response.status} ${errorText}`);
      throw new Error(`Tpay create transaction failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      result: string;
      transactionId: string;
      transactionPaymentUrl: string;
      title: string;
      status: string;
    };

    if (data.result !== 'success') {
      this.logger.error(`Tpay create transaction returned: ${JSON.stringify(data)}`);
      throw new Error('Tpay transaction creation was not successful');
    }

    return {
      transactionId: data.transactionId,
      paymentUrl: data.transactionPaymentUrl,
    };
  }

  // ─── Webhook Verification ──────────────────────────────────────────────────

  async verifyWebhook(
    body: TpayWebhookPayload,
    jwsSignatureHeader?: string,
  ): Promise<TpayWebhookVerificationResult> {
    // 1. Verify md5sum (if securityCode is configured — optional extra layer)
    if (this.securityCode) {
      const expectedMd5 = createHash('md5')
        .update(`${body.id}${body.tr_id}${body.tr_amount}${body.tr_crc}${this.securityCode}`)
        .digest('hex');

      if (body.md5sum !== expectedMd5) {
        this.logger.warn(
          `Tpay webhook md5sum mismatch: expected=${expectedMd5}, got=${body.md5sum}`,
        );
        return { valid: false };
      }
    }

    // 2. Verify JWS signature
    if (jwsSignatureHeader) {
      const jwsValid = await this.verifyJwsSignature(body, jwsSignatureHeader);
      if (!jwsValid) {
        this.logger.warn('Tpay webhook JWS signature verification failed');
        return { valid: false };
      }
    } else {
      this.logger.warn('Tpay webhook missing X-JWS-Signature header');
      return { valid: false };
    }

    return {
      valid: true,
      transactionId: body.tr_id,
      status: body.tr_status,
      amount: parseFloat(body.tr_amount),
    };
  }

  private async verifyJwsSignature(body: TpayWebhookPayload, jwsHeader: string): Promise<boolean> {
    try {
      const parts = jwsHeader.split('.');
      if (parts.length !== 3) {
        this.logger.warn('Invalid JWS header format — expected 3 parts');
        return false;
      }

      const [protectedHeader, , signature] = parts;

      // Decode JWS protected header to get x5u URL
      const headerJson = Buffer.from(
        protectedHeader.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf-8');
      const headerData = JSON.parse(headerJson) as { x5u?: string; alg?: string };

      if (!headerData.x5u) {
        this.logger.warn('JWS header missing x5u field');
        return false;
      }

      // Validate x5u URL points to Tpay domain
      if (!headerData.x5u.startsWith(this.certBaseUrl)) {
        this.logger.warn(`JWS x5u URL not from trusted domain: ${headerData.x5u}`);
        return false;
      }

      // Fetch and cache signing certificate
      const signingCert = await this.fetchCertificate(headerData.x5u, 'jws');

      // Fetch and cache CA root certificate for chain validation
      const caCertUrl = `${this.certBaseUrl}/x509/tpay-jws-root.pem`;
      const _caCert = await this.fetchCertificate(caCertUrl, 'ca');

      // Build the payload from raw body (base64url encoded)
      const bodyStr =
        typeof body === 'string'
          ? body
          : new URLSearchParams(body as Record<string, string>).toString();
      const payload = Buffer.from(bodyStr)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Verify using jose
      const publicKey = await importX509(signingCert, headerData.alg ?? 'RS256');

      await flattenedVerify(
        {
          protected: protectedHeader,
          payload,
          signature,
        },
        publicKey,
      );

      return true;
    } catch (error) {
      this.logger.error('JWS verification error', error instanceof Error ? error.message : error);
      return false;
    }
  }

  private async fetchCertificate(url: string, type: 'jws' | 'ca'): Promise<string> {
    const cache = type === 'jws' ? this.jwsCertCache : this.jwsCaCertCache;

    if (cache && Date.now() - cache.fetchedAt < TpayService.JWS_CERT_TTL_MS) {
      return cache.pem;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Tpay ${type} certificate from ${url}: ${response.status}`);
    }

    const pem = await response.text();
    const cacheEntry = { pem, fetchedAt: Date.now() };

    if (type === 'jws') {
      this.jwsCertCache = cacheEntry;
    } else {
      this.jwsCaCertCache = cacheEntry;
    }

    return pem;
  }

  // ─── Refund ────────────────────────────────────────────────────────────────

  async createRefund(transactionId: string, amount: number): Promise<{ success: boolean }> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.apiUrl}/transactions/${transactionId}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Tpay refund failed: tx=${transactionId}, status=${response.status}, body=${errorText}`,
      );
      return { success: false };
    }

    const data = (await response.json()) as { result: string };
    return { success: data.result === 'success' };
  }

  // ─── Get Transaction ──────────────────────────────────────────────────────

  async getTransaction(transactionId: string): Promise<{ status: string; amount: number } | null> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      this.logger.error(`Tpay get transaction failed: ${transactionId}, status=${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      transactionId: string;
      status: string;
      amount: number;
      payments?: { status: string };
    };

    return {
      status: data.payments?.status ?? data.status,
      amount: data.amount,
    };
  }
}
