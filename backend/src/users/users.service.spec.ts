import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  const mockRepo = {
    findOne: vi.fn(),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => ({ id: 'u-1', ...data })),
    createQueryBuilder: vi.fn(),
    manager: {
      count: vi.fn().mockResolvedValue(2),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a user and strips passwordHash from response', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const created = await service.createUser({
      fullName: 'Sita Sharma',
      email: 'SITA@EXAMPLE.COM',
      passwordHash: 'hashed-secret',
    });

    expect(created.email).toBe('sita@example.com');
    expect(created.role).toBe(UserRole.USER);
    expect((created as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  it('throws ConflictException on duplicate email', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u-1', email: 'dup@example.com' });
    await expect(
      service.createUser({
        fullName: 'Dup',
        email: 'dup@example.com',
        passwordHash: 'x',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws UnauthorizedException if active user lookup fails or account deactivated', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u-1', isActive: false });
    await expect(service.findActiveById('u-1')).rejects.toThrow(UnauthorizedException);
  });

  it('throws NotFoundException when updating missing user', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.updateProfile('missing', { fullName: 'Test' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('changes password when currentPassword matches', async () => {
    const hash = await bcrypt.hash('oldpass', 4);
    const qb = {
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue({ id: 'u-1', passwordHash: hash }),
    };
    mockRepo.createQueryBuilder.mockReturnValue(qb);

    const res = await service.changePassword('u-1', {
      currentPassword: 'oldpass',
      newPassword: 'newpassword123',
    });

    expect(res.message).toContain('Password updated');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
