import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import React from 'react';
import { Resend } from 'resend';
import {
  APP_BRAND,
  formatDateTime,
  ContactSource,
  isOverrideAccount,
  parseNotificationPayload,
  type ParticipationNotificationStatus,
  type OrganizerDigestData,
} from '@zgadajsie/shared';
import {
  ActivationEmail,
  AdminDailyReportEmail,
  AnnouncementEmail,
  ContactEmail,
  EventCancelledEmail,
  EventReminderEmail,
  NewApplicationEmail,
  NotificationDigestEmail,
  OrganizerWeeklyDigestEmail,
  ParticipationStatusEmail,
  PasswordResetEmail,
  PaymentConfirmationEmail,
  PrivateChatEmail,
  RefundConfirmationEmail,
  ReprimandEmail,
  renderEmail,
  PARTICIPATION_EMAIL_STATUSES,
  type ParticipationStatus,
} from '@zgadajsie/email';
import { featureFlags } from '../../common/config/feature-flags';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

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

  private get adminEmail(): string {
    return this.configService.get<string>('ADMIN_EMAIL', this.fromAddress);
  }

  async sendActivationEmail(email: string, displayName: string, token: string): Promise<void> {
    const activationLink = `${this.frontendUrl}/auth/activate?token=${token}`;
    const { html, text } = await renderEmail(
      <ActivationEmail displayName={displayName} activationLink={activationLink} />,
    );
    await this.send(email, `Aktywacja konta – ${APP_BRAND.NAME}`, html, text);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    const { html, text } = await renderEmail(<PasswordResetEmail resetLink={resetLink} />);
    await this.send(email, `Reset hasła – ${APP_BRAND.NAME}`, html, text);
  }

  async sendParticipationStatusEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    status: string,
    eventLink?: string,
  ): Promise<void> {
    const subjectMap: Record<string, string> = {
      SLOT_ASSIGNED: `Przydzielono miejsce - ${eventTitle}`,
      APPROVAL_REMINDER: `Przypomnienie o potwierdzeniu - ${eventTitle}`,
      CONFIRMED: `Uczestnictwo potwierdzone - ${eventTitle}`,
      REMOVED: `Usunięcie z wydarzenia - ${eventTitle}`,
      REJECTED: `Zgłoszenie odrzucone - ${eventTitle}`,
    };
    const subject = subjectMap[status] ?? subjectMap['REJECTED'];
    const { html, text } = await renderEmail(
      <ParticipationStatusEmail
        displayName={displayName}
        eventTitle={eventTitle}
        status={status as ParticipationStatus}
        eventLink={eventLink}
      />,
    );
    await this.send(email, subject, html, text);
  }

  async sendEventCancelledEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    eventLink?: string,
  ): Promise<void> {
    const { html, text } = await renderEmail(
      <EventCancelledEmail
        displayName={displayName}
        eventTitle={eventTitle}
        eventLink={eventLink}
        showGroupChat={false}
        showOrganizerChat={false}
      />,
    );
    await this.send(email, `Wydarzenie anulowane – ${eventTitle}`, html, text);
  }

  async sendNewApplicationEmail(
    email: string,
    organizerName: string,
    applicantName: string,
    eventTitle: string,
    eventId: string,
  ): Promise<void> {
    const manageLink = `${this.frontendUrl}/o/w/${eventId}/manage`;
    const { html, text } = await renderEmail(
      <NewApplicationEmail
        organizerName={organizerName}
        applicantName={applicantName}
        eventTitle={eventTitle}
        manageLink={manageLink}
        showGroupChat={false}
        showOrganizerChat={false}
      />,
    );
    await this.send(email, `Nowe zgłoszenie – ${eventTitle}`, html, text);
  }

  async sendPaymentConfirmationEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    amount: number,
    eventLink: string,
  ): Promise<void> {
    const { html, text } = await renderEmail(
      <PaymentConfirmationEmail
        displayName={displayName}
        eventTitle={eventTitle}
        amount={amount}
        eventLink={eventLink}
      />,
    );
    await this.send(email, `Potwierdzenie płatności – ${eventTitle}`, html, text);
  }

  async sendRefundConfirmationEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    amount: number,
    eventLink?: string,
  ): Promise<void> {
    const { html, text } = await renderEmail(
      <RefundConfirmationEmail
        displayName={displayName}
        eventTitle={eventTitle}
        amount={amount}
        eventLink={eventLink}
      />,
    );
    await this.send(email, `Zwrot płatności – ${eventTitle}`, html, text);
  }

  async sendReprimandEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    reason: string,
    eventLink?: string,
  ): Promise<void> {
    const { html, text } = await renderEmail(
      <ReprimandEmail
        displayName={displayName}
        eventTitle={eventTitle}
        reason={reason}
        eventLink={eventLink}
      />,
    );
    await this.send(email, `Reprymenda – ${APP_BRAND.NAME}`, html, text);
  }

  async sendAnnouncementEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    message: string,
    priority: string,
    confirmToken: string,
    eventLink: string,
  ): Promise<void> {
    const confirmLink = `${this.frontendUrl}/announcements/confirm/${confirmToken}`;
    const subject = `${priority === 'CRITICAL' ? '[PILNE] ' : ''}Komunikat organizatora – ${eventTitle}`;
    const { html, text } = await renderEmail(
      <AnnouncementEmail
        displayName={displayName}
        eventTitle={eventTitle}
        message={message}
        priority={priority as 'INFO' | 'ORGANIZATIONAL' | 'CRITICAL'}
        confirmLink={confirmLink}
        eventLink={eventLink}
      />,
    );
    await this.send(email, subject, html, text);
  }

  async sendEventReminderEmail(
    email: string,
    displayName: string,
    eventTitle: string,
    startsAt: Date,
    eventLink: string,
  ): Promise<void> {
    const eventTime = formatDateTime(startsAt);
    const { html, text } = await renderEmail(
      <EventReminderEmail
        displayName={displayName}
        eventTitle={eventTitle}
        eventTime={eventTime}
        eventLink={eventLink}
      />,
    );
    await this.send(email, `Przypomnienie – ${eventTitle}`, html, text);
  }

  async sendContactEmail(
    name: string,
    email: string,
    message: string,
    source?: ContactSource,
    citySlug?: string,
    referenceNumber?: string,
  ): Promise<void> {
    const subject = `${referenceNumber ? `[${referenceNumber}] ` : ''}Wiadomość kontaktowa od ${name}`;
    const { html, text } = await renderEmail(
      <ContactEmail
        senderName={name}
        senderEmail={email}
        message={message}
        source={source}
        citySlug={citySlug}
        referenceNumber={referenceNumber}
      />,
    );
    await this.send(this.fromAddress, subject, html, text, email);
  }

  async sendOrganizerWeeklyDigest(
    email: string,
    displayName: string,
    data: OrganizerDigestData,
    frontendUrl: string,
  ): Promise<void> {
    const { html, text } = await renderEmail(
      <OrganizerWeeklyDigestEmail
        displayName={displayName}
        frontendUrl={frontendUrl}
        period={data.period}
        pendingConfirmations={data.pendingConfirmations.map((e) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt,
          seriesName: e.seriesName,
          confirmToken: e.confirmToken,
        }))}
        upcoming={data.upcoming.map((e) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt,
          enrollmentCount: e.enrollmentCount,
        }))}
        recentlyCreated={data.recentlyCreated.map((e) => ({ id: e.id, title: e.title }))}
        recentlyEnded={data.recentlyEnded.map((e) => ({
          id: e.id,
          title: e.title,
          enrollmentCount: e.enrollmentCount,
        }))}
        recentlyCancelled={data.recentlyCancelled.map((e) => ({ id: e.id, title: e.title }))}
        activeSeries={data.activeSeries.map((s) => ({
          id: s.id,
          name: s.name,
          pendingCount: s.pendingCount,
          suspendedReason: s.suspendedReason,
        }))}
      />,
    );
    await this.send(email, `Tygodniowy raport organizatora – ${APP_BRAND.NAME}`, html, text);
  }

  async sendAdminDailyReport(data: {
    date: string;
    environment: string;
    cronStatus: Array<{
      name: string;
      lastRun: Date | null;
      lastError: string | null;
      status: 'OK' | 'STUCK' | 'ERROR';
    }>;
    stats: { activeEvents: number; totalUsers: number; newUsersToday: number };
    logsCleaned: number;
  }): Promise<void> {
    const hasIssues = data.cronStatus.some((c) => c.status === 'STUCK' || c.status === 'ERROR');
    const subject = hasIssues
      ? `[ALERT] Raport dzienny cronów – ${APP_BRAND.NAME}`
      : `Raport dzienny cronów – ${APP_BRAND.NAME}`;

    const { html, text } = await renderEmail(
      <AdminDailyReportEmail
        date={data.date}
        environment={data.environment}
        cronStatus={data.cronStatus.map((c) => ({
          name: c.name,
          lastRun: c.lastRun ? formatDateTime(c.lastRun) : null,
          lastError: c.lastError,
          status: c.status,
        }))}
        stats={data.stats}
        logsCleaned={data.logsCleaned}
      />,
    );
    await this.send(this.adminEmail, subject, html, text);
  }

  async sendPrivateChatEmail(
    email: string,
    displayName: string,
    senderName: string,
    eventTitle: string,
    unreadCount: number,
    chatUrl: string,
  ): Promise<void> {
    const subject = `Nowa prywatna wiadomość – ${eventTitle}`;
    const { html, text } = await renderEmail(
      <PrivateChatEmail
        displayName={displayName}
        senderName={senderName}
        eventTitle={eventTitle}
        unreadCount={unreadCount}
        chatUrl={chatUrl}
      />,
    );
    await this.send(email, subject, html, text);
  }

  async sendDigest(
    userId: string,
    items: Array<{
      id: string;
      title: string;
      body: string;
      link: string | null;
      createdAt: Date;
    }>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found for digest email`);
      return;
    }

    const { html, text } = await renderEmail(
      <NotificationDigestEmail
        displayName={user.displayName}
        frontendUrl={this.frontendUrl}
        items={items}
      />,
    );
    await this.send(
      user.email,
      `Masz ${items.length} nieprzeczytanych powiadomień – ${APP_BRAND.NAME}`,
      html,
      text,
    );
  }

  async sendTransactionalForNotification(notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string | null;
    user: { email: string; displayName: string };
    relatedEventId: string | null;
    data: unknown;
  }): Promise<void> {
    const { type, user, title, body, link } = notification;

    switch (type) {
      case 'EVENT_REMINDER':
        // EVENT_REMINDER wymaga dodatkowych danych (eventTime, eventTitle)
        // Tymczasowo pomijamy - wymagane rozszerzenie payloadu
        this.logger.warn(
          `EVENT_REMINDER email not implemented yet for notification ${notification.id}`,
        );
        break;

      case 'EVENT_CANCELLED':
        await this.sendEventCancelledEmail(user.email, user.displayName, title, link ?? undefined);
        break;

      case 'PARTICIPATION_STATUS': {
        const payload = parseNotificationPayload(notification.data);
        if (payload?.kind !== 'PARTICIPATION_STATUS') {
          this.logger.warn(
            `PARTICIPATION_STATUS notification ${notification.id} bez prawidłowego payloadu - pomijam e-mail`,
          );
          break;
        }

        const emailStatus = this.toEmailParticipationStatus(payload.status);
        if (!emailStatus) {
          // SPOT_AVAILABLE / LOTTERY_NOT_SELECTED: brak szablonu e-mail (kanał wyłącznie in-app/push)
          this.logger.debug(
            `Status '${payload.status}' nie ma szablonu e-mail - pomijam e-mail dla ${notification.id}`,
          );
          break;
        }

        // Tytuł powiadomienia to nagłówek UI (np. "Przydzielono miejsce"), nie nazwa
        // wydarzenia - pobieramy aktualny tytuł wydarzenia z bazy.
        let eventTitle = title;
        if (notification.relatedEventId) {
          const event = await this.prisma.event.findUnique({
            where: { id: notification.relatedEventId },
            select: { title: true },
          });
          if (event) {
            eventTitle = event.title;
          }
        }
        await this.sendParticipationStatusEmail(
          user.email,
          user.displayName,
          eventTitle,
          emailStatus,
          link ?? undefined,
        );
        break;
      }

      case 'PAYMENT_CANCELLED':
        // PAYMENT_CANCELLED wymaga amount
        // Tymczasowo pomijamy - wymagane rozszerzenie payloadu
        this.logger.warn(
          `PAYMENT_CANCELLED email not implemented yet for notification ${notification.id}`,
        );
        break;

      case 'REPRIMAND':
        await this.sendReprimandEmail(user.email, user.displayName, title, body, link ?? undefined);
        break;

      case 'ANNOUNCEMENT':
        // ANNOUNCEMENT wymiera priority, message, confirmToken
        // Tymczasowo pomijamy - wymagane rozszerzenie payloadu
        this.logger.warn(
          `ANNOUNCEMENT email not implemented yet for notification ${notification.id}`,
        );
        break;

      default:
        this.logger.warn(`Unknown notification type for transactional email: ${type}`);
    }
  }

  /**
   * Zawęża status powiadomienia uczestnictwa do podzbioru renderowalnego w e-mailu.
   * Zwraca null dla statusów wyłącznie in-app/push (np. SPOT_AVAILABLE, LOTTERY_NOT_SELECTED).
   */
  private toEmailParticipationStatus(
    status: ParticipationNotificationStatus,
  ): ParticipationStatus | null {
    return (PARTICIPATION_EMAIL_STATUSES as readonly string[]).includes(status)
      ? (status as ParticipationStatus)
      : null;
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
    replyTo?: string,
  ): Promise<void> {
    if (!featureFlags.enableEmails && !isOverrideAccount(to)) {
      this.logger.log(`Email sending disabled, skipping email to ${to}: ${subject}`);
      return;
    }

    if (this.isNonDeliverableAddress(to)) {
      this.logger.debug(`Skipping email to non-deliverable address: ${to}`);
      return;
    }

    // Resend SDK v6 never throws — it always returns { data, error }.
    // The try/catch covers unexpected runtime errors (e.g. onModuleInit failure).
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
        text,
        replyTo,
      });
      if (error) {
        this.logger.error(
          `Failed to send email to ${to} [${subject}]: ${error.message} (HTTP ${error.statusCode ?? 'n/a'})`,
        );
        return;
      }
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Unexpected error sending email to ${to}: ${(error as Error).message}`);
    }
  }

  private isNonDeliverableAddress(email: string): boolean {
    const lower = email.toLowerCase();
    return (
      lower.endsWith('@guest.zgadajsie.pl') ||
      lower.endsWith('@example.com') ||
      lower.endsWith('@example.org') ||
      lower.endsWith('@example.net')
    );
  }
}
