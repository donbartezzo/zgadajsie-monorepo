import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

const mockAuthService = {
  getAccessToken: jest.fn().mockReturnValue('token'),
  currentUser: jest.fn().mockReturnValue({ id: 'user1', displayName: 'User One' }),
};

describe('ChatService — HTTP', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChatService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getHistory()', () => {
    it('wysyła GET /events/:id/chat/messages z parametrami paginacji', () => {
      service.getHistory('event1', 1, 50).subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${API}/events/event1/chat/messages` &&
          r.params.get('page') === '1' &&
          r.params.get('limit') === '50',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0 });
    });
  });

  describe('getMessageCount()', () => {
    it('wysyła GET /events/:id/chat/messages/count', () => {
      service.getMessageCount('event1').subscribe();

      const req = httpMock.expectOne(`${API}/events/event1/chat/messages/count`);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });
    });
  });

  describe('getPrivateHistory()', () => {
    it('wysyła GET /events/:id/chat/private/:userId/messages', () => {
      service.getPrivateHistory('event1', 'user2', 1, 30).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${API}/events/event1/chat/private/user2/messages`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0 });
    });
  });

  describe('getOrganizerConversations()', () => {
    it('wysyła GET /events/:id/chat/private/conversations', () => {
      service.getOrganizerConversations('event1').subscribe();

      const req = httpMock.expectOne(`${API}/events/event1/chat/private/conversations`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getMembers()', () => {
    it('wysyła GET /events/:id/chat/members', () => {
      service.getMembers('event1').subscribe();

      const req = httpMock.expectOne(`${API}/events/event1/chat/members`);
      expect(req.request.method).toBe('GET');
      req.flush({ members: [] });
    });
  });

  describe('onMessage() / onPrivateMessage()', () => {
    it('onMessage() zwraca Observable', () => {
      const obs = service.onMessage();
      expect(obs).toBeDefined();
    });

    it('onPrivateMessage() zwraca Observable', () => {
      const obs = service.onPrivateMessage();
      expect(obs).toBeDefined();
    });
  });
});
