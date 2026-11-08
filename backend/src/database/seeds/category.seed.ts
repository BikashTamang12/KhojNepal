import { DataSource } from 'typeorm';
import { Seeder } from './seed.interface.js';

export class CategorySeeder implements Seeder {
  readonly name = 'CategorySeeder';

  async run(dataSource: DataSource): Promise<void> {
    const defaultCategories = [
      { name: 'Electronics', description: 'Phones, laptops, chargers, headphones, and electronic gadgets' },
      { name: 'Documents', description: 'Citizenship, passport, license, college IDs, certificates, and cards' },
      { name: 'Bags', description: 'Backpacks, handbags, luggage, and pouches' },
      { name: 'Clothing', description: 'Jackets, shoes, glasses, caps, and wearable apparel' },
      { name: 'Accessories', description: 'Watches, jewelry, keychains, and rings' },
      { name: 'Other', description: 'Miscellaneous and other unlisted items' },
    ];

    // Check if categories table exists before attempting to seed
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'categories'
      );
    `);

    if (!tableExists[0]?.exists) {
      console.log('[CategorySeeder] Skipped: "categories" table does not exist yet. Run migrations first.');
      return;
    }

    for (const cat of defaultCategories) {
      await dataSource.query(
        `
        INSERT INTO categories (name, description, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING;
        `,
        [cat.name, cat.description],
      );
    }

    console.log('[CategorySeeder] Categories seeded successfully.');
  }
}
