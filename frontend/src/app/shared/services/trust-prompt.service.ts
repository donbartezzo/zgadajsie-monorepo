import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmModalService } from '../ui/confirm-modal/confirm-modal.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';
import { ModerationService } from '../../core/services/moderation.service';
import { AssignSlotResult } from '../types';

/**
 * Po przydzieleniu slotu przez organizatora pyta go, czy oznaczyć
 * niezaufanego uczestnika jako zaufanego. Zaufanie nie jest już nadawane
 * automatycznie - decyzja należy zawsze do organizatora.
 */
@Injectable({ providedIn: 'root' })
export class TrustPromptService {
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly snackbar = inject(SnackbarService);
  private readonly moderationService = inject(ModerationService);

  async promptTrustIfNeeded(result: AssignSlotResult): Promise<void> {
    if (!result.needsTrustDecision) {
      return;
    }

    const name = result.user?.displayName ?? 'Ten uczestnik';
    const confirmed = await this.confirmModal.confirm({
      title: 'Oznaczyć uczestnika jako zaufanego?',
      message:
        `${name} nie jest jeszcze oznaczony jako zaufany. ` +
        'Zaufani uczestnicy mogą samodzielnie zajmować wolne miejsca/sloty w wydarzeniu, ' +
        'bez potrzeby Twojego ręcznego zatwierdzania (tak, jak w tej chwili). Możesz oznaczyć go jako zaufanego teraz lub ' +
        'zrobić to później w panelu uczestnika.',
      confirmLabel: 'Tak, oznacz',
      cancelLabel: 'Nie, nie oznaczaj',
      color: 'success',
    });

    if (!confirmed) {
      this.snackbar.info('Uczestnik pozostał nieoznaczony jako zaufany');
      return;
    }

    try {
      await firstValueFrom(this.moderationService.trustUser(result.userId));
      this.snackbar.success('Uczestnik oznaczony jako zaufany');
    } catch {
      this.snackbar.error('Nie udało się oznaczyć uczestnika jako zaufanego');
    }
  }
}
