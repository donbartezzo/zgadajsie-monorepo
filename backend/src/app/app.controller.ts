import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from '../modules/notifications/email.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('config')
  getClientConfig() {
    return this.appService.getClientConfig();
  }

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  async submitContact(@Body() contactData: { name: string; email: string; message: string }) {
    const { name, email, message } = contactData;

    // Basic validation
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      throw new Error('Wszystkie pola formularza sa wymagane');
    }

    if (!email.includes('@')) {
      throw new Error('Nieprawidłowy adres email');
    }

    try {
      await this.emailService.sendContactEmail(name, email, message);
      return { success: true, message: 'Wiadomość została wysłana pomyślnie' };
    } catch (error) {
      console.error('Contact form error:', error);
      throw new Error('Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.');
    }
  }
}
