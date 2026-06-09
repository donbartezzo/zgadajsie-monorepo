import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export const COVER_IMAGE_ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const COVER_IMAGE_MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB

const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function validateImageBuffer(buffer: Buffer): Promise<void> {
  let mime: string | undefined;
  try {
    const meta = await sharp(buffer).metadata();
    mime = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  } catch {
    throw new BadRequestException('Niedozwolony format pliku');
  }
  if (!mime || !COVER_IMAGE_ACCEPTED_MIMES.includes(mime as any)) {
    throw new BadRequestException('Niedozwolony format pliku');
  }
}
