import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DisciplineProfileService } from './discipline-profile.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('DisciplineProfileService - HTTP', () => {
  let service: DisciplineProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DisciplineProfileService],
    });
    service = TestBed.inject(DisciplineProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMine() → GET /discipline-profiles/me', () => {
    service.getMine().subscribe();
    const req = httpMock.expectOne(`${API}/discipline-profiles/me`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getMineForDiscipline() → GET /discipline-profiles/me/:slug', () => {
    service.getMineForDiscipline('football').subscribe();
    const req = httpMock.expectOne(`${API}/discipline-profiles/me/football`);
    expect(req.request.method).toBe('GET');
    req.flush(null);
  });

  it('upsert() → PUT /discipline-profiles/me/:slug z payloadem', () => {
    const payload = { levelSlug: 'regular', bio: 'Gram od lat.' };
    service.upsert('football', payload).subscribe();
    const req = httpMock.expectOne(`${API}/discipline-profiles/me/football`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'p1' });
  });

  it('getMyStats() → GET /users/me/stats', () => {
    service.getMyStats().subscribe();
    const req = httpMock.expectOne(`${API}/users/me/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({ registeredAt: null, totalEnrollments: 0, completedWithSlot: 0, trustedByCount: 0 });
  });
});
