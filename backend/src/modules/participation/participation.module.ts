import { Module } from '@nestjs/common';
import { ParticipationController } from './participation.controller';
import { ParticipationService } from './participation.service';
import { EnrollmentEligibilityService } from './enrollment-eligibility.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { SlotModule } from '../slots/slot.module';

@Module({
  imports: [NotificationsModule, PaymentsModule, SlotModule],
  controllers: [ParticipationController],
  providers: [ParticipationService, EnrollmentEligibilityService],
  exports: [ParticipationService, EnrollmentEligibilityService],
})
export class ParticipationModule {}
