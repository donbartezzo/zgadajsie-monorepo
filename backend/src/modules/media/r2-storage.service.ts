import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Wybór bucketa:
 * - 'env'    - bucket per środowisko (prod/dev): dane userów, media eventów
 * - 'public' - wspólny bucket publiczny: covery dyscyplin zarządzane przez admina
 */
export type StorageScope = 'env' | 'public';

// Klucze są content-addressed (UUID, nowy przy replace), więc treść pod danym URL
// nigdy się nie zmienia - można cache'ować immutable na rok.
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Injectable()
export class R2StorageService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;
  private publicBucket: string;
  private publicBucketUrl: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('R2_BUCKET_NAME', 'zgadajsie');
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');
    this.publicBucket = this.configService.get<string>('R2_PUBLIC_BUCKET_NAME', '');
    this.publicBucketUrl = this.configService.get<string>('R2_PUBLIC_BUCKET_URL', '');
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${this.configService.get<string>(
        'R2_ACCOUNT_ID',
      )}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
    scope: StorageScope = 'env',
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketFor(scope),
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE_CONTROL,
      }),
    );
    return this.getPublicUrl(key, scope);
  }

  async delete(key: string, scope: StorageScope = 'env'): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketFor(scope),
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string, scope: StorageScope = 'env'): string {
    const base = scope === 'public' ? this.publicBucketUrl : this.publicUrl;
    return `${base}/${key}`;
  }

  private bucketFor(scope: StorageScope): string {
    return scope === 'public' ? this.publicBucket : this.bucket;
  }
}
