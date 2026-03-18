import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create slots for an event (called when event is created)
   */
  async createSlotsForEvent(eventId: string, count: number): Promise<void> {
    const slots = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      eventId,
      participationId: null,
      confirmed: false,
      assignedAt: null,
    }));

    await this.prisma.eventSlot.createMany({ data: slots });
    this.logger.log(`Created ${count} slots for event ${eventId}`);
  }

  /**
   * Atomically assign a free slot to a participation.
   * Returns the assigned slot or null if no free slots available.
   */
  async assignSlot(
    eventId: string,
    participationId: string,
    confirmed = false,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; confirmed: boolean; assignedAt: Date } | null> {
    const client = tx ?? this.prisma;

    // Find and update a free slot atomically
    // Using raw query for atomic "find first free and update" operation
    const result = await client.$queryRaw<{ id: string }[]>`
      UPDATE "EventSlot"
      SET "participationId" = ${participationId},
          "confirmed" = ${confirmed},
          "assignedAt" = NOW()
      WHERE "id" = (
        SELECT "id" FROM "EventSlot"
        WHERE "eventId" = ${eventId}
          AND "participationId" IS NULL
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id"
    `;

    if (result.length === 0) {
      return null;
    }

    const slot = await client.eventSlot.findUnique({
      where: { id: result[0].id },
      select: { id: true, confirmed: true, assignedAt: true },
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
      where: { participationId },
      data: {
        participationId: null,
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
      where: { participationId },
      data: { confirmed: true },
    });

    return result.count > 0;
  }

  /**
   * Get count of free slots for an event.
   */
  async getFreeSlotCount(eventId: string): Promise<number> {
    return this.prisma.eventSlot.count({
      where: { eventId, participationId: null },
    });
  }

  /**
   * Get count of occupied slots for an event.
   */
  async getOccupiedSlotCount(eventId: string): Promise<number> {
    return this.prisma.eventSlot.count({
      where: { eventId, participationId: { not: null } },
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
   */
  async addSlots(eventId: string, count: number): Promise<void> {
    if (count <= 0) {
      return;
    }

    const slots = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      eventId,
      participationId: null,
      confirmed: false,
      assignedAt: null,
    }));

    await this.prisma.eventSlot.createMany({ data: slots });
    this.logger.log(`Added ${count} slots to event ${eventId}`);
  }

  /**
   * Remove empty slots from an event (when maxParticipants is decreased).
   * Only removes unoccupied slots. Returns number of slots actually removed.
   */
  async removeEmptySlots(eventId: string, count: number): Promise<number> {
    if (count <= 0) {
      return 0;
    }

    // Find IDs of empty slots to delete
    const emptySlots = await this.prisma.eventSlot.findMany({
      where: { eventId, participationId: null },
      select: { id: true },
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
  async getSlotForParticipation(
    participationId: string,
  ): Promise<{ id: string; confirmed: boolean; assignedAt: Date | null } | null> {
    return this.prisma.eventSlot.findUnique({
      where: { participationId },
      select: { id: true, confirmed: true, assignedAt: true },
    });
  }

  /**
   * Check if participation has a slot.
   */
  async hasSlot(participationId: string): Promise<boolean> {
    const slot = await this.prisma.eventSlot.findUnique({
      where: { participationId },
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
        participation: {
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
   * Bulk assign slots (used by lottery).
   * Takes array of participationIds and assigns them to free slots.
   * Returns number of successfully assigned slots.
   */
  async bulkAssignSlots(
    eventId: string,
    participationIds: string[],
    confirmed = false,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
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
}
