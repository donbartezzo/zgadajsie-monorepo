import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// ngx-image-cropper uses URL.createObjectURL which is not available in jsdom
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(),
});
