import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MyCoverImagesComponent } from './my-cover-images.component';
import { CoverImageService } from '../../../../core/services/cover-image.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { CoverImage } from '../../../../shared/types';
import { USER_COVER_IMAGE_LIMIT } from '@zgadajsie/shared';

const makeCover = (overrides: Partial<CoverImage> = {}): CoverImage => ({
  id: 'cover-1',
  filename: 'test.webp',
  storageKey: 'cover-images/user/user-1/uuid.webp',
  ownerUserId: 'user-1',
  name: 'Mój cover',
  isDefault: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const mockCoverImageService = {
  getMy: jest.fn(),
  createMy: jest.fn(),
  renameMy: jest.fn(),
  replaceMyImage: jest.fn(),
  removeMy: jest.fn(),
  getMyUsage: jest.fn(),
};

const mockSnackbar = {
  success: jest.fn(),
  error: jest.fn(),
};

const mockConfirmModal = {
  confirm: jest.fn(),
};

describe('MyCoverImagesComponent', () => {
  let fixture: ComponentFixture<MyCoverImagesComponent>;
  let component: MyCoverImagesComponent;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCoverImageService.getMy.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [MyCoverImagesComponent],
      providers: [
        provideRouter([]),
        { provide: CoverImageService, useValue: mockCoverImageService },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: ConfirmModalService, useValue: mockConfirmModal },
      ],
    })
      .overrideComponent(MyCoverImagesComponent, {
        set: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MyCoverImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('tworzy komponent', () => {
    expect(component).toBeTruthy();
  });

  it('ładuje cover images przy inicjalizacji', () => {
    expect(mockCoverImageService.getMy).toHaveBeenCalled();
  });

  it('emptySlots() zwraca odpowiednią liczbę pustych slotów', () => {
    const covers = [makeCover(), makeCover({ id: 'cover-2' })];
    component.covers.set(covers);
    expect(component.emptySlots().length).toBe(USER_COVER_IMAGE_LIMIT - 2);
  });

  it('emptySlots() zwraca 0 gdy galeria pełna', () => {
    const covers = Array.from({ length: USER_COVER_IMAGE_LIMIT }, (_, i) =>
      makeCover({ id: `cover-${i}` }),
    );
    component.covers.set(covers);
    expect(component.emptySlots().length).toBe(0);
  });

  describe('onRename()', () => {
    it('wywołuje renameMy i pokazuje snackbar.success', fakeAsync(() => {
      const cover = makeCover({ name: 'Nowa nazwa' });
      mockCoverImageService.renameMy.mockReturnValue(of(cover));

      component.onRename(cover);
      tick();

      expect(mockCoverImageService.renameMy).toHaveBeenCalledWith('cover-1', 'Nowa nazwa');
      expect(mockSnackbar.success).toHaveBeenCalledWith('Nazwa zmieniona');
    }));

    it('pokazuje snackbar.error gdy nazwa za krótka', () => {
      const cover = makeCover({ name: 'ab' });
      component.onRename(cover);
      expect(mockSnackbar.error).toHaveBeenCalled();
      expect(mockCoverImageService.renameMy).not.toHaveBeenCalled();
    });
  });

  describe('onDelete()', () => {
    it('usuwa cover image gdy nie jest używany w żadnym wydarzeniu', fakeAsync(async () => {
      const cover = makeCover();
      mockCoverImageService.getMyUsage.mockReturnValue(of({ count: 0 }));
      mockCoverImageService.removeMy.mockReturnValue(of(undefined));
      mockCoverImageService.getMy.mockReturnValue(of([]));
      mockConfirmModal.confirm.mockResolvedValue(true);

      await component.onDelete(cover);
      tick();

      expect(mockConfirmModal.confirm).toHaveBeenCalledWith({
        title: 'Usuń cover image',
        message: 'Czy na pewno chcesz usunąć ten cover image?',
        confirmLabel: 'Usuń',
        cancelLabel: 'Anuluj',
        color: 'danger',
        showIcon: true,
      });
      expect(mockCoverImageService.removeMy).toHaveBeenCalledWith('cover-1');
      expect(mockSnackbar.success).toHaveBeenCalledWith('Cover image usunięty');
    }));

    it('nie usuwa gdy użytkownik anuluje dialog', fakeAsync(async () => {
      const cover = makeCover();
      mockCoverImageService.getMyUsage.mockReturnValue(of({ count: 0 }));
      mockConfirmModal.confirm.mockResolvedValue(false);

      await component.onDelete(cover);
      tick();

      expect(mockCoverImageService.removeMy).not.toHaveBeenCalled();
    }));

    it('otwiera dialog z ostrzeżeniem gdy cover jest używany w wydarzeniach', fakeAsync(async () => {
      const cover = makeCover();
      mockCoverImageService.getMyUsage.mockReturnValue(of({ count: 3 }));
      mockConfirmModal.confirm.mockResolvedValue(false);

      await component.onDelete(cover);
      tick();

      expect(mockConfirmModal.confirm).toHaveBeenCalledWith({
        title: 'Grafika jest używana',
        message: `Ta grafika jest obecnie używana w wydarzeniach (x3), więc bezpośrednie usunięcie nie jest możliwe, ale możesz podmienić ją na inną.`,
        confirmLabel: 'Podmień grafikę',
        cancelLabel: 'Anuluj',
        color: 'warning',
        showIcon: true,
      });
      expect(mockCoverImageService.removeMy).not.toHaveBeenCalled();
    }));

    it('pokazuje snackbar.error gdy getMyUsage zwraca błąd', fakeAsync(async () => {
      const cover = makeCover();
      mockCoverImageService.getMyUsage.mockReturnValue(throwError(() => new Error()));

      await component.onDelete(cover);
      tick();

      expect(mockSnackbar.error).toHaveBeenCalledWith('Nie udało się sprawdzić użycia');
    }));
  });
});
