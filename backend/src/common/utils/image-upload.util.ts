import { BadRequestException } from '@nestjs/common';
import fileType from 'file-type';

export const COVER_IMAGE_ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const COVER_IMAGE_MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB

export async function validateImageBuffer(buffer: Buffer): Promise<void> {
  const type = await fileType.fromBuffer(buffer);
  if (!type || !COVER_IMAGE_ACCEPTED_MIMES.includes(type.mime as any)) {
    throw new BadRequestException('Niedozwolony format pliku');
  }
}
