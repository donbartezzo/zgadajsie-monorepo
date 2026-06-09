import { getMediaUrl } from './runtime-config.util';
import { environment } from '../../../environments/environment';

describe('getMediaUrl', () => {
  const globalRef = globalThis as { __APP_CONFIG__?: { mediaUrl?: string } };

  afterEach(() => {
    delete globalRef.__APP_CONFIG__;
  });

  it('zwraca wartość runtime gdy ustawiona', () => {
    globalRef.__APP_CONFIG__ = { mediaUrl: 'https://pub-runtime.r2.dev' };
    expect(getMediaUrl()).toBe('https://pub-runtime.r2.dev');
  });

  it('ignoruje niepodstawiony placeholder i używa build-time fallbacku', () => {
    globalRef.__APP_CONFIG__ = { mediaUrl: '${MEDIA_URL}' };
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });

  it('używa build-time fallbacku gdy brak __APP_CONFIG__', () => {
    delete globalRef.__APP_CONFIG__;
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });

  it('używa build-time fallbacku gdy runtime mediaUrl jest pusty', () => {
    globalRef.__APP_CONFIG__ = { mediaUrl: '' };
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });
});
