import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnrollmentParticipantActionsComponent } from './enrollment-participant-actions.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../ui/confirm-modal/confirm-modal.service';
import { EventAreaService } from '../../../../features/event/services/event-area.service';

const mockAuthService = {
  currentUser: jest.fn(),
};

const mockEventService = {
  confirmSlot: jest.fn(),
  leaveEnrollment: jest.fn(),
};

const mockSnackbarService = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

const mockConfirmModalService = {
  confirm: jest.fn(),
};

const mockEventAreaService = {
  canJoin: jest.fn(),
  requestLeave: jest.fn(),
  openChangeRoleWizardForParticipant: jest.fn(),
  rejoinParticipantDirect: jest.fn(),
};

describe('EnrollmentParticipantActionsComponent', () => {
  let component: EnrollmentParticipantActionsComponent;
  let fixture: ComponentFixture<EnrollmentParticipantActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentParticipantActionsComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EventService, useValue: mockEventService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: ConfirmModalService, useValue: mockConfirmModalService },
        { provide: EventAreaService, useValue: mockEventAreaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentParticipantActionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
