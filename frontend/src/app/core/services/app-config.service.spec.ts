import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AppConfigService } from './app-config.service';
import { getMediaUrl, setRuntimeMediaUrl } from '../../shared/utils/runtime-config.util';
import { environment } from '../../../environments/environment';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppConfigService],
    });
    service = TestBed.inject(AppConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    setRuntimeMediaUrl(null);
  });

  it('ustawia mediaUrl z odpowiedzi /api/config', async () => {
    const promise = service.load();
    const req = httpMock.expectOne(`${environment.apiUrl}/config`);
    req.flush({ mediaUrl: 'https://pub-from-api.r2.dev' });
    await promise;
    expect(getMediaUrl()).toBe('https://pub-from-api.r2.dev');
  });

  it('przy błędzie zostawia build-time fallback', async () => {
    const promise = service.load();
    const req = httpMock.expectOne(`${environment.apiUrl}/config`);
    req.error(new ProgressEvent('error'));
    await promise;
    expect(getMediaUrl()).toBe(environment.mediaUrl ?? '');
  });
});
