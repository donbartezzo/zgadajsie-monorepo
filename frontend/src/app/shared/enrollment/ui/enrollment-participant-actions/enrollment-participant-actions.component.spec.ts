import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { EnrollmentParticipantActionsComponent } from './enrollment-participant-actions.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventService } from '../../../../core/services/event.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../ui/confirm-modal/confirm-modal.service';
import { EventAreaService } from '../../../../features/event/services/event-area.service';
import { Enrollment } from '../../../types';
import { Event } from '../../../types/event.interface';
import { of, throwError } from 'rxjs';

describe('EnrollmentParticipantActionsComponent', () => {
  let component: EnrollmentParticipantActionsComponent;
  let fixture: ComponentFixture<EnrollmentParticipantActionsComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
  let mockConfirmModalService: jasmine.SpyObj<ConfirmModalService>;
  let mockEventAreaService: jasmine.SpyObj<EventAreaService>;

  const mockParticipant: Enrollment = {
    id: '1',
    userId: 'user1',
    eventId: 'event1',
    status: 'APPROVED',
    isGuest: false,
    slot: {
      id: 'slot1',
      confirmed: false,
      roleKey: null,
      locked: false,
      enrollmentId: '1',
      assignedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    user: { id: 'user1', displayName: 'Test User', email: 'test@example.com', avatarSeed: 'seed' },
    createdAt: new Date().toISOString(),
    wantsIn: false,
    updatedAt: new Date().toISOString(),
    payment: null,
  };

  const mockEvent: Event = {
    id: 'event1',
    title: 'Test Event',
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 3600000).toISOString(),
    status: 'ACTIVE',
    organizerId: 'org1',
    costPerPerson: 0,
    maxParticipants: 10,
    city: {
      name: 'Warszawa',
      slug: 'warszawa',
      province: 'mazowieckie',
      lat: 52.2297,
      lng: 21.0122,
      priority: 1,
      isActive: true,
    },
  };

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['currentUser']);
    mockEventService = jasmine.createSpyObj('EventService', ['confirmSlot', 'leaveEnrollment']);
    mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['success', 'error', 'info']);
    mockConfirmModalService = jasmine.createSpyObj('ConfirmModalService', ['confirm']);
    mockEventAreaService = jasmine.createSpyObj('EventAreaService', [
      'canJoin',
      'requestLeave',
      'openChangeRoleWizardForParticipant',
      'rejoinParticipantDirect',
    ]);

    await TestBed.configureTestingModule({
      imports: [EnrollmentParticipantActionsComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EventService, useValue: mockEventService },
        { provide: SnackbarService, useValue: mockSnackbarService },
        { provide: ConfirmModalService, useValue: mockConfirmModalService },
        { provide: EventAreaService, useValue: mockEventAreaService },
        provideMockStore({}),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentParticipantActionsComponent);
    component = fixture.componentInstance;

    TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
      set: {
        inputs: {
          participant: mockParticipant,
          event: mockEvent,
        },
      },
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('needsConfirmation', () => {
    it('should return true for APPROVED participant with unconfirmed slot', () => {
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });

      expect(component.needsConfirmation()).toBe(true);
    });

    it('should return false for CONFIRMED participant', () => {
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: {
              ...mockParticipant,
              status: 'CONFIRMED',
              slot: { ...mockParticipant.slot, confirmed: true },
            },
            event: mockEvent,
          },
        },
      });
      fixture.detectChanges();
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });

      expect(component.needsConfirmation()).toBe(false);
    });

    it('should return false for other user participant', () => {
      mockAuthService.currentUser.and.returnValue({ id: 'user2' });

      expect(component.needsConfirmation()).toBe(false);
    });
  });

  describe('canChangeRole', () => {
    it('should return true for own participant with event roles', () => {
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: mockParticipant,
            event: {
              ...mockEvent,
              roleConfig: { roles: [{ key: 'role1', title: 'Role 1', capacity: 5 }] },
            },
          },
        },
      });
      fixture.detectChanges();

      expect(component.canChangeRole()).toBe(true);
    });

    it('should return false when event has no roles', () => {
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });

      expect(component.canChangeRole()).toBe(false);
    });
  });

  describe('canLeave', () => {
    it('should return true for active participant', () => {
      expect(component.canLeave()).toBe(true);
    });

    it('should return false for withdrawn participant', () => {
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: { ...mockParticipant, status: 'WITHDRAWN' },
            event: mockEvent,
          },
        },
      });
      fixture.detectChanges();

      expect(component.canLeave()).toBe(false);
    });
  });

  describe('onConfirmSlot', () => {
    it('should confirm slot and emit actionCompleted on success', async () => {
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      mockEventService.confirmSlot.and.returnValue(of({}));
      const actionCompletedSpy = spyOn(component.actionCompleted, 'emit');

      await component.onConfirmSlot();

      expect(mockEventService.confirmSlot).toHaveBeenCalledWith('1');
      expect(mockSnackbarService.success).toHaveBeenCalledWith('Uczestnictwo potwierdzone!');
      expect(actionCompletedSpy).toHaveBeenCalled();
    });

    it('should show error on failure', async () => {
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      mockEventService.confirmSlot.and.returnValue(
        throwError(() => ({ error: { message: 'Error' } })),
      );

      await component.onConfirmSlot();

      expect(mockSnackbarService.error).toHaveBeenCalledWith('Error');
    });
  });

  describe('onChangeRole', () => {
    it('should emit closeRequested and open wizard', async () => {
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: { ...mockParticipant, status: 'CONFIRMED' },
            event: {
              ...mockEvent,
              roleConfig: { roles: [{ key: 'role1', title: 'Role 1', capacity: 5 }] },
            },
          },
        },
      });
      fixture.detectChanges();
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      mockConfirmModalService.confirm.and.returnValue(Promise.resolve(true));
      const closeRequestedSpy = spyOn(component.closeRequested, 'emit');

      await component.onChangeRole();

      expect(mockConfirmModalService.confirm).toHaveBeenCalled();
      expect(closeRequestedSpy).toHaveBeenCalled();
      expect(mockEventAreaService.openChangeRoleWizardForParticipant).toHaveBeenCalled();
    });

    it('should not proceed if confirm is cancelled', async () => {
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: { ...mockParticipant, status: 'CONFIRMED' },
            event: {
              ...mockEvent,
              roleConfig: { roles: [{ key: 'role1', title: 'Role 1', capacity: 5 }] },
            },
          },
        },
      });
      fixture.detectChanges();
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      mockConfirmModalService.confirm.and.returnValue(Promise.resolve(false));
      const closeRequestedSpy = spyOn(component.closeRequested, 'emit');

      await component.onChangeRole();

      expect(closeRequestedSpy).not.toHaveBeenCalled();
      expect(mockEventAreaService.openChangeRoleWizardForParticipant).not.toHaveBeenCalled();
    });
  });

  describe('onLeave', () => {
    it('should emit closeRequested and call requestLeave', async () => {
      const closeRequestedSpy = spyOn(component.closeRequested, 'emit');
      mockEventAreaService.requestLeave.and.returnValue(Promise.resolve());

      await component.onLeave();

      expect(closeRequestedSpy).toHaveBeenCalled();
      expect(mockEventAreaService.requestLeave).toHaveBeenCalled();
    });
  });

  describe('onRemoveGuest', () => {
    it('should remove guest and emit actionCompleted on success', async () => {
      const guestParticipant = {
        ...mockParticipant,
        isGuest: true,
        addedByUser: {
          id: 'user1',
          displayName: 'Test User',
          email: 'test@example.com',
          avatarSeed: 'seed',
        },
      };
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: guestParticipant,
            event: mockEvent,
          },
        },
      });
      fixture.detectChanges();
      mockConfirmModalService.confirm.and.returnValue(Promise.resolve(true));
      mockEventService.leaveEnrollment.and.returnValue(of({}));
      const actionCompletedSpy = spyOn(component.actionCompleted, 'emit');

      await component.onRemoveGuest();

      expect(mockConfirmModalService.confirm).toHaveBeenCalled();
      expect(mockEventService.leaveEnrollment).toHaveBeenCalledWith('1');
      expect(mockSnackbarService.info).toHaveBeenCalledWith('Gość wypisany z wydarzenia');
      expect(actionCompletedSpy).toHaveBeenCalled();
    });

    it('should not proceed if confirm is cancelled', async () => {
      const guestParticipant = {
        ...mockParticipant,
        isGuest: true,
        addedByUser: {
          id: 'user1',
          displayName: 'Test User',
          email: 'test@example.com',
          avatarSeed: 'seed',
        },
      };
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: guestParticipant,
            event: mockEvent,
          },
        },
      });
      fixture.detectChanges();
      mockConfirmModalService.confirm.and.returnValue(Promise.resolve(false));
      const actionCompletedSpy = spyOn(component.actionCompleted, 'emit');

      await component.onRemoveGuest();

      expect(mockEventService.leaveEnrollment).not.toHaveBeenCalled();
      expect(actionCompletedSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRejoin', () => {
    it('should emit closeRequested and call rejoinParticipantDirect when no roles', () => {
      const withdrawnParticipant = { ...mockParticipant, status: 'WITHDRAWN' };
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: withdrawnParticipant,
            event: mockEvent,
          },
        },
      });
      fixture.detectChanges();
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      mockEventAreaService.canJoin.and.returnValue(true);
      const closeRequestedSpy = spyOn(component.closeRequested, 'emit');

      component.onRejoin();

      expect(closeRequestedSpy).toHaveBeenCalled();
      expect(mockEventAreaService.rejoinParticipantDirect).toHaveBeenCalledWith(
        withdrawnParticipant,
      );
    });

    it('should emit closeRequested and open wizard when event has roles', () => {
      const withdrawnParticipant = { ...mockParticipant, status: 'WITHDRAWN' };
      TestBed.overrideComponent(EnrollmentParticipantActionsComponent, {
        set: {
          inputs: {
            participant: withdrawnParticipant,
            event: {
              ...mockEvent,
              roleConfig: { roles: [{ key: 'role1', title: 'Role 1', capacity: 5 }] },
            },
          },
        },
      });
      fixture.detectChanges();
      mockAuthService.currentUser.and.returnValue({ id: 'user1' });
      mockEventAreaService.canJoin.and.returnValue(true);
      const closeRequestedSpy = spyOn(component.closeRequested, 'emit');

      component.onRejoin();

      expect(closeRequestedSpy).toHaveBeenCalled();
      expect(mockEventAreaService.openChangeRoleWizardForParticipant).toHaveBeenCalledWith(
        withdrawnParticipant,
      );
    });
  });
});
