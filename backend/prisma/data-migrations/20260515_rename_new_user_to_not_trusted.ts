import { PrismaClient } from '@prisma/client';

/**
 * Data migration: rename waitingReason 'NEW_USER' to 'NOT_TRUSTED'
 *
 * This aligns with the refactoring that eliminates confusing "new user" terminology
 * in favor of a clearer "not trusted" status that matches the boolean isTrusted field.
 *
 * Run manually before deploying the new code version (new code doesn't know 'NEW_USER').
 */

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration: NEW_USER → NOT_TRUSTED...');

  const result = await prisma.eventEnrollment.updateMany({
    where: {
      waitingReason: 'NEW_USER',
    },
    data: {
      waitingReason: 'NOT_TRUSTED',
    },
  });

  console.log(`✅ Migration complete: ${result.count} records updated`);

  // Verification
  const remaining = await prisma.eventEnrollment.count({
    where: {
      waitingReason: 'NEW_USER',
    },
  });

  if (remaining > 0) {
    console.warn(`⚠️  Warning: ${remaining} records still have waitingReason='NEW_USER'`);
  } else {
    console.log('✅ Verification passed: no records with waitingReason="NEW_USER"');
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
