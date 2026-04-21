import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventRoleConfig, AvailableRole } from './slot.types';
import { EventRealtimeService } from '../realtime/event-realtime.service';
import { isEventEnded } from '../events/event-time-status.util';
import {
  EVENT_ENDED_MESSAGE,
  SLOT_NOT_FOUND_MESSAGE,
  PARTICIPATION_NOT_FOUND_MESSAGE,
  USER_NOT_ORGANIZER_MESSAGE,
  PARTICIPANT_WITHDREW_MESSAGE,
  PARTICIPANT_ALREADY_HAS_SLOT_MESSAGE,
} from '@zgadajsie/shared';
import { AuthUserLike, resolveUserContext } from '../auth/utils/auth-user.util';

type SlotRoleConfig = {
  roles: Array<{
    key: string;
    slots: number;
  }>;
};

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventRealtime: EventRealtimeService,
  ) {}

  /**
   * Create slots for an event (called when event is created).
   * If roleConfig is provided, creates slots with roleKey assigned.
   */
  async createSlotsForEvent(
    eventId: string,
    count: number,
    roleConfig?: SlotRoleConfig | null,
  ): Promise<void> {
    if (roleConfig && roleConfig.roles.length > 0) {
      // Create slots per role
      const slots: Array<{
        id: string;
        eventId: string;
        enrollmentId: null;
        roleKey: string;
        confirmed: boolean;
        assignedAt: null;
      }> = [];

      for (const role of roleConfig.roles) {
        for (let i = 0; i < role.slots; i++) {
          slots.push({
            id: crypto.randomUUID(),
            eventId,
            enrollmentId: null,
            roleKey: role.key,
            confirmed: false,
            assignedAt: null,
          });
        }
      }

      await this.prisma.eventSlot.createMany({ data: slots });
      this.logger.log(
        `Created ${slots.length} role-based slots for event ${eventId}: ${roleConfig.roles
          .map((r) => `${r.key}:${r.slots}`)
          .join(', ')}`,
      );
    } else {
      // Create slots without roles (legacy behavior)
      const slots = Array.from({ length: count }, () => ({
        id: crypto.randomUUID(),
        eventId,
        enrollmentId: null,
        roleKey: null,
        confirmed: false,
        assignedAt: null,
      }));

      await this.prisma.eventSlot.createMany({ data: slots });
      this.logger.log(`Created ${count} slots for event ${eventId}`);
    }
  }

  /**
   * Atomically assign a free slot to a participation.
   * If roleKey is provided, only assigns a slot with matching roleKey.
   * Returns the assigned slot or null if no free slots available.
   */
  async assignSlot(
    eventId: string,
    participationId: string,
    confirmed = false,
    tx?: Prisma.TransactionClient,
    roleKey?: string | null,
  ): Promise<{ id: string; confirmed: boolean; assignedAt: Date; roleKey: string | null } | null> {
    const client = tx ?? this.prisma;

    // Find and update a free slot atomically
    // Using raw query for atomic "find first free and update" operation
    let result: { id: string }[];

    if (roleKey) {
      // Role-specific slot assignment (excludes locked slots)
      result = await client.$queryRaw<{ id: string }[]>`
        UPDATE "EventSlot"
        SET "participationId" = ${participationId},
            "confirmed" = ${confirmed},
            "assignedAt" = NOW()
        WHERE "id" = (
          SELECT "id" FROM "EventSlot"
          WHERE "eventId" = ${eventId}
            AND "participationId" IS NULL
            AND "locked" = false
            AND "roleKey" = ${roleKey}
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING "id"
      `;
    } else {
      // Any free unlocked slot (for events without roles or roleKey=null)
      result = await client.$queryRaw<{ id: string }[]>`
        UPDATE "EventSlot"
        SET "participationId" = ${participationId},
            "confirmed" = ${confirmed},
            "assignedAt" = NOW()
        WHERE "id" = (
          SELECT "id" FROM "EventSlot"
          WHERE "eventId" = ${eventId}
            AND "participationId" IS NULL
            AND "locked" = false
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING "id"
      `;
    }

    if (result.length === 0) {
      return null;
    }

    const slot = await client.eventSlot.findUnique({
      where: { id: result[0].id },
      select: { id: true, confirmed: true, assignedAt: true, roleKey: true },
    });

    return slot;
  }

  /**
   * Release a slot (set participationId to null).
   * Called when participant leaves or is removed.
   */
  async releaseSlot(participationId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx ?? this.prisma;

    const result = await client.eventSlot.updateMany({
      where: { enrollmentId: participationId },
      data: {
        enrollmentId: null,
        confirmed: false,
        assignedAt: null,
      },
    });

    return result.count > 0;
  }

  /**
   * Confirm a slot (set confirmed = true).
   * Called when user confirms their participation.
   */
  async confirmSlot(participationId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx ?? this.prisma;

    const result = await client.eventSlot.updateMany({
      where: { enrollmentId: participationId },
      data: { confirmed: true },
    });

    return result.count > 0;
  }

  /**
   * Get count of free slots for an event.
   * If roleKey is provided, counts only slots with that role.
   */
  async getFreeSlotCount(eventId: string, roleKey?: string | null): Promise<number> {
    const where: Prisma.EventSlotWhereInput = { eventId, enrollmentId: null, locked: false };
    if (roleKey !== undefined) {
      where.roleKey = roleKey;
    }
    return this.prisma.eventSlot.count({ where });
  }

  /**
   * Get free slot counts grouped by role.
   * Returns a map of roleKey -> freeCount.
   */
  async getFreeSlotsByRole(eventId: string): Promise<Map<string, number>> {
    const slots = await this.prisma.eventSlot.groupBy({
      by: ['roleKey'],
      where: { eventId, enrollmentId: null, locked: false },
      _count: { id: true },
    });

    const result = new Map<string, number>();
    for (const slot of slots) {
      result.set(slot.roleKey ?? '__default__', slot._count.id);
    }
    return result;
  }

  /**
   * Get count of occupied slots for an event.
   */
  async getOccupiedSlotCount(eventId: string): Promise<number> {
    return this.prisma.eventSlot.count({
      where: { eventId, enrollmentId: { not: null } },
    });
  }

  /**
   * Get total slot count for an event.
   */
  async getTotalSlotCount(eventId: string): Promise<number> {
    return this.prisma.eventSlot.count({ where: { eventId } });
  }

  /**
   * Add empty slots to an event (when maxParticipants is increased).
   * Optionally assign a roleKey to all new slots.
   */
  async addSlots(eventId: string, count: number, roleKey?: string | null): Promise<void> {
    if (count <= 0) {
      return;
    }

    const slots = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      eventId,
      enrollmentId: null,
      roleKey: roleKey ?? null,
      confirmed: false,
      assignedAt: null,
    }));

    await this.prisma.eventSlot.createMany({ data: slots });
    this.logger.log(
      `Added ${count} slots to event ${eventId}${roleKey ? ` (role: ${roleKey})` : ''}`,
    );
  }

  /**
   * Reconcile slots per role when roleConfig changes.
   * For each role: adds missing slots (with correct roleKey) or removes surplus empty slots.
   * Call this instead of adjustSlotsForMaxParticipants when the event has a roleConfig.
   */
  async reconcileSlotsForRoleConfig(eventId: string, roleConfig: SlotRoleConfig): Promise<void> {
    for (const role of roleConfig.roles) {
      const existing = await this.prisma.eventSlot.count({
        where: { eventId, roleKey: role.key },
      });
      const diff = role.slots - existing;

      if (diff > 0) {
        await this.addSlots(eventId, diff, role.key);
      } else if (diff < 0) {
        const toRemove = await this.prisma.eventSlot.findMany({
          where: { eventId, roleKey: role.key, enrollmentId: null },
          select: { id: true },
          orderBy: { locked: 'asc' },
          take: Math.abs(diff),
        });
        if (toRemove.length > 0) {
          await this.prisma.eventSlot.deleteMany({
            where: { id: { in: toRemove.map((s) => s.id) } },
          });
        }
      }
    }

    this.logger.log(
      `Reconciled role slots for event ${eventId}: ${roleConfig.roles.map((r) => `${r.key}:${r.slots}`).join(', ')}`,
    );
  }

  /**
   * Remove empty slots from an event (when maxParticipants is decreased).
   * Only removes unoccupied slots. Returns number of slots actually removed.
   */
  async removeEmptySlots(eventId: string, count: number): Promise<number> {
    if (count <= 0) {
      return 0;
    }

    // Find IDs of empty slots to delete (prefer non-locked first)
    const emptySlots = await this.prisma.eventSlot.findMany({
      where: { eventId, enrollmentId: null },
      select: { id: true },
      orderBy: { locked: 'asc' },
      take: count,
    });

    if (emptySlots.length === 0) {
      return 0;
    }

    const idsToDelete = emptySlots.map((s) => s.id);

    await this.prisma.eventSlot.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    this.logger.log(`Removed ${idsToDelete.length} empty slots from event ${eventId}`);
    return idsToDelete.length;
  }

  /**
   * Validate if maxParticipants can be changed.
   * Returns error message if change is not allowed, null if OK.
   */
  async validateMaxParticipantsChange(eventId: string, newMax: number): Promise<string | null> {
    const occupied = await this.getOccupiedSlotCount(eventId);

    if (newMax < occupied) {
      return `Nie można zmniejszyć limitu do ${newMax}. Obecnie zajętych jest ${occupied} miejsc. Najpierw zwolnij ${
        occupied - newMax
      } miejsc.`;
    }

    return null;
  }

  /**
   * Adjust slots when maxParticipants changes.
   * Adds or removes slots as needed.
   */
  async adjustSlotsForMaxParticipants(
    eventId: string,
    oldMax: number,
    newMax: number,
  ): Promise<void> {
    const diff = newMax - oldMax;

    if (diff > 0) {
      await this.addSlots(eventId, diff);
    } else if (diff < 0) {
      const removed = await this.removeEmptySlots(eventId, Math.abs(diff));
      if (removed < Math.abs(diff)) {
        throw new BadRequestException(
          `Nie można usunąć ${Math.abs(diff)} slotów. Tylko ${removed} jest wolnych.`,
        );
      }
    }
  }

  /**
   * Get slot for a participation (if exists).
   */
  async getSlotForParticipation(participationId: string): Promise<{
    id: string;
    confirmed: boolean;
    assignedAt: Date | null;
    roleKey: string | null;
  } | null> {
    return this.prisma.eventSlot.findUnique({
      where: { enrollmentId: participationId },
      select: { id: true, confirmed: true, assignedAt: true, roleKey: true },
    });
  }

  /**
   * Check if participation has a slot.
   */
  async hasSlot(participationId: string): Promise<boolean> {
    const slot = await this.prisma.eventSlot.findUnique({
      where: { enrollmentId: participationId },
      select: { id: true },
    });
    return slot !== null;
  }

  /**
   * Get all slots for an event with participation details.
   */
  async getSlotsForEvent(eventId: string) {
    return this.prisma.eventSlot.findMany({
      where: { eventId },
      include: {
        enrollment: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Lock a slot. Only the organizer can do this.
   * If the slot has a participant, they stay — the slot is just marked as locked.
   */
  async lockSlot(slotId: string): Promise<void> {
    const slot = await this.prisma.eventSlot.findUnique({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException(SLOT_NOT_FOUND_MESSAGE);
    }
    if (slot.locked) {
      throw new BadRequestException('Slot jest już zablokowany');
    }
    await this.prisma.eventSlot.update({
      where: { id: slotId },
      data: { locked: true },
    });
    this.eventRealtime.invalidateEvent(slot.eventId, 'slots');
    this.logger.log(`Locked slot ${slotId} on event ${slot.eventId}`);
  }

  /**
   * Unlock a slot. The slot becomes available for automatic assignment again.
   */
  async unlockSlot(slotId: string): Promise<void> {
    const slot = await this.prisma.eventSlot.findUnique({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException(SLOT_NOT_FOUND_MESSAGE);
    }
    if (!slot.locked) {
      throw new BadRequestException('Slot nie jest zablokowany');
    }
    await this.prisma.eventSlot.update({
      where: { id: slotId },
      data: { locked: false },
    });
    this.eventRealtime.invalidateEvent(slot.eventId, 'slots');
    this.logger.log(`Unlocked slot ${slotId} on event ${slot.eventId}`);
  }

  /**
   * Assign a specific participation to a specific locked slot.
   * Used by organizer to manually place a waiting participant onto a locked slot.
   */
  async assignToLockedSlot(
    slotId: string,
    participationId: string,
    confirmed: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; confirmed: boolean; assignedAt: Date; roleKey: string | null }> {
    const client = tx ?? this.prisma;

    const slot = await client.eventSlot.findUnique({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException(SLOT_NOT_FOUND_MESSAGE);
    }
    if (!slot.locked) {
      throw new BadRequestException('Slot nie jest zablokowany — użyj standardowego przydzielania');
    }
    if (slot.enrollmentId) {
      throw new BadRequestException('Slot jest już zajęty');
    }

    await client.eventSlot.update({
      where: { id: slotId },
      data: { enrollmentId: participationId, confirmed, assignedAt: new Date() },
    });

    this.eventRealtime.invalidateEvent(slot.eventId, 'all');

    const updated = await client.eventSlot.findUnique({
      where: { id: slotId },
      select: { id: true, confirmed: true, assignedAt: true, roleKey: true },
    });

    if (!updated) {
      throw new Error('Nie udało się odczytać slotu po przypisaniu uczestnika');
    }

    return updated;
  }

  /**
   * Get the eventId for a given slot.
   */
  async getSlotEventId(slotId: string): Promise<string> {
    const slot = await this.prisma.eventSlot.findUnique({
      where: { id: slotId },
      select: { eventId: true },
    });
    if (!slot) {
      throw new NotFoundException(SLOT_NOT_FOUND_MESSAGE);
    }
    return slot.eventId;
  }

  /**
   * Organizer locks a slot - prevents automatic assignment.
   */
  async lockSlotByOrganizer(
    slotId: string,
    organizerUser: string | AuthUserLike,
  ): Promise<{ success: boolean }> {
    const { userId: organizerUserId, isAdmin } = resolveUserContext(organizerUser);
    const eventId = await this.getSlotEventId(slotId);
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || (!isAdmin && event.organizerId !== organizerUserId)) {
      throw new ForbiddenException(USER_NOT_ORGANIZER_MESSAGE);
    }
    if (!isAdmin && isEventEnded(event)) {
      throw new BadRequestException(EVENT_ENDED_MESSAGE);
    }
    await this.lockSlot(slotId);
    return { success: true };
  }

  /**
   * Organizer unlocks a slot - allows automatic assignment again.
   */
  async unlockSlotByOrganizer(
    slotId: string,
    organizerUser: string | AuthUserLike,
  ): Promise<{ success: boolean }> {
    const { userId: organizerUserId, isAdmin } = resolveUserContext(organizerUser);
    const eventId = await this.getSlotEventId(slotId);
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || (!isAdmin && event.organizerId !== organizerUserId)) {
      throw new ForbiddenException(USER_NOT_ORGANIZER_MESSAGE);
    }
    if (!isAdmin && isEventEnded(event)) {
      throw new BadRequestException(EVENT_ENDED_MESSAGE);
    }
    await this.unlockSlot(slotId);
    return { success: true };
  }

  /**
   * Organizer assigns a waiting participant to a specific locked slot.
   */
  async assignParticipantToLockedSlot(
    slotId: string,
    participationId: string,
    organizerUser: string | AuthUserLike,
  ) {
    const { userId: organizerUserId, isAdmin } = resolveUserContext(organizerUser);
    const participation = await this.prisma.eventEnrollment.findUnique({
      where: { id: participationId },
      include: { event: true, slot: true },
    });
    if (!participation) {
      throw new NotFoundException(PARTICIPATION_NOT_FOUND_MESSAGE);
    }
    if (!isAdmin && participation.event.organizerId !== organizerUserId) {
      throw new ForbiddenException(USER_NOT_ORGANIZER_MESSAGE);
    }
    if (!isAdmin && isEventEnded(participation.event)) {
      throw new BadRequestException(EVENT_ENDED_MESSAGE);
    }
    if (!participation.wantsIn) {
      throw new BadRequestException(PARTICIPANT_WITHDREW_MESSAGE);
    }
    if (participation.slot) {
      throw new BadRequestException(PARTICIPANT_ALREADY_HAS_SLOT_MESSAGE);
    }

    const isPaid = participation.event.costPerPerson.toNumber() > 0;
    const confirmed = !isPaid;

    // Validate that the target slot's role matches the participant's registered role
    const targetSlot = await this.prisma.eventSlot.findUnique({
      where: { id: slotId },
      select: { roleKey: true },
    });
    if (
      targetSlot &&
      participation.roleKey &&
      targetSlot.roleKey &&
      participation.roleKey !== targetSlot.roleKey
    ) {
      throw new BadRequestException(
        `Uczestnik zapisał się jako "${participation.roleKey}", a wybrany slot jest dla roli "${targetSlot.roleKey}"`,
      );
    }

    await this.assignToLockedSlot(slotId, participationId, confirmed);

    const updated = await this.prisma.eventEnrollment.update({
      where: { id: participationId },
      data: { waitingReason: null },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        event: { select: { id: true, title: true } },
        slot: true,
      },
    });

    // TODO: Add notification logic here if needed
    // await this.notifySlotAssigned(recipientId, updated.event.title, updated.eventId);

    return updated;
  }

  /**
   * Bulk assign slots (used by lottery).
   * Takes array of participationIds and assigns them to free slots.
   * Returns number of successfully assigned slots.
   */
  async bulkAssignSlots(
    eventId: string,
    participationIds: string[],
    confirmed = false,
    tx?: Prisma.TransactionClient,
    user?: string | AuthUserLike,
  ): Promise<number> {
    const isAdmin = user ? resolveUserContext(user).isAdmin : false;
    const client = tx ?? this.prisma;
    const event = await client.event.findUnique({
      where: { id: eventId },
      select: { startsAt: true, endsAt: true, status: true },
    });
    if (event && !isAdmin && isEventEnded(event)) {
      throw new BadRequestException(EVENT_ENDED_MESSAGE);
    }
    let assigned = 0;

    for (const participationId of participationIds) {
      const result = await this.assignSlot(eventId, participationId, confirmed, client);
      if (result) {
        assigned++;
      } else {
        // No more free slots
        break;
      }
    }

    return assigned;
  }

  /**
   * Get available roles with free slots for an event.
   * Used to suggest alternative roles when chosen role is full.
   */
  async getAvailableRoles(eventId: string, roleConfig: EventRoleConfig): Promise<AvailableRole[]> {
    const freeByRole = await this.getFreeSlotsByRole(eventId);
    const available: AvailableRole[] = [];

    for (const role of roleConfig.roles) {
      const freeSlots = freeByRole.get(role.key) ?? 0;
      if (freeSlots > 0) {
        available.push({
          key: role.key,
          title: role.title,
          freeSlots,
        });
      }
    }

    return available;
  }
}
