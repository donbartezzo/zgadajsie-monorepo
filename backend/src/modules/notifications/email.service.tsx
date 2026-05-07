import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import React from 'react';
import { Resend } from 'resend';
import { APP_BRAND, formatDateTime } from '@zgadajsie/shared';
import {
  ActivationEmail,
  AdminDailyReportEmail,
  AnnouncementEmail,
  ContactEmail,
  EventCancelledEmail,
  EventReminderEmail,
  NewApplicationEmail,
  OrganizerWeeklyDigestEmail,
  ParticipationStatusEmail,
  PasswordResetEmail,
  PaymentConfirmationEmail,
  RefundConfirmationEmail,
  ReprimandEmail,
  renderEmail,
  type ParticipationStatus,
} from '@zgadajsie/email';
import type { OrganizerDigestData } from '../organizer/organizer.service';

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
      />,
    );
    await this.send(email, `Wydarzenie anulowane – ${eventTitle}`, html, text);
  }

  async sendNewApplicationEmail(
    email: string,
    organizerName: string,
    applicantName: string,
    eventTitle: string,
    eventLink?: string,
  ): Promise<void> {
    const manageLink = `${this.frontendUrl}/o/events`;
    const { html, text } = await renderEmail(
      <NewApplicationEmail
        organizerName={organizerName}
        applicantName={applicantName}
        eventTitle={eventTitle}
        manageLink={manageLink}
        eventLink={eventLink}
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

  async sendContactEmail(name: string, email: string, message: string): Promise<void> {
    const subject = `Formularz kontaktowy: ${name} (${email})`;
    const { html, text } = await renderEmail(
      <ContactEmail senderName={name} senderEmail={email} message={message} />,
    );
    await this.send(this.fromAddress, subject, html, text);
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

  private async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
        text,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }
}
