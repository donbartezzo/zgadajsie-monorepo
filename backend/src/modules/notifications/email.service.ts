import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';
import { APP_BRAND } from '@zgadajsie/shared';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  private get fromAddress(): string {
    return this.configService.get<string>('SMTP_FROM', APP_BRAND.NOREPLY_EMAIL);
  }

  private get frontendUrl(): string {
    return this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  async sendActivationEmail(email: string, displayName: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/activate?token=${token}`;
    await this.send(
      email,
      `Aktywacja konta – ${APP_BRAND.NAME}`,
      `
      <h2>Witaj ${displayName}!</h2>
      <p>Dziękujemy za rejestrację w ${APP_BRAND.NAME}.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;">Aktywuj konto</a></p>
      <p>Link wygasa po 24 godzinach.</p>
    `,
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    await this.send(
      email,
      `Reset hasła – ${APP_BRAND.NAME}`,
      `
      <h2>Reset hasła</h2>
      <p>Kliknij poniższy link, aby ustawić nowe hasło:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;">Ustaw nowe hasło</a></p>
      <p>Link wygasa po 1 godzinie.</p>
    `,
    );
  }

  async sendParticipationStatusEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    status: string,
  ): Promise<void> {
    const statusText =
      status === 'APPROVED'
        ? 'zatwierdzone - potwierdź uczestnictwo'
        : status === 'CONFIRMED'
          ? 'potwierdzone'
          : 'odrzucone';
    await this.send(
      email,
      `Zmiana statusu uczestnictwa – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Twoje zgłoszenie do wydarzenia <strong>${eventTitle}</strong> zostało <strong>${statusText}</strong>.</p>
    `,
    );
  }

  async sendEventCancelledEmail(
    email: string,
    displayName: string,
    eventTitle: string,
  ): Promise<void> {
    await this.send(
      email,
      `Wydarzenie anulowane – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Wydarzenie <strong>${eventTitle}</strong>, w którym uczestniczysz, zostało anulowane przez organizatora.</p>
    `,
    );
  }

  async sendNewApplicationEmail(
    email: string,
    organizerName: string,
    applicantName: string,
    eventTitle: string,
  ): Promise<void> {
    await this.send(
      email,
      `Nowe zgłoszenie – ${eventTitle}`,
      `
      <h2>Hej ${organizerName}!</h2>
      <p>Użytkownik <strong>${applicantName}</strong> zgłosił się do Twojego wydarzenia <strong>${eventTitle}</strong>.</p>
    `,
    );
  }

  async sendPaymentConfirmationEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    amount: number,
  ): Promise<void> {
    await this.send(
      email,
      `Potwierdzenie płatności – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Twoja płatność <strong>${amount.toFixed(
        2,
      )} zł</strong> za wydarzenie <strong>${eventTitle}</strong> została zaksięgowana.</p>
    `,
    );
  }

  async sendRefundConfirmationEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    amount: number,
  ): Promise<void> {
    await this.send(
      email,
      `Zwrot płatności – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Zwrot <strong>${amount.toFixed(
        2,
      )} zł</strong> za wydarzenie <strong>${eventTitle}</strong> został zlecony.</p>
    `,
    );
  }

  async sendReprimandEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    reason: string,
  ): Promise<void> {
    await this.send(
      email,
      `Reprymenda – ${APP_BRAND.NAME}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Otrzymałeś reprymendę za zachowanie na wydarzeniu <strong>${eventTitle}</strong>.</p>
      <p>Powód: ${reason}</p>
    `,
    );
  }

  async sendAnnouncementEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    message: string,
    priority: string,
    confirmToken: string,
  ): Promise<void> {
    const confirmLink = `${this.frontendUrl}/announcements/confirm/${confirmToken}`;
    const priorityLabel =
      priority === 'CRITICAL'
        ? '🔴 Krytyczny'
        : priority === 'ORGANIZATIONAL'
          ? '🟡 Organizacyjny'
          : 'ℹ️ Informacyjny';
    await this.send(
      email,
      `${priority === 'CRITICAL' ? '[PILNE] ' : ''}Komunikat organizatora – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Organizator wydarzenia <strong>${eventTitle}</strong> wysłał komunikat:</p>
      <div style="padding:12px 16px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;margin:16px 0;">
        <p style="margin:0 0 4px 0;font-size:12px;color:#92400e;"><strong>${priorityLabel}</strong></p>
        <p style="margin:0;font-size:14px;color:#1c1917;">${message}</p>
      </div>
      <p>W celu potwierdzenia otrzymania tego powiadomienia kliknij w poniższy link:</p>
      <p><a href="${confirmLink}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;">Potwierdzam odbiór</a></p>
    `,
    );
  }

  async sendEventReminderEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    startsAt: Date,
  ): Promise<void> {
    const timeStr = startsAt.toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
    await this.send(
      email,
      `Przypomnienie – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Przypominamy, że wydarzenie <strong>${eventTitle}</strong> rozpoczyna się <strong>${timeStr}</strong>.</p>
    `,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html: this.wrapHtml(html),
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  private wrapHtml(body: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">${body}<hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;"/><p style="font-size:12px;color:#9ca3af;">${APP_BRAND.NAME} – ${APP_BRAND.TAGLINE}</p></body></html>`;
  }
}
