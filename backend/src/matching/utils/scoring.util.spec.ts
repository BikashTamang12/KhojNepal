import { PNG } from 'pngjs';
import type { Item } from '../../items/entities/item.entity.js';
import { ReportType } from '../../items/enums/report-type.enum.js';
import { ItemStatus } from '../../items/enums/item-status.enum.js';
import type { Location } from '../../locations/entities/location.entity.js';
import {
  computeLocationScore,
  computeMatchScores,
  computeTextScore,
  computeTimeScore,
} from './scoring.util.js';
import {
  compareSignatures,
  computeImageSignature,
  decodeImageBuffer,
} from './image-similarity.util.js';

const makeLocation = (overrides: Partial<Location>): Location =>
  ({
    id: 'loc-1',
    province: 'Bagmati',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan City',
    area: 'Thamel',
    latitude: 27.7154,
    longitude: 85.3123,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Location;

const makeItem = (overrides: Partial<Item>): Item =>
  ({
    id: 'item-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    locationId: 'loc-1',
    title: 'Black Leather Wallet',
    description: 'Lost a black leather wallet with bank cards near Thamel gate.',
    brand: 'Wildcraft',
    color: 'Black',
    reportType: ReportType.LOST,
    status: ItemStatus.OPEN,
    dateLostOrFound: new Date('2026-11-01T10:00:00Z'),
    specificLocationDetails: 'Thamel Chowk',
    images: [],
    lostMatches: [],
    foundMatches: [],
    claims: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Item;

describe('Matching scoring utilities', () => {
  it('computes high textScore for closely matching lost and found items', () => {
    const lost = makeItem({});
    const found = makeItem({
      id: 'item-2',
      userId: 'user-2',
      reportType: ReportType.FOUND,
      title: 'Black Wallet',
      description: 'Found leather wallet with cards near Thamel area.',
      brand: 'Wildcraft',
      color: 'black',
    });

    const unrelated = makeItem({
      id: 'item-3',
      userId: 'user-3',
      categoryId: 'cat-other',
      reportType: ReportType.FOUND,
      title: 'Blue Honda Helmet',
      description: 'Found helmet in Pokhara lakeside parking lot.',
      brand: 'Studds',
      color: 'Blue',
    });

    const similarScore = computeTextScore(lost, found);
    const unrelatedScore = computeTextScore(lost, unrelated);

    expect(similarScore).toBeGreaterThan(0.65);
    expect(unrelatedScore).toBeLessThan(0.15);
  });

  it('computes locationScore using exact ID, hierarchy, and Haversine distance', () => {
    const thamel = makeLocation({ id: 'loc-thamel' });
    const baneshwor = makeLocation({
      id: 'loc-baneshwor',
      area: 'New Baneshwor',
      latitude: 27.6915,
      longitude: 85.342,
    });
    const pokhara = makeLocation({
      id: 'loc-pokhara',
      province: 'Gandaki',
      district: 'Kaski',
      municipality: 'Pokhara Metropolitan City',
      area: 'Lakeside',
      latitude: 28.2096,
      longitude: 83.9595,
    });

    const lost = makeItem({ locationId: 'loc-thamel', location: thamel });
    const sameSpot = makeItem({ locationId: 'loc-thamel', location: thamel });
    const nearby = makeItem({
      locationId: 'loc-baneshwor',
      location: baneshwor,
    });
    const farAway = makeItem({ locationId: 'loc-pokhara', location: pokhara });

    expect(computeLocationScore(lost, sameSpot)).toBe(1);
    expect(computeLocationScore(lost, nearby)).toBeGreaterThan(0.75);
    expect(computeLocationScore(lost, farAway)).toBeLessThan(0.2);
  });

  it('penalizes items reported found much earlier than lost date and decays with days', () => {
    const lostAt = new Date('2026-11-05T10:00:00Z');
    const sameDayFound = new Date('2026-11-05T16:00:00Z');
    const weekLaterFound = new Date('2026-11-12T10:00:00Z');
    const monthBeforeFound = new Date('2026-10-05T10:00:00Z');

    const sSame = computeTimeScore(lostAt, sameDayFound);
    const sWeek = computeTimeScore(lostAt, weekLaterFound);
    const sEarly = computeTimeScore(lostAt, monthBeforeFound);

    expect(sSame).toBeGreaterThan(0.95);
    expect(sWeek).toBeGreaterThan(0.6);
    expect(sWeek).toBeLessThan(sSame);
    expect(sEarly).toBeLessThan(0.1);
  });

  it('computes high visual similarity for PNG images with identical color/structure', () => {
    const createSolidPngBuffer = (r: number, g: number, b: number) => {
      const png = new PNG({ width: 16, height: 16 });
      for (let i = 0; i < png.data.length; i += 4) {
        const shade = (i / 4) % 16;
        png.data[i] = Math.min(255, r + shade);
        png.data[i + 1] = g;
        png.data[i + 2] = b;
        png.data[i + 3] = 255;
      }
      return PNG.sync.write(png);
    };

    const redImg1 = decodeImageBuffer(createSolidPngBuffer(200, 30, 30), 'image/png');
    const redImg2 = decodeImageBuffer(createSolidPngBuffer(195, 35, 32), 'image/png');
    const blueImg = decodeImageBuffer(createSolidPngBuffer(20, 40, 220), 'image/png');

    expect(redImg1).not.toBeNull();
    expect(redImg2).not.toBeNull();
    expect(blueImg).not.toBeNull();

    const sig1 = computeImageSignature(redImg1!);
    const sig2 = computeImageSignature(redImg2!);
    const sigBlue = computeImageSignature(blueImg!);

    const similarScore = compareSignatures(sig1, sig2);
    const diffColorScore = compareSignatures(sig1, sigBlue);

    expect(similarScore).toBeGreaterThan(0.9);
    expect(diffColorScore).toBeLessThan(similarScore);
  });

  it('re-normalizes finalScore cleanly when images are missing', () => {
    const lost = makeItem({ location: makeLocation({}) });
    const found = makeItem({
      id: 'item-2',
      userId: 'user-2',
      reportType: ReportType.FOUND,
      location: makeLocation({}),
      dateLostOrFound: new Date('2026-11-01T14:00:00Z'),
    });

    const withoutImages = computeMatchScores(lost, found, {
      imageScore: 0,
      hasComparableImages: false,
    });
    const withMatchingImages = computeMatchScores(lost, found, {
      imageScore: 0.95,
      hasComparableImages: true,
    });

    expect(withoutImages.imageScore).toBe(0);
    expect(withoutImages.finalScore).toBeGreaterThan(0.9);
    expect(withMatchingImages.imageScore).toBe(0.95);
    expect(withMatchingImages.finalScore).toBeGreaterThan(0.95);
  });
});
