import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TrustPromptService } from './trust-prompt.service';
import { ConfirmModalService } from '../ui/confirm-modal/confirm-modal.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';
import { ModerationService } from '../../core/services/moderation.service';
import { AssignSlotResult } from '../types';

function makeResult(overrides: Partial<AssignSlotResult> = {}): AssignSlotResult {
  return {
    id: 'p1',
    eventId: 'event1',
    userId: 'user1',
    wantsIn: true,
    isGuest: false,
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z',
    status: 'APPROVED',
    payment: null,
    needsTrustDecision: true,
    user: { id: 'user1', displayName: 'Jan Kowalski', email: 'jan@test.com' },
    ...overrides,
  } as AssignSlotResult;
}

describe('TrustPromptService', () => {
  let service: TrustPromptService;
  let confirmModal: { confirm: jest.Mock };
  let snackbar: { success: jest.Mock; error: jest.Mock; info: jest.Mock };
  let moderation: { trustUser: jest.Mock };

  beforeEach(() => {
    confirmModal = { confirm: jest.fn() };
    snackbar = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    moderation = { trustUser: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        TrustPromptService,
        { provide: ConfirmModalService, useValue: confirmModal },
        { provide: SnackbarService, useValue: snackbar },
        { provide: ModerationService, useValue: moderation },
      ],
    });

    service = TestBed.inject(TrustPromptService);
  });

  it('nie robi nic gdy needsTrustDecision=false', async () => {
    await service.promptTrustIfNeeded(makeResult({ needsTrustDecision: false }));

    expect(confirmModal.confirm).not.toHaveBeenCalled();
    expect(moderation.trustUser).not.toHaveBeenCalled();
  });

  it('oznacza uczestnika jako zaufanego po potwierdzeniu', async () => {
    confirmModal.confirm.mockResolvedValue(true);
    moderation.trustUser.mockReturnValue(of({}));

    await service.promptTrustIfNeeded(makeResult());

    expect(moderation.trustUser).toHaveBeenCalledWith('user1');
    expect(snackbar.success).toHaveBeenCalled();
  });

  it('nie oznacza i pokazuje info gdy organizator odmówi', async () => {
    confirmModal.confirm.mockResolvedValue(false);

    await service.promptTrustIfNeeded(makeResult());

    expect(moderation.trustUser).not.toHaveBeenCalled();
    expect(snackbar.info).toHaveBeenCalled();
  });

  it('pokazuje błąd gdy oznaczenie zaufania zawiedzie', async () => {
    confirmModal.confirm.mockResolvedValue(true);
    moderation.trustUser.mockReturnValue(throwError(() => new Error('fail')));

    await service.promptTrustIfNeeded(makeResult());

    expect(snackbar.error).toHaveBeenCalled();
  });
});
