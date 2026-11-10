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
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { MatchStatus } from './enums/match-status.enum.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('MatchingController', () => {
  let controller: MatchingController;
  let app: INestApplication<App>;

  const mockService = {
    findMyMatches: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findForItem: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    triggerForItem: vi.fn().mockResolvedValue({ generatedCount: 1, matches: [] }),
    findOne: vi.fn().mockResolvedValue({ id: 'm-1' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'm-1', status: MatchStatus.ACCEPTED }),
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
      controllers: [MatchingController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: MatchingService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<MatchingController>(MatchingController);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('handles match query, recompute, accept, and reject actions', async () => {
    expect((await controller.findMyMatches(user, {})).meta.total).toBe(0);
    expect((await controller.runMatching('i-1', user)).generatedCount).toBe(1);
    expect((await controller.acceptMatch('m-1', user)).status).toBe(
      MatchStatus.ACCEPTED,
    );
  });

  it('blocks ADMIN from /matching/my and accept/reject while allowing match inspection', async () => {
    const matchId = '11111111-1111-4111-8111-111111111111';
    const itemId = '22222222-2222-4222-8222-222222222222';

    activeUser = admin;
    await request(app.getHttpServer())
      .get('/matching/my')
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .patch(`/matching/${matchId}/accept`)
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .patch(`/matching/${matchId}/reject`)
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get(`/matching/${matchId}`)
      .expect(HttpStatus.OK);
    await request(app.getHttpServer())
      .post(`/matching/item/${itemId}/run`)
      .expect(HttpStatus.CREATED);

    activeUser = user;
    await request(app.getHttpServer())
      .get('/matching/my')
      .expect(HttpStatus.OK);
  });
});
