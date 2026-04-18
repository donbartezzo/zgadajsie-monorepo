import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificationService } from '../services/notification.service';
import { ProfileBroadcastService } from '../services/profile-broadcast.service';
import { EMPTY, Subject } from 'rxjs';

const mockRouter = { navigate: jest.fn().mockResolvedValue(true) };
const mockNotificationService = { initPushSubscription: jest.fn() };

class MockProfileBroadcastService {
  private subject = new Subject<any>();
  changes$ = this.subject.asObservable();
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ProfileBroadcastService, useClass: MockProfileBroadcastService },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    jest.clearAllMocks();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ─── Computed signals ───────────────────────────────────────────────────

  describe('computed signals', () => {
    it('isLoggedIn=false gdy currentUser=null', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('isLoggedIn=true gdy currentUser ustawiony', () => {
      service.currentUser.set({ id: 'u1', email: 'user@test.com', role: 'USER' } as any);
      expect(service.isLoggedIn()).toBe(true);
    });

    it('isAdmin=false dla roli USER', () => {
      service.currentUser.set({ id: 'u1', email: 'user@test.com', role: 'USER' } as any);
      expect(service.isAdmin()).toBe(false);
    });

    it('isAdmin=true dla roli ADMIN', () => {
      service.currentUser.set({ id: 'u1', email: 'admin@test.com', role: 'ADMIN' } as any);
      expect(service.isAdmin()).toBe(true);
    });
  });

  // ─── localStorage tokens ────────────────────────────────────────────────

  describe('getAccessToken()', () => {
    it('zwraca null gdy brak tokenu', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('zwraca token z localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(service.getAccessToken()).toBe('test-token');
    });
  });

  // ─── login() ────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('zapisuje tokeny i ustawia currentUser', async () => {
      const loginPromise = service.login('user@test.com', 'Pass123!');

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      req.flush({
        accessToken: 'at1',
        refreshToken: 'rt1',
        user: { id: 'u1', email: 'user@test.com', role: 'USER' },
      });

      await loginPromise;

      expect(localStorage.getItem('accessToken')).toBe('at1');
      expect(localStorage.getItem('refreshToken')).toBe('rt1');
      expect(service.currentUser()?.email).toBe('user@test.com');
    });

    it('inicjuje push subscription po zalogowaniu', async () => {
      const loginPromise = service.login('user@test.com', 'Pass123!');

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      req.flush({
        accessToken: 'at1',
        refreshToken: 'rt1',
        user: { id: 'u1', email: 'user@test.com', role: 'USER' },
      });

      await loginPromise;

      expect(mockNotificationService.initPushSubscription).toHaveBeenCalled();
    });
  });

  // ─── logout() ───────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('czyści tokeny, resetuje user i nawiguje do /auth/login', async () => {
      localStorage.setItem('accessToken', 'at1');
      localStorage.setItem('refreshToken', 'rt1');
      service.currentUser.set({ id: 'u1' } as any);

      await service.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  // ─── refreshToken() ─────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    it('zwraca null gdy brak refresh tokenu', async () => {
      const result = await service.refreshToken();
      expect(result).toBeNull();
    });

    it('aktualizuje tokeny i zwraca nowy accessToken', async () => {
      localStorage.setItem('refreshToken', 'old-rt');

      const promise = service.refreshToken();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/refresh'));
      req.flush({ accessToken: 'new-at', refreshToken: 'new-rt' });

      const result = await promise;

      expect(result).toBe('new-at');
      expect(localStorage.getItem('accessToken')).toBe('new-at');
    });

    it('czyści tokeny i zwraca null gdy refresh się nie powiedzie', async () => {
      localStorage.setItem('refreshToken', 'bad-rt');
      localStorage.setItem('accessToken', 'old-at');

      const promise = service.refreshToken();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/refresh'));
      req.error(new ErrorEvent('Network error'));

      const result = await promise;

      expect(result).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  // ─── fetchUser() ────────────────────────────────────────────────────────

  describe('fetchUser()', () => {
    it('ustawia currentUser po pobraniu', async () => {
      const promise = service.fetchUser();

      const req = httpMock.expectOne((r) => r.url.includes('/users/me'));
      req.flush({ id: 'u1', email: 'user@test.com', role: 'USER' });

      await promise;

      expect(service.currentUser()?.email).toBe('user@test.com');
    });

    it('czyści tokeny i user gdy GET /users/me się nie powiedzie', async () => {
      localStorage.setItem('accessToken', 'at1');
      service.currentUser.set({ id: 'u1' } as any);

      const promise = service.fetchUser();

      const req = httpMock.expectOne((r) => r.url.includes('/users/me'));
      req.error(new ErrorEvent('Unauthorized'));

      await promise;

      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  // ─── updateUser() ───────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('aktualizuje pola currentUser sygnałem', () => {
      service.currentUser.set({ id: 'u1', displayName: 'Old Name', role: 'USER' } as any);

      service.updateUser({ displayName: 'New Name' });

      expect(service.currentUser()?.displayName).toBe('New Name');
    });

    it('nie robi nic jeśli currentUser=null', () => {
      service.updateUser({ displayName: 'New Name' });
      expect(service.currentUser()).toBeNull();
    });
  });
});
