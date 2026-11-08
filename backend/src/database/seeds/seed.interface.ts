import { DataSource } from 'typeorm';

export interface Seeder {
  readonly name: string;
  run(dataSource: DataSource): Promise<void>;
}
