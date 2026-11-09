import {
  ClassSerializerInterceptor,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

describe('KhojNepal Backend API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const createdUserIds: string[] = [];
  const createdItemIds: string[] = [];
  const createdClaimIds: string[] = [];
  const createdHandoverIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      if (createdHandoverIds.length > 0) {
        await dataSource.query(
          `DELETE FROM item_handovers WHERE id = ANY($1::uuid[])`,
          [createdHandoverIds],
        );
      }
      if (createdClaimIds.length > 0) {
        await dataSource.query(
          `DELETE FROM claims WHERE id = ANY($1::uuid[])`,
          [createdClaimIds],
        );
      }
      if (createdItemIds.length > 0) {
        await dataSource.query(
          `DELETE FROM matches WHERE lost_item_id = ANY($1::uuid[]) OR found_item_id = ANY($1::uuid[])`,
          [createdItemIds],
        );
        await dataSource.query(
          `DELETE FROM items WHERE id = ANY($1::uuid[])`,
          [createdItemIds],
        );
      }
      if (createdUserIds.length > 0) {
        await dataSource.query(
          `DELETE FROM notifications WHERE user_id = ANY($1::uuid[])`,
          [createdUserIds],
        );
        await dataSource.query(
          `DELETE FROM users WHERE id = ANY($1::uuid[])`,
          [createdUserIds],
        );
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('KhojNepal API');
  });

  it('returns seeded categories and Bagmati locations', async () => {
    const categoriesRes = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);
    expect(Array.isArray(categoriesRes.body)).toBe(true);
    expect(categoriesRes.body.length).toBeGreaterThanOrEqual(6);

    const locationsRes = await request(app.getHttpServer())
      .get('/locations?province=Bagmati')
      .expect(200);
    expect(Array.isArray(locationsRes.body)).toBe(true);
    expect(locationsRes.body.length).toBeGreaterThan(0);
  });

  it('blocks unauthenticated access to protected endpoints including /handovers', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/users/me').expect(401);
    await request(app.getHttpServer()).get('/handovers').expect(401);
    await request(app.getHttpServer()).get('/notifications').expect(401);
    await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
  });

  it('completes Register -> Login -> Access protected route and enforces RBAC', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);

    const uniqueEmail = `e2e.auth.${Date.now()}@example.com`;
    const password = 'Password123!';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'E2E Auth User',
        email: uniqueEmail,
        password,
        phone: '9800000001',
      })
      .expect(201);

    expect(registerRes.body.accessToken).toBeTypeOf('string');
    expect(registerRes.body.user.passwordHash).toBeUndefined();
    createdUserIds.push(registerRes.body.user.id);

    // Invalid password on POST /auth/login returns 401
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail, password: 'WrongPassword!' })
      .expect(401);

    // Valid POST /auth/login returns 200 OK with fresh token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail, password })
      .expect(200);

    expect(loginRes.body.accessToken).toBeTypeOf('string');
    expect(loginRes.body.user.email).toBe(uniqueEmail);
    expect(loginRes.body.user.passwordHash).toBeUndefined();
    const loginToken: string = loginRes.body.accessToken;

    // Access protected routes using token obtained from POST /auth/login
    const authMeRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginToken}`)
      .expect(200);
    expect(authMeRes.body.email).toBe(uniqueEmail);
    expect(authMeRes.body.passwordHash).toBeUndefined();

    const profileRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${loginToken}`)
      .expect(200);
    expect(profileRes.body.email).toBe(uniqueEmail);
    expect(profileRes.body.stats).toBeDefined();

    // Regular user cannot hit admin routes
    await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${loginToken}`)
      .expect(403);
  });

  it('completes Report Item -> Contact Privacy -> Submit Claim -> Finder & Admin Review -> Handover -> Resolved flow', async () => {
    const suffix = `${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const finderEmail = `e2e.finder.${suffix}@example.com`;
    const claimantEmail = `e2e.claimant.${suffix}@example.com`;
    const adminEmail = `e2e.admin.${suffix}@example.com`;
    const sharedPassword = 'Password123!';

    // Register Finder, Claimant, and a test Admin user
    const [finderReg, claimantReg, adminReg] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          fullName: 'E2E Finder',
          email: finderEmail,
          password: sharedPassword,
          phone: '9841000011',
        })
        .expect(201),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          fullName: 'E2E Claimant',
          email: claimantEmail,
          password: sharedPassword,
          phone: '9841000022',
        })
        .expect(201),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          fullName: 'E2E Moderator',
          email: adminEmail,
          password: sharedPassword,
        })
        .expect(201),
    ]);

    createdUserIds.push(finderReg.body.user.id, claimantReg.body.user.id, adminReg.body.user.id);

    // Promote test moderator to ADMIN in Postgres and log all 3 users in
    await dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [
      adminReg.body.user.id,
    ]);

    const [finderLogin, claimantLogin, adminLogin, cats, locs] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: finderEmail, password: sharedPassword })
        .expect(200),
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: claimantEmail, password: sharedPassword })
        .expect(200),
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: sharedPassword })
        .expect(200),
      request(app.getHttpServer()).get('/categories').expect(200),
      request(app.getHttpServer()).get('/locations').expect(200),
    ]);

    const finderToken: string = finderLogin.body.accessToken;
    const claimantToken: string = claimantLogin.body.accessToken;
    const adminToken: string = adminLogin.body.accessToken;

    // 1. Finder reports found item
    const createItemRes = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${finderToken}`)
      .send({
        title: 'E2E Found Black Leather Wallet',
        description: 'Found near Ratnapark bus stop containing student ID',
        reportType: 'FOUND',
        categoryId: cats.body[0].id,
        locationId: locs.body[0].id,
        dateLostOrFound: new Date().toISOString(),
        contactInfo: '9841000011',
      })
      .expect(201);

    const itemId: string = createItemRes.body.id;
    createdItemIds.push(itemId);
    expect(createItemRes.body.canViewContact).toBe(true);
    expect(createItemRes.body.contactInfo).toBe('9841000011');

    // Public anonymous fetch redacts contact info
    const publicItemRes = await request(app.getHttpServer())
      .get(`/items/${itemId}`)
      .expect(200);
    expect(publicItemRes.body.canViewContact).toBe(false);
    expect(publicItemRes.body.contactInfo).toBeUndefined();

    // 2. Claimant submits a claim
    const claimRes = await request(app.getHttpServer())
      .post('/claims')
      .set('Authorization', `Bearer ${claimantToken}`)
      .send({
        itemId,
        explanation: 'This is my black leather wallet lost near Ratnapark gate',
        evidenceDescription: 'Has TU CSIT student ID and green metro card inside',
      })
      .expect(201);

    const claimId: string = claimRes.body.id;
    createdClaimIds.push(claimId);
    expect(claimRes.body.status).toBe('PENDING');

    // Finder receives claim notification
    const unreadRes = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${finderToken}`)
      .expect(200);
    expect(unreadRes.body.unreadCount).toBeGreaterThanOrEqual(1);

    // 3. Finder confirms claim evidence
    const finderReviewRes = await request(app.getHttpServer())
      .patch(`/claims/${claimId}/finder-review`)
      .set('Authorization', `Bearer ${finderToken}`)
      .send({
        finderStatus: 'CONFIRMED',
        finderNotes: 'ID card details matched the item in custody',
      })
      .expect(200);
    expect(finderReviewRes.body.finderStatus).toBe('CONFIRMED');

    // 4. Admin approves claim
    const adminReviewRes = await request(app.getHttpServer())
      .patch(`/claims/${claimId}/admin-review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        adminNotes: 'Verification complete',
      })
      .expect(200);
    expect(adminReviewRes.body.status).toBe('APPROVED');

    // Once claim is approved, claimant can view reporter's contactInfo
    const approvedClaimantView = await request(app.getHttpServer())
      .get(`/items/${itemId}`)
      .set('Authorization', `Bearer ${claimantToken}`)
      .expect(200);
    expect(approvedClaimantView.body.canViewContact).toBe(true);
    expect(approvedClaimantView.body.contactInfo).toBe('9841000011');

    // 5. Finder schedules handover & claimant confirms receipt -> item becomes RESOLVED
    const handoverCreateRes = await request(app.getHttpServer())
      .post('/handovers')
      .set('Authorization', `Bearer ${finderToken}`)
      .send({
        claimId,
        handoverLocation: 'Ratnapark Police Help Desk',
        notes: 'Meeting at 4 PM',
      })
      .expect(201);

    const handoverId: string = handoverCreateRes.body.id;
    createdHandoverIds.push(handoverId);
    expect(handoverCreateRes.body.confirmationStatus).toBe('PENDING');

    const confirmRes = await request(app.getHttpServer())
      .patch(`/handovers/${handoverId}/confirm`)
      .set('Authorization', `Bearer ${claimantToken}`)
      .send({ notes: 'Received in good condition' })
      .expect(200);
    expect(confirmRes.body.confirmationStatus).toBe('CONFIRMED');

    const resolvedItemRes = await request(app.getHttpServer())
      .get(`/items/${itemId}`)
      .expect(200);
    expect(resolvedItemRes.body.status).toBe('RESOLVED');
  });
});
