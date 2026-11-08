import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'node:path';

import { User } from '../users/entities/user.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { Item } from '../items/entities/item.entity.js';
import { ItemImage } from '../items/entities/item-image.entity.js';
import { Match } from '../matching/entities/match.entity.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { ItemHandover } from '../handovers/entities/item-handover.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'khojnepal',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Category,
    Location,
    Item,
    ItemImage,
    Match,
    Claim,
    ItemHandover,
    Notification,
  ],
  migrations: ['src/database/migrations/*.ts'],
});
