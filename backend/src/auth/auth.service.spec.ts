import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('AuthService', () => {
  let service: AuthService;
  const mockUsersService = {
    createUser: vi.fn(),
    findByEmailForAuth: vi.fn(),
    findActiveById: vi.fn(),
  };
  const mockJwtService = {
    signAsync: vi.fn().mockResolvedValue('signed-jwt-token'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a regular user with USER role and returns JWT', async () => {
    mockUsersService.createUser.mockResolvedValue({
      id: 'u-1',
      email: 'new@example.com',
      fullName: 'New User',
      role: UserRole.USER,
      isActive: true,
    });

    const result = await service.register({
      fullName: 'New User',
      email: 'new@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('signed-jwt-token');
    expect(result.user.role).toBe(UserRole.USER);
    expect(mockUsersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.USER }),
    );
  });

  it('logs in active user with valid credentials and never returns passwordHash', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);
    mockUsersService.findByEmailForAuth.mockResolvedValue({
      id: 'u-1',
      email: 'ram@example.com',
      fullName: 'Ram',
      passwordHash,
      role: UserRole.USER,
      isActive: true,
    });

    const result = await service.login({
      email: 'ram@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('signed-jwt-token');
    expect((result.user as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  it('rejects invalid password with UnauthorizedException', async () => {
    const passwordHash = await bcrypt.hash('correct', 4);
    mockUsersService.findByEmailForAuth.mockResolvedValue({
      id: 'u-1',
      email: 'ram@example.com',
      passwordHash,
      isActive: true,
    });

    await expect(
      service.login({ email: 'ram@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects deactivated users with ForbiddenException', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);
    mockUsersService.findByEmailForAuth.mockResolvedValue({
      id: 'u-1',
      email: 'ram@example.com',
      passwordHash,
      role: UserRole.USER,
      isActive: false,
    });

    await expect(
      service.login({ email: 'ram@example.com', password: 'password123' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
