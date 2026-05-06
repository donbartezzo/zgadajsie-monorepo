import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { APP_BRAND, formatDateTime } from '@zgadajsie/shared';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  private get fromAddress(): string {
    return this.configService.get<string>('EMAIL_FROM', APP_BRAND.NOREPLY_EMAIL);
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
    const templates: Record<string, { subject: string; body: string }> = {
      SLOT_ASSIGNED: {
        subject: `Przydzielono miejsce - ${eventTitle}`,
        body: `Masz przydzielone miejsce na wydarzeniu <strong>${eventTitle}</strong>. Potwierdź swoje uczestnictwo na stronie wydarzenia.`,
      },
      APPROVAL_REMINDER: {
        subject: `Przypomnienie o potwierdzeniu - ${eventTitle}`,
        body: `Przypominamy, że masz przydzielone miejsce na wydarzeniu <strong>${eventTitle}</strong>. Potwierdź swoje uczestnictwo, aby nie stracić miejsca.`,
      },
      CONFIRMED: {
        subject: `Uczestnictwo potwierdzone - ${eventTitle}`,
        body: `Twoje uczestnictwo w wydarzeniu <strong>${eventTitle}</strong> zostało potwierdzone. Do zobaczenia!`,
      },
      REMOVED: {
        subject: `Usunięcie z wydarzenia - ${eventTitle}`,
        body: `Twoje uczestnictwo w wydarzeniu <strong>${eventTitle}</strong> zostało anulowane przez organizatora.`,
      },
      REJECTED: {
        subject: `Zgłoszenie odrzucone - ${eventTitle}`,
        body: `Twoje zgłoszenie do wydarzenia <strong>${eventTitle}</strong> zostało odrzucone.`,
      },
    };
    const config = templates[status] ?? templates['REJECTED'];
    await this.send(
      email,
      config.subject,
      `
      <h2>Hej ${displayName}!</h2>
      <p>${config.body}</p>
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
      <p>Twoja płatność <strong>${amount.toFixed(2)} zł</strong> za wydarzenie <strong>${eventTitle}</strong> została zaksięgowana.</p>
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
      <p>Zwrot <strong>${amount.toFixed(2)} zł</strong> za wydarzenie <strong>${eventTitle}</strong> został zlecony.</p>
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
    const timeStr = formatDateTime(startsAt);
    await this.send(
      email,
      `Przypomnienie – ${eventTitle}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Przypominamy, że wydarzenie <strong>${eventTitle}</strong> rozpoczyna się <strong>${timeStr}</strong>.</p>
    `,
    );
  }

  async sendContactEmail(name: string, email: string, message: string): Promise<void> {
    const subject = `Formularz kontaktowy: ${name} (${email})`;
    const html = `
      <h2>Wiadomość z formularza kontaktowego</h2>
      <p><strong>Imię:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Wiadomość:</strong></p>
      <div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:16px;margin:16px 0;">
        ${message.replace(/\n/g, '<br>')}
      </div>
    `;
    await this.send(this.fromAddress, subject, html);
  }

  async sendOrganizerWeeklyDigest(
    email: string,
    displayName: string,
    data: import('../organizer/organizer.service').OrganizerDigestData,
    frontendUrl: string,
  ): Promise<void> {
    const hasPending = data.pendingConfirmations.length > 0;
    const hasSuspended = data.activeSeries.some((s) => s.suspendedReason);

    const pendingSection = hasPending
      ? `
        <h2 style="color:#d97706;">⚠️ Do potwierdzenia (${data.pendingConfirmations.length})</h2>
        <p>Poniższe wydarzenia zostały wygenerowane automatycznie i czekają na Twoje potwierdzenie.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${data.pendingConfirmations
            .map(
              (e) => `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:8px 0;">
                <strong>${e.title}</strong><br/>
                <span style="font-size:12px;color:#6b7280;">${new Date(e.startsAt).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                ${e.seriesName ? `<br/><span style="font-size:12px;color:#6b7280;">Seria: ${e.seriesName}</span>` : ''}
              </td>
              <td style="padding:8px 0;text-align:right;">
                ${
                  e.confirmToken
                    ? `<a href="${frontendUrl}/o/confirm-event?token=${e.confirmToken}" style="display:inline-block;padding:6px 14px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;">Potwierdź</a>`
                    : ''
                }
              </td>
            </tr>`,
            )
            .join('')}
        </table>
      `
      : '';

    const suspendedSection = hasSuspended
      ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;">
          <strong style="color:#dc2626;">Seria wstrzymana</strong>
          <p style="margin:4px 0;font-size:13px;color:#7f1d1d;">
            Jedna lub więcej Twoich serii wydarzeń jest wstrzymana z powodu niepotwierdzonych wydarzeń.
            <a href="${frontendUrl}/profile/organizer/digest" style="color:#dc2626;">Przejdź do panelu →</a>
          </p>
        </div>
      `
      : '';

    const seriesSection =
      data.activeSeries.length > 0
        ? `
        <h2>Aktywne serie (${data.activeSeries.length})</h2>
        <ul style="padding-left:18px;">
          ${data.activeSeries
            .map(
              (s) =>
                `<li style="margin-bottom:6px;">
                  <strong>${s.name}</strong>
                  ${s.suspendedReason ? '<span style="color:#dc2626;"> — WSTRZYMANA</span>' : ''}
                  ${s.pendingCount > 0 ? `<span style="color:#d97706;"> (${s.pendingCount} oczekujące)</span>` : ''}
                </li>`,
            )
            .join('')}
        </ul>
      `
        : '';

    const summarySection = `
      <h2>Podsumowanie miesiąca</h2>
      <ul style="padding-left:18px;">
        ${data.upcoming.length > 0 ? `<li><strong>${data.upcoming.length}</strong> nadchodzących wydarzeń</li>` : ''}
        ${data.recentlyCreated.length > 0 ? `<li><strong>${data.recentlyCreated.length}</strong> nowo utworzonych wydarzeń</li>` : ''}
        ${data.recentlyEnded.length > 0 ? `<li><strong>${data.recentlyEnded.length}</strong> zakończonych wydarzeń</li>` : ''}
        ${data.recentlyCancelled.length > 0 ? `<li><strong>${data.recentlyCancelled.length}</strong> anulowanych wydarzeń</li>` : ''}
      </ul>
      <p><a href="${frontendUrl}/profile/organizer/digest" style="color:#2563eb;">Zobacz pełne zestawienie →</a></p>
    `;

    await this.send(
      email,
      `Tygodniowy raport organizatora – ${APP_BRAND.NAME}`,
      `
      <h2>Hej ${displayName}!</h2>
      <p>Oto Twój tygodniowy raport z aktywnością na ${APP_BRAND.NAME}.</p>
      ${suspendedSection}
      ${pendingSection}
      ${seriesSection}
      ${summarySection}
      `,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
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
