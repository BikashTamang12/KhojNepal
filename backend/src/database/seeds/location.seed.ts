import { DataSource } from 'typeorm';
import { Seeder } from './seed.interface.js';

interface SeedLocation {
  province: string;
  district: string;
  municipality: string;
  area?: string;
  latitude: number;
  longitude: number;
}

export class LocationSeeder implements Seeder {
  readonly name = 'LocationSeeder';

  async run(dataSource: DataSource): Promise<void> {
    const defaultLocations: SeedLocation[] = [
      // Bagmati Province - Kathmandu Valley & Hubs
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'Thamel', latitude: 27.7154, longitude: 85.3123 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'New Baneshwor', latitude: 27.6915, longitude: 85.342 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'Ratnapark / New Road', latitude: 27.7049, longitude: 85.3136 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'Kalanki', latitude: 27.6939, longitude: 85.2816 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'Koteshwor', latitude: 27.6778, longitude: 85.3491 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'Boudha', latitude: 27.7215, longitude: 85.362 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', area: 'Maharajgunj', latitude: 27.7365, longitude: 85.3304 },
      { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kirtipur Municipality', area: 'Tribhuvan University Area', latitude: 27.6805, longitude: 85.2869 },
      { province: 'Bagmati', district: 'Lalitpur', municipality: 'Lalitpur Metropolitan City', area: 'Patan / Jawalakhel', latitude: 27.6725, longitude: 85.3139 },
      { province: 'Bagmati', district: 'Lalitpur', municipality: 'Lalitpur Metropolitan City', area: 'Satdobato', latitude: 27.6588, longitude: 85.3247 },
      { province: 'Bagmati', district: 'Bhaktapur', municipality: 'Bhaktapur Municipality', area: 'Durbar Square', latitude: 27.6721, longitude: 85.4279 },
      { province: 'Bagmati', district: 'Bhaktapur', municipality: 'Madhyapur Thimi Municipality', area: 'Thimi', latitude: 27.6802, longitude: 85.3879 },
      { province: 'Bagmati', district: 'Chitwan', municipality: 'Bharatpur Metropolitan City', area: 'Narayangarh', latitude: 27.6993, longitude: 84.4265 },
      { province: 'Bagmati', district: 'Makwanpur', municipality: 'Hetauda Sub-Metropolitan City', area: 'Hetauda Bazaar', latitude: 27.4291, longitude: 85.0322 },

      // Gandaki Province
      { province: 'Gandaki', district: 'Kaski', municipality: 'Pokhara Metropolitan City', area: 'Lakeside', latitude: 28.2096, longitude: 83.9595 },
      { province: 'Gandaki', district: 'Kaski', municipality: 'Pokhara Metropolitan City', area: 'Prithvi Chowk', latitude: 28.2043, longitude: 83.9866 },
      { province: 'Gandaki', district: 'Tanahun', municipality: 'Byas Municipality', area: 'Damauli', latitude: 27.9772, longitude: 84.2654 },

      // Koshi Province
      { province: 'Koshi', district: 'Morang', municipality: 'Biratnagar Metropolitan City', area: 'Traffic Chowk', latitude: 26.4525, longitude: 87.2718 },
      { province: 'Koshi', district: 'Sunsari', municipality: 'Dharan Sub-Metropolitan City', area: 'Bhanuchowk', latitude: 26.8143, longitude: 87.2846 },
      { province: 'Koshi', district: 'Sunsari', municipality: 'Itahari Sub-Metropolitan City', area: 'Main Chowk', latitude: 26.6646, longitude: 87.2718 },
      { province: 'Koshi', district: 'Jhapa', municipality: 'Birtamode Municipality', area: 'Mukti Chowk', latitude: 26.6435, longitude: 87.9912 },

      // Madhesh Province
      { province: 'Madhesh', district: 'Parsa', municipality: 'Birgunj Metropolitan City', area: 'Ghantaghar', latitude: 27.0104, longitude: 84.8778 },
      { province: 'Madhesh', district: 'Dhanusha', municipality: 'Janakpurdham Sub-Metropolitan City', area: 'Janaki Chowk', latitude: 26.7288, longitude: 85.9255 },

      // Lumbini Province
      { province: 'Lumbini', district: 'Rupandehi', municipality: 'Butwal Sub-Metropolitan City', area: 'Traffic Chowk', latitude: 27.7006, longitude: 83.4484 },
      { province: 'Lumbini', district: 'Rupandehi', municipality: 'Siddharthanagar Municipality', area: 'Bhairahawa', latitude: 27.5057, longitude: 83.4508 },
      { province: 'Lumbini', district: 'Banke', municipality: 'Nepalgunj Sub-Metropolitan City', area: 'Dhamboji', latitude: 28.05, longitude: 81.6167 },
      { province: 'Lumbini', district: 'Dang', municipality: 'Ghorahi Sub-Metropolitan City', area: 'Tulsipur Chowk', latitude: 28.0487, longitude: 82.4878 },

      // Karnali Province
      { province: 'Karnali', district: 'Surkhet', municipality: 'Birendranagar Municipality', area: 'Mangalgadhi Chowk', latitude: 28.5978, longitude: 81.6226 },

      // Sudurpashchim Province
      { province: 'Sudurpashchim', district: 'Kailali', municipality: 'Dhangadhi Sub-Metropolitan City', area: 'Chauraha', latitude: 28.7052, longitude: 80.5831 },
      { province: 'Sudurpashchim', district: 'Kanchanpur', municipality: 'Bhimdatta Municipality', area: 'Mahendranagar', latitude: 28.9631, longitude: 80.1773 },
    ];

    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'locations'
      );
    `);

    if (!tableExists[0]?.exists) {
      console.log('[LocationSeeder] Skipped: "locations" table does not exist yet. Run migrations first.');
      return;
    }

    let inserted = 0;
    for (const loc of defaultLocations) {
      const existing = await dataSource.query(
        `
        SELECT id FROM locations
        WHERE province = $1
          AND district = $2
          AND municipality = $3
          AND area IS NOT DISTINCT FROM $4
        LIMIT 1;
        `,
        [loc.province, loc.district, loc.municipality, loc.area ?? null],
      );

      if (existing.length === 0) {
        await dataSource.query(
          `
          INSERT INTO locations (province, district, municipality, area, latitude, longitude, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
          `,
          [
            loc.province,
            loc.district,
            loc.municipality,
            loc.area ?? null,
            loc.latitude,
            loc.longitude,
          ],
        );
        inserted++;
      }
    }

    console.log(
      `[LocationSeeder] Processed ${defaultLocations.length} locations (${inserted} newly inserted).`,
    );
  }
}
