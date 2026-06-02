import { NotificationKind } from '@prisma/client';
import { NOTIFICATION_POLICIES } from './notification-policy';

describe('NotificationPolicy', () => {
  it('should have a policy entry for every NotificationKind', () => {
    const kinds = Object.values(NotificationKind);
    const policyKeys = Object.keys(NOTIFICATION_POLICIES) as NotificationKind[];

    const missing = kinds.filter((kind) => !policyKeys.includes(kind));

    if (missing.length > 0) {
      throw new Error(`Missing policy entries for NotificationKind: ${missing.join(', ')}`);
    }
  });
});
