import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventService } from './event.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl + '/events';

describe('EventService', () => {
  let service: EventService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EventService],
    });
    service = TestBed.inject(EventService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getEvents()', () => {
    it('wysyła GET /events z parametrami paginacji', () => {
      service.getEvents({ page: 2, limit: 10, citySlug: 'warszawa' }).subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === API &&
          r.params.get('page') === '2' &&
          r.params.get('limit') === '10' &&
          r.params.get('citySlug') === 'warszawa',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0, page: 2, limit: 10 });
    });

    it('wysyła GET /events bez parametrów gdy brak query', () => {
      service.getEvents().subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('getEvent()', () => {
    it('wysyła GET /events/:id', () => {
      service.getEvent('event1').subscribe();

      const req = httpMock.expectOne(`${API}/event1`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'event1' });
    });
  });

  describe('createEvent()', () => {
    it('wysyła POST /events z danymi', () => {
      const eventData = { title: 'New Event' };
      service.createEvent(eventData).subscribe();

      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(eventData);
      req.flush({ id: 'new-event' });
    });
  });

  describe('joinEvent()', () => {
    it('wysyła POST /events/:id/join bez roleKey', () => {
      service.joinEvent('event1').subscribe();

      const req = httpMock.expectOne(`${API}/event1/join`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ id: 'p1', status: 'PENDING' });
    });

    it('wysyła POST /events/:id/join z roleKey', () => {
      service.joinEvent('event1', 'gracz').subscribe();

      const req = httpMock.expectOne(`${API}/event1/join`);
      expect(req.request.body).toEqual({ roleKey: 'gracz' });
      req.flush({ id: 'p1', status: 'PENDING' });
    });
  });

  describe('cancelEvent()', () => {
    it('wysyła POST /events/:id/cancel', () => {
      service.cancelEvent('event1').subscribe();

      const req = httpMock.expectOne(`${API}/event1/cancel`);
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'event1', status: 'CANCELLED' });
    });
  });

  describe('updateEvent()', () => {
    it('wysyła PATCH /events/:id', () => {
      service.updateEvent('event1', { title: 'Updated' }).subscribe();

      const req = httpMock.expectOne(`${API}/event1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Updated' });
      req.flush({ id: 'event1', title: 'Updated' });
    });
  });
});
