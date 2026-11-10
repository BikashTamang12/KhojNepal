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
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { ReportType } from './enums/report-type.enum.js';

describe('ItemsController', () => {
  let controller: ItemsController;
  let app: INestApplication<App>;

  const mockService = {
    findAll: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findMyItems: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findOne: vi.fn().mockResolvedValue({ id: 'item-1', title: 'Wallet' }),
    create: vi.fn().mockResolvedValue({ id: 'item-1', title: 'Wallet' }),
    update: vi.fn().mockResolvedValue({ id: 'item-1', title: 'Updated Wallet' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'item-1', status: 'CLOSED' }),
    addImages: vi.fn().mockResolvedValue({ id: 'item-1', images: [] }),
    setPrimaryImage: vi.fn().mockResolvedValue({ id: 'item-1' }),
    removeImage: vi.fn().mockResolvedValue({ id: 'item-1' }),
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
      controllers: [ItemsController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: ItemsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<ItemsController>(ItemsController);
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

  it('delegates item routes cleanly', async () => {
    expect((await controller.findAll({}, null)).meta.total).toBe(0);
    expect((await controller.findMyItems(user, {})).meta.total).toBe(0);
    expect((await controller.findOne('item-1', null)).id).toBe('item-1');
    expect(
      (
        await controller.create(user, {
          title: 'Wallet',
          description: 'Lost wallet',
          reportType: ReportType.LOST,
          categoryId: 'c-1',
          locationId: 'l-1',
          dateLostOrFound: '2026-11-01T10:00:00Z',
        })
      ).id,
    ).toBe('item-1');
  });

  it('blocks ADMIN from GET /items/my and POST /items while allowing moderation', async () => {
    activeUser = admin;
    await request(app.getHttpServer())
      .get('/items/my')
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .post('/items')
      .send({
        title: 'Admin Item',
        description: 'Should not create',
        reportType: ReportType.LOST,
        categoryId: '11111111-1111-4111-8111-111111111111',
        locationId: '22222222-2222-4222-8222-222222222222',
        dateLostOrFound: '2026-11-01T10:00:00Z',
      })
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .patch('/items/33333333-3333-4333-8333-333333333333/status')
      .send({ status: 'CLOSED' })
      .expect(HttpStatus.OK);

    activeUser = user;
    await request(app.getHttpServer())
      .get('/items/my')
      .expect(HttpStatus.OK);
  });
});
