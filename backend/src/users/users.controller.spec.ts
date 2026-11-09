import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from './enums/user-role.enum.js';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    getProfileWithStats: vi.fn().mockResolvedValue({ id: 'u-1', fullName: 'Ram' }),
    updateProfile: vi.fn().mockResolvedValue({ id: 'u-1', fullName: 'Ram Updated' }),
    changePassword: vi.fn().mockResolvedValue({ message: 'Password updated successfully' }),
  };

  const mockUser: AuthenticatedUser = {
    id: 'u-1',
    fullName: 'Ram',
    email: 'ram@example.com',
    role: UserRole.USER,
    isActive: true,
    isVerified: false,
    items: [],
    claims: [],
    reviewedClaims: [],
    handedOverItems: [],
    receivedItems: [],
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('returns current user profile with stats', async () => {
    const res = await controller.getProfile(mockUser);
    expect(res.fullName).toBe('Ram');
    expect(mockUsersService.getProfileWithStats).toHaveBeenCalledWith('u-1');
  });

  it('updates current user profile', async () => {
    const res = await controller.updateProfile(mockUser, { fullName: 'Ram Updated' });
    expect(res.fullName).toBe('Ram Updated');
  });
});
