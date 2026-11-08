import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLocations1731000003000 implements MigrationInterface {
  name = 'CreateLocations1731000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "province" character varying(100) NOT NULL,
        "district" character varying(100) NOT NULL,
        "municipality" character varying(150) NOT NULL,
        "area" character varying(150),
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locations_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_province" ON "locations" ("province")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_district" ON "locations" ("district")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_municipality" ON "locations" ("municipality")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_composite" ON "locations" ("province", "district", "municipality")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_composite"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_municipality"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_district"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_province"`);
    await queryRunner.query(`DROP TABLE "locations"`);
  }
}
