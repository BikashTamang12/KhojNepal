import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { ClaimsController } from './claims.controller.js';
import { ClaimsService } from './claims.service.js';
import { ClaimStatus } from './enums/claim-status.enum.js';
import { FinderClaimStatus } from './enums/finder-claim-status.enum.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('ClaimsController', () => {
  let controller: ClaimsController;
  let app: INestApplication<App>;

  const regularUser = {
    id: '11111111-1111-4111-8111-111111111111',
    role: UserRole.USER,
  } as AuthenticatedUser;
  const adminUser = {
    id: '22222222-2222-4222-8222-222222222222',
    role: UserRole.ADMIN,
  } as AuthenticatedUser;

  let activeUser = regularUser;

  const mockService = {
    create: vi.fn().mockResolvedValue({ id: 'c-1', status: ClaimStatus.PENDING }),
    findMyClaims: vi
      .fn()
      .mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findOne: vi.fn().mockResolvedValue({ id: 'c-1' }),
    finderReview: vi
      .fn()
      .mockResolvedValue({ id: 'c-1', finderStatus: FinderClaimStatus.CONFIRMED }),
    adminReview: vi.fn().mockResolvedValue({ id: 'c-1', status: ClaimStatus.APPROVED }),
  };

  const mockJwtGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
      req.user = activeUser;
      return true;
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    activeUser = regularUser;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: ClaimsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<ClaimsController>(ClaimsController);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('delegates claim lifecycle endpoints cleanly', async () => {
    expect(
      (
        await controller.create(regularUser, {
          itemId: '33333333-3333-4333-8333-333333333333',
          explanation: 'My wallet lost near New Road',
          evidenceDescription: 'Nabil Bank card inside',
        })
      ).id,
    ).toBe('c-1');
    expect((await controller.findMyClaims(regularUser, {})).meta.total).toBe(0);
    expect(
      (
        await controller.finderReview('44444444-4444-4444-8444-444444444444', regularUser, {
          finderStatus: FinderClaimStatus.CONFIRMED,
        })
      ).finderStatus,
    ).toBe(FinderClaimStatus.CONFIRMED);
    expect(
      (
        await controller.adminReview('44444444-4444-4444-8444-444444444444', adminUser, {
          status: ClaimStatus.APPROVED,
        })
      ).status,
    ).toBe(ClaimStatus.APPROVED);
  });

  it('POST /claims validates UUID and explanation DTO rules via HTTP', async () => {
    await request(app.getHttpServer())
      .post('/claims')
      .send({
        itemId: 'not-a-uuid',
        explanation: 'short',
        evidenceDescription: 'ok',
      })
      .expect(HttpStatus.BAD_REQUEST);

    const itemId = '33333333-3333-4333-8333-333333333333';
    const res = await request(app.getHttpServer())
      .post('/claims')
      .send({
        itemId,
        explanation: 'Lost my leather wallet near New Road gate',
        evidenceDescription: 'Nabil Bank debit card and student ID inside',
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.id).toBe('c-1');
    expect(mockService.create).toHaveBeenCalledWith(regularUser.id, {
      itemId,
      explanation: 'Lost my leather wallet near New Road gate',
      evidenceDescription: 'Nabil Bank debit card and student ID inside',
    });
  });

  it('PATCH /claims/:id/admin-review blocks non-admin with 403 and allows admin', async () => {
    const claimId = '44444444-4444-4444-8444-444444444444';

    activeUser = regularUser;
    await request(app.getHttpServer())
      .patch(`/claims/${claimId}/admin-review`)
      .send({ status: ClaimStatus.APPROVED })
      .expect(HttpStatus.FORBIDDEN);

    activeUser = adminUser;
    const res = await request(app.getHttpServer())
      .patch(`/claims/${claimId}/admin-review`)
      .send({ status: ClaimStatus.APPROVED, adminNotes: 'Verified ownership' })
      .expect(HttpStatus.OK);

    expect(res.body.status).toBe(ClaimStatus.APPROVED);
    expect(mockService.adminReview).toHaveBeenCalledWith(
      claimId,
      adminUser.id,
      { status: ClaimStatus.APPROVED, adminNotes: 'Verified ownership' },
    );
  });

  it('blocks ADMIN from user-only claim actions with 403 while permitting GET /claims/:id', async () => {
    const claimId = '44444444-4444-4444-8444-444444444444';
    const itemId = '33333333-3333-4333-8333-333333333333';

    activeUser = adminUser;
    await request(app.getHttpServer())
      .post('/claims')
      .send({
        itemId,
        explanation: 'Admin attempting to claim an item',
        evidenceDescription: 'Admin role should be forbidden',
      })
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get('/claims/my')
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .patch(`/claims/${claimId}/finder-review`)
      .send({ finderStatus: FinderClaimStatus.CONFIRMED })
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get(`/claims/${claimId}`)
      .expect(HttpStatus.OK);
  });
});
