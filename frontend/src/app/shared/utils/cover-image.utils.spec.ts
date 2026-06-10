jest.mock('../../../environments/environment', () => ({
  environment: {
    mediaUrl: 'https://env-bucket.r2.dev',
    publicMediaUrl: 'https://public-bucket.r2.dev',
  },
}));

import { buildCoverImageUrl, DEFAULT_COVER_IMAGE_URL, CoverImage } from './cover-image.utils';

function makeCover(overrides: Partial<CoverImage> = {}): CoverImage {
  return {
    id: 'c1',
    filename: 'f.webp',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildCoverImageUrl', () => {
  it('cover publiczny (cover-images/<discipline>/...) leci z publicMediaUrl', () => {
    const cover = makeCover({ storageKey: 'cover-images/football/uuid.webp' });

    expect(buildCoverImageUrl(cover)).toBe(
      'https://public-bucket.r2.dev/cover-images/football/uuid.webp',
    );
  });

  it('cover prywatny usera (cover-images/user/...) leci z per-env mediaUrl', () => {
    const cover = makeCover({ storageKey: 'cover-images/user/user-1/uuid.webp' });

    expect(buildCoverImageUrl(cover)).toBe(
      'https://env-bucket.r2.dev/cover-images/user/user-1/uuid.webp',
    );
  });

  it('dokłada cache-buster z updatedAt', () => {
    const cover = makeCover({
      storageKey: 'cover-images/football/uuid.webp',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });

    const expectedV = new Date('2026-02-01T00:00:00.000Z').getTime();
    expect(buildCoverImageUrl(cover)).toBe(
      `https://public-bucket.r2.dev/cover-images/football/uuid.webp?v=${expectedV}`,
    );
  });

  it('brak storageKey → lokalny default', () => {
    expect(buildCoverImageUrl(makeCover({ storageKey: null }))).toBe(DEFAULT_COVER_IMAGE_URL);
    expect(buildCoverImageUrl(makeCover())).toBe(DEFAULT_COVER_IMAGE_URL);
  });
});
