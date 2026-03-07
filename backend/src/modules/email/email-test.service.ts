import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailTestService {
  private readonly logger = new Logger(EmailTestService.name);

  constructor(private configService: ConfigService) {}

  async testConnection(): Promise<boolean> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    try {
      await transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`SMTP connection failed: ${error.message}`);
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    try {
      await transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to,
        subject: 'Test SMTP – ZgadajSię',
        html: `
          <h2>Test połączenia SMTP</h2>
          <p>To jest testowa wiadomość z serwera ZgadajSię.</p>
          <p>Jeśli otrzymasz ten email, konfiguracja SMTP działa poprawnie!</p>
        `,
      });
      this.logger.log(`Test email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send test email: ${error.message}`);
      return false;
    }
  }
}
