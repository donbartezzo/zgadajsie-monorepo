import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Gender as PrismaGender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType, FAKE_USERS_MIN_FREE_SLOTS_BUFFER, Gender } from '@zgadajsie/shared';
import { FakeUserPickerService } from './fake-user-picker.service';
import { ScheduledJobsService } from '../../common/scheduled-jobs/scheduled-jobs.service';

export interface CreateFakeUserDto {
  displayName: string;
  gender?: Gender;
}

export interface UpdateFakeUserDto {
  displayName?: string;
  gender?: Gender;
  avatarSeed?: string;
  isActive?: boolean;
}

export interface FakeUserDto {
  id: string;
  displayName: string;
  email: string;
  avatarSeed: string | null;
  gender: PrismaGender | null;
  isActive: boolean;
  createdAt: Date;
  activeEnrollmentsCount: number;
}

@Injectable()
export class FakeUsersService {
  private readonly logger = new Logger(FakeUsersService.name);
  private readonly FAKE_EMAIL_DOMAIN = 'fake.zgadajsie.pl';

  constructor(
    private prisma: PrismaService,
    private fakeUserPicker: FakeUserPickerService,
    private scheduledJobs: ScheduledJobsService,
  ) {}

  async findAll(): Promise<FakeUserDto[]> {
    const fakeUsers = await this.prisma.user.findMany({
      where: {
        accountType: AccountType.FAKE,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarSeed: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Oblicz activeEnrollmentsCount dla każdego usera
    const usersWithLoad = await Promise.all(
      fakeUsers.map(async (user) => {
        const activeEnrollmentsCount = await this.prisma.eventEnrollment.count({
          where: {
            userId: user.id,
            wantsIn: true,
          },
        });
        return {
          ...user,
          activeEnrollmentsCount,
        };
      }),
    );

    return usersWithLoad;
  }

  async findOne(id: string): Promise<FakeUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarSeed: true,
        gender: true,
        isActive: true,
        createdAt: true,
        accountType: true,
      },
    });

    if (!user || user.accountType !== AccountType.FAKE) {
      throw new NotFoundException('Fake user not found');
    }

    const { accountType: _accountType, ...rest } = user;
    return this.addActiveEnrollmentsCount(rest);
  }

  async create(dto: CreateFakeUserDto): Promise<FakeUserDto> {
    const uuid = crypto.randomUUID();
    const email = `fake-${uuid}@${this.FAKE_EMAIL_DOMAIN}`;
    const avatarSeed = this.generateRandomAvatarSeed();

    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: dto.displayName,
        passwordHash: null,
        accountType: AccountType.FAKE,
        gender: dto.gender || null,
        isActive: false,
        avatarSeed,
        role: 'USER',
        isEmailVerified: true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarSeed: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`Created fake user ${user.id} (${user.displayName})`);
    return this.addActiveEnrollmentsCount(user);
  }

  async update(id: string, dto: UpdateFakeUserDto): Promise<FakeUserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.accountType !== AccountType.FAKE) {
      throw new NotFoundException('Fake user not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        gender: dto.gender,
        avatarSeed: dto.avatarSeed,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarSeed: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`Updated fake user ${user.id}`);
    return this.addActiveEnrollmentsCount(user);
  }

  async deactivate(id: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.accountType !== AccountType.FAKE) {
      throw new NotFoundException('Fake user not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated fake user ${id}`);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.accountType !== AccountType.FAKE) {
      throw new NotFoundException('Fake user not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`Deleted fake user ${id}`);
  }

  async count(): Promise<number> {
    return this.prisma.user.count({
      where: {
        accountType: AccountType.FAKE,
      },
    });
  }

  async getActive(): Promise<FakeUserDto[]> {
    const fakeUsers = await this.prisma.user.findMany({
      where: {
        accountType: AccountType.FAKE,
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarSeed: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
    });

    return Promise.all(fakeUsers.map((user) => this.addActiveEnrollmentsCount(user)));
  }

  private generateRandomAvatarSeed(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private async addActiveEnrollmentsCount<T extends { id: string }>(
    user: T,
  ): Promise<T & { activeEnrollmentsCount: number }> {
    const activeEnrollmentsCount = await this.prisma.eventEnrollment.count({
      where: {
        userId: user.id,
        wantsIn: true,
      },
    });
    return {
      ...user,
      activeEnrollmentsCount,
    };
  }

  async enrollFakeUserToEvent(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { maxParticipants: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Sprawdź warunek bufora
    const activeEnrollments = await this.prisma.eventEnrollment.count({
      where: {
        eventId,
        wantsIn: true,
      },
    });

    const freePlaces = event.maxParticipants - activeEnrollments;

    if (freePlaces < FAKE_USERS_MIN_FREE_SLOTS_BUFFER) {
      throw new BadRequestException(
        `Brak wystarczających miejsc (wymagane minimum ${FAKE_USERS_MIN_FREE_SLOTS_BUFFER} wolnych miejsc)`,
      );
    }

    // Wybierz fake usera
    const fakeUserId = await this.fakeUserPicker.pickFakeUserForEvent(eventId);

    if (!fakeUserId) {
      throw new BadRequestException('Brak dostępnych fake users dla tego wydarzenia');
    }

    // Natychmiastowe utworzenie enrollment (bez planowania joba)
    await this.prisma.eventEnrollment.create({
      data: {
        eventId,
        userId: fakeUserId,
        addedByUserId: null,
        wantsIn: true,
      },
    });

    this.logger.log(`Manually enrolled fake user ${fakeUserId} to event ${eventId}`);
  }
}
