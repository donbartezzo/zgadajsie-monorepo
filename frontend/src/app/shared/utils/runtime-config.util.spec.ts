import { getMediaUrl, setRuntimeMediaUrl } from './runtime-config.util';
import { environment } from '../../../environments/environment';

describe('runtime media url', () => {
  afterEach(() => {
    setRuntimeMediaUrl(null);
  });

  it('zwraca wartość ustawioną z /api/config', () => {
    setRuntimeMediaUrl('https://pub-runtime.r2.dev');
    expect(getMediaUrl()).toBe('https://pub-runtime.r2.dev');
  });

  it('używa build-time fallbacku gdy wartość nie została ustawiona', () => {
    setRuntimeMediaUrl(null);
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });

  it('używa build-time fallbacku gdy wartość jest pusta', () => {
    setRuntimeMediaUrl('');
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });

  it('używa build-time fallbacku gdy wartość jest undefined', () => {
    setRuntimeMediaUrl(undefined);
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });
});
