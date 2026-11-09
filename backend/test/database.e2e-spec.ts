import bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/database/data-source.js';
import { User } from '../src/users/entities/user.entity.js';
import { UserRole } from '../src/users/enums/user-role.enum.js';
import { Category } from '../src/categories/entities/category.entity.js';
import { Location } from '../src/locations/entities/location.entity.js';
import { Item } from '../src/items/entities/item.entity.js';
import { ReportType } from '../src/items/enums/report-type.enum.js';
import { ItemStatus } from '../src/items/enums/item-status.enum.js';
import { Claim } from '../src/claims/entities/claim.entity.js';
import { ClaimStatus } from '../src/claims/enums/claim-status.enum.js';
import { FinderClaimStatus } from '../src/claims/enums/finder-claim-status.enum.js';
import { Match } from '../src/matching/entities/match.entity.js';
import { MatchStatus } from '../src/matching/enums/match-status.enum.js';
import { ItemHandover } from '../src/handovers/entities/item-handover.entity.js';
import { HandoverConfirmationStatus } from '../src/handovers/enums/handover-confirmation-status.enum.js';
import { Notification } from '../src/notifications/entities/notification.entity.js';
import { NotificationType } from '../src/notifications/enums/notification-type.enum.js';

describe('PostgreSQL Database Operations & Relationships', () => {
  const dataSource = new DataSource({
    ...AppDataSource.options,
    migrations: [],
    logging: false,
  });

  const createdUserIds: string[] = [];
  const createdItemIds: string[] = [];
  const createdClaimIds: string[] = [];
  const createdMatchIds: string[] = [];
  const createdHandoverIds: string[] = [];
  const createdNotificationIds: string[] = [];

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
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
      if (createdMatchIds.length > 0 || createdItemIds.length > 0) {
        await dataSource.query(
          `DELETE FROM matches WHERE id = ANY($1::uuid[]) OR lost_item_id = ANY($2::uuid[]) OR found_item_id = ANY($2::uuid[])`,
          [createdMatchIds, createdItemIds],
        );
      }
      if (createdItemIds.length > 0) {
        await dataSource.query(
          `DELETE FROM items WHERE id = ANY($1::uuid[])`,
          [createdItemIds],
        );
      }
      if (createdNotificationIds.length > 0 || createdUserIds.length > 0) {
        await dataSource.query(
          `DELETE FROM notifications WHERE id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])`,
          [createdNotificationIds, createdUserIds],
        );
      }
      if (createdUserIds.length > 0) {
        await dataSource.query(
          `DELETE FROM users WHERE id = ANY($1::uuid[])`,
          [createdUserIds],
        );
      }
      await dataSource.destroy();
    }
  });

  it('creates users, hides passwordHash by default, and enforces unique email constraint', async () => {
    const userRepo = dataSource.getRepository(User);
    const uniqueEmail = `db.user.${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('db-test-pass', 4);

    const saved = await userRepo.save(
      userRepo.create({
        fullName: 'Database Test User',
        email: uniqueEmail,
        passwordHash,
        phone: '9801111111',
        role: UserRole.USER,
      }),
    );
    createdUserIds.push(saved.id);

    // Default findOne omits passwordHash due to select: false
    const fetched = await userRepo.findOne({ where: { id: saved.id } });
    expect(fetched).not.toBeNull();
    expect(fetched?.email).toBe(uniqueEmail);
    expect((fetched as { passwordHash?: string } | null)?.passwordHash).toBeUndefined();

    // Explicit addSelect retrieves passwordHash for auth checks
    const fetchedForAuth = await userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: saved.id })
      .getOne();
    expect(fetchedForAuth?.passwordHash).toBe(passwordHash);

    // Unique email constraint throws at PostgreSQL level
    await expect(
      userRepo.save(
        userRepo.create({
          fullName: 'Duplicate Email User',
          email: uniqueEmail,
          passwordHash,
        }),
      ),
    ).rejects.toThrow();
  });

  it('persists User -> Item -> Claim -> Handover relationships, Match decimals, and FK restrictions cleanly', async () => {
    const userRepo = dataSource.getRepository(User);
    const categoryRepo = dataSource.getRepository(Category);
    const locationRepo = dataSource.getRepository(Location);
    const itemRepo = dataSource.getRepository(Item);
    const matchRepo = dataSource.getRepository(Match);
    const claimRepo = dataSource.getRepository(Claim);
    const handoverRepo = dataSource.getRepository(ItemHandover);
    const notificationRepo = dataSource.getRepository(Notification);

    const category = await categoryRepo.findOne({ where: { isActive: true } });
    const location = await locationRepo.findOne({ where: { province: 'Bagmati' } });
    expect(category).not.toBeNull();
    expect(location).not.toBeNull();

    const suffix = `${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const passwordHash = await bcrypt.hash('db-test-pass', 4);

    const loser = await userRepo.save(
      userRepo.create({
        fullName: 'DB Lost Reporter',
        email: `db.loser.${suffix}@example.com`,
        passwordHash,
      }),
    );
    const finder = await userRepo.save(
      userRepo.create({
        fullName: 'DB Found Reporter',
        email: `db.finder.${suffix}@example.com`,
        passwordHash,
      }),
    );
    createdUserIds.push(loser.id, finder.id);

    const lostItem = await itemRepo.save(
      itemRepo.create({
        userId: loser.id,
        categoryId: category!.id,
        locationId: location!.id,
        title: 'DB Lost Silver Laptop',
        description: 'Lost laptop bag near Thamel gate',
        reportType: ReportType.LOST,
        status: ItemStatus.OPEN,
        dateLostOrFound: new Date(),
      }),
    );
    const foundItem = await itemRepo.save(
      itemRepo.create({
        userId: finder.id,
        categoryId: category!.id,
        locationId: location!.id,
        title: 'DB Found Silver Laptop',
        description: 'Found laptop bag in Thamel with charger',
        reportType: ReportType.FOUND,
        status: ItemStatus.OPEN,
        dateLostOrFound: new Date(),
      }),
    );
    createdItemIds.push(lostItem.id, foundItem.id);

    // Verify User <-> Item relational hydration and decimal transformer on Location
    const hydratedFound = await itemRepo.findOne({
      where: { id: foundItem.id },
      relations: { user: true, category: true, location: true },
    });
    expect(hydratedFound?.user.id).toBe(finder.id);
    expect(hydratedFound?.category.id).toBe(category!.id);
    expect(typeof hydratedFound?.location.latitude).toBe('number');

    const hydratedFinder = await userRepo.findOne({
      where: { id: finder.id },
      relations: { items: true },
    });
    expect(hydratedFinder?.items.map((item) => item.id)).toContain(foundItem.id);

    // ON DELETE RESTRICT prevents deleting a user who has items
    await expect(userRepo.delete({ id: finder.id })).rejects.toThrow();

    // Match persistence & DB CHECK / UNIQUE constraints
    const match = await matchRepo.save(
      matchRepo.create({
        lostItemId: lostItem.id,
        foundItemId: foundItem.id,
        textScore: 0.91,
        imageScore: 0,
        locationScore: 1,
        timeScore: 0.98,
        finalScore: 0.948,
        status: MatchStatus.PENDING,
      }),
    );
    createdMatchIds.push(match.id);
    expect(typeof match.finalScore).toBe('number');

    // Self-match fails CHK_matches_no_self_match
    await expect(
      matchRepo.save(
        matchRepo.create({
          lostItemId: lostItem.id,
          foundItemId: lostItem.id,
          textScore: 1,
          imageScore: 0,
          locationScore: 1,
          timeScore: 1,
          finalScore: 1,
        }),
      ),
    ).rejects.toThrow();

    // Duplicate pair fails UQ_matches_lost_found
    await expect(
      matchRepo.save(
        matchRepo.create({
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
          textScore: 0.8,
          imageScore: 0,
          locationScore: 1,
          timeScore: 0.9,
          finalScore: 0.85,
        }),
      ),
    ).rejects.toThrow();

    // Submit claim + status update + notification atomically inside DB transaction
    const savedClaim = await dataSource.manager.transaction(async (manager) => {
      const claim = await manager.getRepository(Claim).save(
        manager.getRepository(Claim).create({
          itemId: foundItem.id,
          claimantId: loser.id,
          explanation: 'Dropped near Thamel chowk with blue sticker on corner',
          evidenceDescription: 'Serial suffix 9942-NP',
          finderStatus: FinderClaimStatus.CONFIRMED,
          status: ClaimStatus.APPROVED,
        }),
      );
      await manager
        .getRepository(Item)
        .update({ id: foundItem.id }, { status: ItemStatus.CLAIM_PENDING });

      const notif = await manager.getRepository(Notification).save(
        manager.getRepository(Notification).create({
          userId: finder.id,
          title: 'Claim Approved',
          message: 'Ready for handover',
          type: NotificationType.CLAIM_UPDATE,
          metadata: { claimId: claim.id, itemId: foundItem.id },
        }),
      );
      createdNotificationIds.push(notif.id);
      return claim;
    });
    createdClaimIds.push(savedClaim.id);

    const handover = await handoverRepo.save(
      handoverRepo.create({
        claimId: savedClaim.id,
        handedOverById: finder.id,
        receivedById: loser.id,
        handoverLocation: 'Thamel Police Post',
        confirmationStatus: HandoverConfirmationStatus.CONFIRMED,
        handoverAt: new Date(),
      }),
    );
    createdHandoverIds.push(handover.id);

    await itemRepo.update({ id: foundItem.id }, { status: ItemStatus.RESOLVED });

    // Verify full Claim -> Item / Claimant / Handover graph
    const hydratedClaim = await claimRepo.findOne({
      where: { id: savedClaim.id },
      relations: { item: true, claimant: true, handover: true },
    });
    expect(hydratedClaim?.item.status).toBe(ItemStatus.RESOLVED);
    expect(hydratedClaim?.claimant.id).toBe(loser.id);
    expect(hydratedClaim?.handover?.id).toBe(handover.id);

    // Verify transaction rollback leaves DB unchanged when failing mid-transaction
    await expect(
      dataSource.manager.transaction(async (manager) => {
        await manager.getRepository(Notification).save(
          manager.getRepository(Notification).create({
            userId: loser.id,
            title: 'Should Roll Back',
            message: 'Transaction test',
            type: NotificationType.SYSTEM,
          }),
        );
        throw new Error('Force rollback');
      }),
    ).rejects.toThrow('Force rollback');

    const rolledBackCount = await notificationRepo.count({
      where: { userId: loser.id, title: 'Should Roll Back' },
    });
    expect(rolledBackCount).toBe(0);
  });
});
