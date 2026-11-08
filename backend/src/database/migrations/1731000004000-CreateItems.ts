import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItems1731000004000 implements MigrationInterface {
  name = 'CreateItems1731000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."items_report_type_enum" AS ENUM('LOST', 'FOUND')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."items_status_enum" AS ENUM('OPEN', 'CLAIM_PENDING', 'RESOLVED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "location_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "brand" character varying(100),
        "color" character varying(50),
        "report_type" "public"."items_report_type_enum" NOT NULL,
        "status" "public"."items_status_enum" NOT NULL DEFAULT 'OPEN',
        "date_lost_or_found" TIMESTAMP WITH TIME ZONE NOT NULL,
        "specific_location_details" text,
        "contact_info" character varying(150),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_items_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_items_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_items_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_items_location_id" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_user_id" ON "items" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_category_id" ON "items" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_location_id" ON "items" ("location_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_brand" ON "items" ("brand")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_color" ON "items" ("color")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_report_type" ON "items" ("report_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_status" ON "items" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_created_at" ON "items" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_report_type_status" ON "items" ("report_type", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_category_id_status" ON "items" ("category_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_location_id_status" ON "items" ("location_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_items_location_id"`);
    await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_items_category_id"`);
    await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_items_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_location_id_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_category_id_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_report_type_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_report_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_color"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_brand"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_location_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_category_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_items_user_id"`);
    await queryRunner.query(`DROP TABLE "items"`);
    await queryRunner.query(`DROP TYPE "public"."items_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."items_report_type_enum"`);
  }
}
