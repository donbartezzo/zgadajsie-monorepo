import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CoverImageService } from './cover-image.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl + '/cover-images';

describe('CoverImageService', () => {
  let service: CoverImageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CoverImageService],
    });
    service = TestBed.inject(CoverImageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getMy()', () => {
    it('wysyła GET /cover-images/my', () => {
      service.getMy().subscribe();

      const req = httpMock.expectOne(`${API}/my`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('createMy()', () => {
    it('wysyła POST /cover-images/my z FormData (file + name)', () => {
      const file = new File(['blob'], 'test.webp', { type: 'image/webp' });
      service.createMy(file, 'Mój cover').subscribe();

      const req = httpMock.expectOne(`${API}/my`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({ id: 'cover-1' });
    });
  });

  describe('renameMy()', () => {
    it('wysyła PATCH /cover-images/my/:id z name', () => {
      service.renameMy('cover-1', 'Nowa nazwa').subscribe();

      const req = httpMock.expectOne(`${API}/my/cover-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ name: 'Nowa nazwa' });
      req.flush({ id: 'cover-1', name: 'Nowa nazwa' });
    });
  });

  describe('replaceMyImage()', () => {
    it('wysyła PUT /cover-images/my/:id/image z FormData', () => {
      const file = new File(['blob'], 'replaced.webp', { type: 'image/webp' });
      service.replaceMyImage('cover-1', file).subscribe();

      const req = httpMock.expectOne(`${API}/my/cover-1/image`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({ id: 'cover-1' });
    });
  });

  describe('removeMy()', () => {
    it('wysyła DELETE /cover-images/my/:id', () => {
      service.removeMy('cover-1').subscribe();

      const req = httpMock.expectOne(`${API}/my/cover-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('getMyUsage()', () => {
    it('wysyła GET /cover-images/my/:id/usage', () => {
      service.getMyUsage('cover-1').subscribe();

      const req = httpMock.expectOne(`${API}/my/cover-1/usage`);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 3 });
    });
  });
});
