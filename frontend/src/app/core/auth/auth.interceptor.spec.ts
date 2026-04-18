import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { firstValueFrom } from 'rxjs';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let mockAuthService: {
    getAccessToken: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    mockAuthService = {
      getAccessToken: jest.fn().mockReturnValue(null),
      refreshToken: jest.fn().mockResolvedValue(null),
      logout: jest.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dodaje nagłówek Authorization gdy token dostępny', () => {
    mockAuthService.getAccessToken.mockReturnValue('valid-token');

    http.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-token');
    req.flush({});
  });

  it('nie dodaje nagłówka Authorization dla /auth/refresh', () => {
    mockAuthService.getAccessToken.mockReturnValue('valid-token');

    http.post('/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });

  it('nie dodaje nagłówka gdy brak tokenu', () => {
    mockAuthService.getAccessToken.mockReturnValue(null);

    http.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });

  it('przy błędzie 401 poza /auth/ → próbuje refresh i ponawia request', fakeAsync(() => {
    mockAuthService.getAccessToken.mockReturnValue('expired-token');
    mockAuthService.refreshToken.mockResolvedValue('new-token');

    http.get('/api/data').subscribe({ error: () => {} });

    // Original request returns 401
    const firstReq = httpMock.expectOne('/api/data');
    firstReq.error(new ErrorEvent('error'), { status: 401 });

    // Flush the promise (refreshToken)
    flushMicrotasks();

    // Retry after refresh
    const retryReq = httpMock.expectOne('/api/data');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryReq.flush({ data: 'ok' });
  }));

  it('przy błędzie 401 i nieudanym refresh → wywołuje logout', fakeAsync(() => {
    mockAuthService.getAccessToken.mockReturnValue('expired-token');
    mockAuthService.refreshToken.mockResolvedValue(null);

    http.get('/api/data').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/data');
    req.error(new ErrorEvent('error'), { status: 401 });

    flushMicrotasks();

    expect(mockAuthService.logout).toHaveBeenCalled();
  }));
});
