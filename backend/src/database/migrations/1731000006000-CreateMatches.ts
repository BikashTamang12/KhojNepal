import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatches1731000006000 implements MigrationInterface {
  name = 'CreateMatches1731000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."matches_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lost_item_id" uuid NOT NULL,
        "found_item_id" uuid NOT NULL,
        "text_score" numeric(5,4) NOT NULL,
        "image_score" numeric(5,4) NOT NULL,
        "location_score" numeric(5,4) NOT NULL,
        "time_score" numeric(5,4) NOT NULL,
        "final_score" numeric(5,4) NOT NULL,
        "status" "public"."matches_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_matches_lost_found" UNIQUE ("lost_item_id", "found_item_id"),
        CONSTRAINT "CHK_matches_no_self_match" CHECK ("lost_item_id" <> "found_item_id"),
        CONSTRAINT "PK_matches_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_lost_item_id" FOREIGN KEY ("lost_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_found_item_id" FOREIGN KEY ("found_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_matches_lost_item_id" ON "matches" ("lost_item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_matches_found_item_id" ON "matches" ("found_item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_matches_final_score" ON "matches" ("final_score")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_matches_status" ON "matches" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_found_item_id"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_lost_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_final_score"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_found_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_lost_item_id"`);
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(`DROP TYPE "public"."matches_status_enum"`);
  }
}
