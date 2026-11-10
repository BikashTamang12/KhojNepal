import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { HandoversController } from './handovers.controller.js';
import { HandoversService } from './handovers.service.js';
import { HandoverConfirmationStatus } from './enums/handover-confirmation-status.enum.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('HandoversController', () => {
  let controller: HandoversController;
  let app: INestApplication<App>;

  const mockService = {
    findAllForUser: vi.fn().mockResolvedValue([]),
    findMine: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ id: 'h-1' }),
    create: vi.fn().mockResolvedValue({ id: 'h-1', confirmationStatus: HandoverConfirmationStatus.PENDING }),
    confirm: vi.fn().mockResolvedValue({ id: 'h-1', confirmationStatus: HandoverConfirmationStatus.CONFIRMED }),
    cancel: vi.fn().mockResolvedValue({ id: 'h-1', confirmationStatus: HandoverConfirmationStatus.CANCELLED }),
  };
  const user = { id: 'u-1', role: UserRole.USER } as AuthenticatedUser;
  const admin = { id: 'admin-1', role: UserRole.ADMIN } as AuthenticatedUser;
  let activeUser = user;

  const mockJwtGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
      req.user = activeUser;
      return true;
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    activeUser = user;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HandoversController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: HandoversService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<HandoversController>(HandoversController);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('delegates handover endpoints cleanly', async () => {
    expect(await controller.findAll(user)).toEqual([]);
    expect((await controller.create(user, { claimId: 'c-1', handoverLocation: 'Thamel' })).id).toBe('h-1');
    expect((await controller.confirm('h-1', user, {})).confirmationStatus).toBe(
      HandoverConfirmationStatus.CONFIRMED,
    );
    expect((await controller.cancel('h-1', user, {})).confirmationStatus).toBe(
      HandoverConfirmationStatus.CANCELLED,
    );
  });

  it('blocks ADMIN from GET /handovers/my while permitting GET /handovers', async () => {
    activeUser = admin;
    await request(app.getHttpServer())
      .get('/handovers/my')
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get('/handovers')
      .expect(HttpStatus.OK);

    activeUser = user;
    await request(app.getHttpServer())
      .get('/handovers/my')
      .expect(HttpStatus.OK);
  });
});
