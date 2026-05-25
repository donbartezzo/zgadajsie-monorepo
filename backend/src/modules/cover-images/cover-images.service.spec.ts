import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CoverImagesService } from './cover-images.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../media/r2-storage.service';
import { EventDiscipline } from '@prisma/client';

describe('CoverImagesService', () => {
  let service: CoverImagesService;
  let _prisma: PrismaService;
  let _r2Storage: R2StorageService;

  const mockPrisma = {
    coverImage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    eventDiscipline: {
      findUnique: jest.fn(),
    },
  };

  const mockR2Storage = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  const mockDiscipline: EventDiscipline = {
    id: 'discipline-1',
    slug: 'pilka-nozna',
    name: 'Piłka nożna',
  };

  const mockFile = {
    originalname: 'test.jpg',
    buffer: Buffer.from('test'),
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  const mockPublicCover = {
    id: 'cover-1',
    disciplineSlug: 'pilka-nozna',
    filename: 'test.webp',
    storageKey: 'cover-images/public/pilka-nozna/uuid.webp',
    ownerUserId: null,
    name: null,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserCover = {
    id: 'cover-2',
    disciplineSlug: null,
    filename: 'test.webp',
    storageKey: 'cover-images/user/user-1/uuid.webp',
    ownerUserId: 'user-1',
    name: 'Mój cover',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverImagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: R2StorageService, useValue: mockR2Storage },
      ],
    }).compile();

    service = module.get<CoverImagesService>(CoverImagesService);
    _prisma = module.get<PrismaService>(PrismaService);
    _r2Storage = module.get<R2StorageService>(R2StorageService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (public upload)', () => {
    it('should upload public cover to R2 with correct prefix', async () => {
      mockPrisma.eventDiscipline.findUnique.mockResolvedValue(mockDiscipline);
      mockR2Storage.upload.mockResolvedValue('https://r2.dev/key.webp');
      mockPrisma.coverImage.create.mockResolvedValue(mockPublicCover);

      const result = await service.create('pilka-nozna', mockFile);

      expect(mockPrisma.eventDiscipline.findUnique).toHaveBeenCalledWith({
        where: { slug: 'pilka-nozna' },
      });
      expect(mockR2Storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^cover-images\/public\/pilka-nozna\/.*\.webp$/),
        expect.any(Buffer),
        'image/webp',
      );
      expect(mockPrisma.coverImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storageKey: expect.stringMatching(/^cover-images\/public\/pilka-nozna\/.*\.webp$/),
          discipline: { connect: { slug: 'pilka-nozna' } },
        }),
        include: { discipline: true },
      });
      expect(result).toEqual(mockPublicCover);
    });

    it('should throw if discipline does not exist', async () => {
      mockPrisma.eventDiscipline.findUnique.mockResolvedValue(null);

      await expect(service.create('nonexistent', mockFile)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createUserCover (user upload)', () => {
    it('should upload user cover to R2 with correct prefix and enforce limit 5', async () => {
      mockPrisma.coverImage.count.mockResolvedValue(3); // below limit
      mockR2Storage.upload.mockResolvedValue('https://r2.dev/key.webp');
      mockPrisma.coverImage.create.mockResolvedValue(mockUserCover);

      const result = await service.createUserCover('user-1', mockFile, 'Mój cover');

      expect(mockPrisma.coverImage.count).toHaveBeenCalledWith({
        where: { ownerUserId: 'user-1' },
      });
      expect(mockR2Storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^cover-images\/user\/user-1\/.*\.webp$/),
        expect.any(Buffer),
        'image/webp',
      );
      expect(mockPrisma.coverImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storageKey: expect.stringMatching(/^cover-images\/user\/user-1\/.*\.webp$/),
          ownerUserId: 'user-1',
          name: 'Mój cover',
        }),
      });
      expect(result).toEqual(mockUserCover);
    });

    it('should throw when limit 5 exceeded', async () => {
      mockPrisma.coverImage.count.mockResolvedValue(5); // at limit

      await expect(service.createUserCover('user-1', mockFile, 'Mój cover')).rejects.toThrow(
        'Możesz mieć maksymalnie 5 własnych cover images',
      );
    });

    it('should throw when name is too short', async () => {
      mockPrisma.coverImage.count.mockResolvedValue(3);

      await expect(service.createUserCover('user-1', mockFile, 'ab')).rejects.toThrow(
        'Nazwa musi mieć minimum 3 znaki',
      );
    });
  });

  describe('replaceUserCover', () => {
    it('should upload new image and delete old one', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockUserCover);
      mockR2Storage.delete.mockResolvedValue();
      mockR2Storage.upload.mockResolvedValue('https://r2.dev/key.webp');
      mockPrisma.coverImage.update.mockResolvedValue(mockUserCover);

      const result = await service.replaceUserCover('user-1', 'cover-2', mockFile);

      expect(mockR2Storage.delete).toHaveBeenCalledWith(mockUserCover.storageKey);
      expect(mockR2Storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^cover-images\/user\/user-1\/.*\.webp$/),
        expect.any(Buffer),
        'image/webp',
      );
      expect(mockPrisma.coverImage.update).toHaveBeenCalled();
      expect(result).toEqual(mockUserCover);
    });

    it('should throw when user is not owner', async () => {
      const otherUserCover = { ...mockUserCover, ownerUserId: 'user-2' };
      mockPrisma.coverImage.findUnique.mockResolvedValue(otherUserCover);

      await expect(service.replaceUserCover('user-1', 'cover-2', mockFile)).rejects.toThrow(
        'Nie masz uprawnień do modyfikacji tego cover image',
      );
    });
  });

  describe('renameUserCover', () => {
    it('should rename user cover', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockUserCover);
      const updated = { ...mockUserCover, name: 'Nowa nazwa' };
      mockPrisma.coverImage.update.mockResolvedValue(updated);

      const result = await service.renameUserCover('user-1', 'cover-2', 'Nowa nazwa');

      expect(mockPrisma.coverImage.update).toHaveBeenCalledWith({
        where: { id: 'cover-2' },
        data: { name: 'Nowa nazwa' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw when name is too short', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockUserCover);

      await expect(service.renameUserCover('user-1', 'cover-2', 'ab')).rejects.toThrow(
        'Nazwa musi mieć minimum 3 znaki',
      );
    });

    it('should throw when user is not owner', async () => {
      const otherUserCover = { ...mockUserCover, ownerUserId: 'user-2' };
      mockPrisma.coverImage.findUnique.mockResolvedValue(otherUserCover);

      await expect(service.renameUserCover('user-1', 'cover-2', 'Nowa nazwa')).rejects.toThrow(
        'Nie masz uprawnień do modyfikacji tego cover image',
      );
    });
  });

  describe('removeUserCover', () => {
    it('should delete user cover and R2 file', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockUserCover);
      mockPrisma.event.count.mockResolvedValue(0); // not used
      mockR2Storage.delete.mockResolvedValue();
      mockPrisma.coverImage.delete.mockResolvedValue(mockUserCover);

      const result = await service.removeUserCover('user-1', 'cover-2');

      expect(mockPrisma.event.count).toHaveBeenCalledWith({
        where: { coverImageId: 'cover-2' },
      });
      expect(mockR2Storage.delete).toHaveBeenCalledWith(mockUserCover.storageKey);
      expect(mockPrisma.coverImage.delete).toHaveBeenCalledWith({
        where: { id: 'cover-2' },
      });
      expect(result).toEqual(mockUserCover);
    });

    it('should throw when cover is used in events', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockUserCover);
      mockPrisma.event.count.mockResolvedValue(3); // used in 3 events

      await expect(service.removeUserCover('user-1', 'cover-2')).rejects.toThrow(
        'Nie można usunąć - 3 wydarzeń używa tego cover image',
      );
    });

    it('should throw when user is not owner', async () => {
      const otherUserCover = { ...mockUserCover, ownerUserId: 'user-2' };
      mockPrisma.coverImage.findUnique.mockResolvedValue(otherUserCover);

      await expect(service.removeUserCover('user-1', 'cover-2')).rejects.toThrow(
        'Nie masz uprawnień do usunięcia tego cover image',
      );
    });
  });

  describe('remove (public cover)', () => {
    it('should delete public cover and R2 file', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockPublicCover);
      mockPrisma.event.count.mockResolvedValue(0);
      mockR2Storage.delete.mockResolvedValue();
      mockPrisma.coverImage.delete.mockResolvedValue(mockPublicCover);

      const result = await service.remove('cover-1');

      expect(mockR2Storage.delete).toHaveBeenCalledWith(mockPublicCover.storageKey);
      expect(mockPrisma.coverImage.delete).toHaveBeenCalledWith({
        where: { id: 'cover-1' },
      });
      expect(result).toEqual(mockPublicCover);
    });

    it('should throw when cover is used in events', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockPublicCover);
      mockPrisma.event.count.mockResolvedValue(2);

      await expect(service.remove('cover-1')).rejects.toThrow(
        'Nie można usunąć - 2 wydarzeń używa tego cover image',
      );
    });
  });

  describe('authorization edge cases', () => {
    it('should prevent user from modifying public cover via replaceUserCover', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockPublicCover);

      await expect(service.replaceUserCover('user-1', 'cover-1', mockFile)).rejects.toThrow(
        'Nie masz uprawnień do modyfikacji tego cover image',
      );
    });

    it('should prevent user from modifying public cover via renameUserCover', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockPublicCover);

      await expect(service.renameUserCover('user-1', 'cover-1', 'Nowa nazwa')).rejects.toThrow(
        'Nie masz uprawnień do modyfikacji tego cover image',
      );
    });

    it('should prevent user from modifying public cover via removeUserCover', async () => {
      mockPrisma.coverImage.findUnique.mockResolvedValue(mockPublicCover);

      await expect(service.removeUserCover('user-1', 'cover-1')).rejects.toThrow(
        'Nie masz uprawnień do usunięcia tego cover image',
      );
    });

    it('should prevent user from modifying another users cover via replaceUserCover', async () => {
      const otherUserCover = { ...mockUserCover, ownerUserId: 'user-2' };
      mockPrisma.coverImage.findUnique.mockResolvedValue(otherUserCover);

      await expect(service.replaceUserCover('user-1', 'cover-2', mockFile)).rejects.toThrow(
        'Nie masz uprawnień do modyfikacji tego cover image',
      );
    });
  });
});
