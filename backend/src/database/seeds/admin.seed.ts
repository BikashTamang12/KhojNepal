import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Seeder } from './seed.interface.js';

export class AdminSeeder implements Seeder {
  readonly name = 'AdminSeeder';

  async run(dataSource: DataSource): Promise<void> {
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'password';
    const adminFullName = 'KhojNepal Administrator';

    // Check if users table exists before attempting to seed
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!tableExists[0]?.exists) {
      console.log('[AdminSeeder] Skipped: "users" table does not exist yet. Run migrations first.');
      return;
    }

    // Check if an admin with this email already exists
    const existingAdmin = await dataSource.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1;`,
      [adminEmail],
    );

    if (existingAdmin.length > 0) {
      console.log(`[AdminSeeder] Admin user "${adminEmail}" already exists. Skipping.`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await dataSource.query(
      `
      INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, 'ADMIN', true, true, NOW(), NOW());
      `,
      [adminFullName, adminEmail, passwordHash],
    );

    console.log(`[AdminSeeder] Initial admin user "${adminEmail}" created successfully.`);
  }
}
