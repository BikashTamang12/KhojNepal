import 'reflect-metadata';
import { AppDataSource } from '../data-source.js';
import { CategorySeeder } from './category.seed.js';
import { AdminSeeder } from './admin.seed.js';

async function runSeeders() {
  console.log('Starting KhojNepal database seeding...');

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Connected to database for seeding.');
    }

    const seeders = [
      new CategorySeeder(),
      new AdminSeeder(),
    ];

    for (const seeder of seeders) {
      console.log(`Running ${seeder.name}...`);
      await seeder.run(AppDataSource);
    }

    console.log('All seeders executed successfully.');
  } catch (error) {
    console.error('Error while running seeders:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed.');
    }
  }
}

await runSeeders();
