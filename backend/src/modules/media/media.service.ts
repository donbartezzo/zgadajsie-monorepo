import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from './r2-storage.service';
import { v4 as uuidv4 } from 'uuid';
import 'multer';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private r2: R2StorageService,
  ) {}

  async upload(userId: string, file: Express.Multer.File) {
    const count = await this.prisma.mediaFile.count({ where: { userId } });
    if (count >= 10) {
      throw new BadRequestException('Osiągnięto limit 10 plików');
    }

    const ext = file.originalname.split('.').pop();
    const key = `media/${userId}/${uuidv4()}.${ext}`;
    const url = await this.r2.upload(key, file.buffer, file.mimetype);

    return this.prisma.mediaFile.create({
      data: {
        userId,
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async getMyMedia(userId: string) {
    return this.prisma.mediaFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id, userId },
    });
    if (!file) throw new BadRequestException('Plik nie znaleziony');

    const key = file.url.split('/').slice(-3).join('/');
    await this.r2.delete(key);
    return this.prisma.mediaFile.delete({ where: { id } });
  }
}
