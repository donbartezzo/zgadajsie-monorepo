import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Poprawka: rzutowanie na any, aby uniknąć błędu typów
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
