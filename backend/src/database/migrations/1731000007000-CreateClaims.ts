import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaims1731000007000 implements MigrationInterface {
  name = 'CreateClaims1731000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."claims_finder_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'DISPUTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."claims_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "claims" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "item_id" uuid NOT NULL,
        "claimant_id" uuid NOT NULL,
        "explanation" text NOT NULL,
        "evidence_description" text NOT NULL,
        "finder_status" "public"."claims_finder_status_enum" NOT NULL DEFAULT 'PENDING',
        "finder_reviewed_at" TIMESTAMP WITH TIME ZONE,
        "finder_notes" text,
        "status" "public"."claims_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewed_by_id" uuid,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "admin_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_claims_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ADD CONSTRAINT "FK_claims_item_id" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ADD CONSTRAINT "FK_claims_claimant_id" FOREIGN KEY ("claimant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ADD CONSTRAINT "FK_claims_reviewed_by_id" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_item_id" ON "claims" ("item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_claimant_id" ON "claims" ("claimant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_status" ON "claims" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_finder_status" ON "claims" ("finder_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_item_id_status" ON "claims" ("item_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_claimant_id_status" ON "claims" ("claimant_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "claims" DROP CONSTRAINT "FK_claims_reviewed_by_id"`);
    await queryRunner.query(`ALTER TABLE "claims" DROP CONSTRAINT "FK_claims_claimant_id"`);
    await queryRunner.query(`ALTER TABLE "claims" DROP CONSTRAINT "FK_claims_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_claimant_id_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_item_id_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_finder_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_claimant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_item_id"`);
    await queryRunner.query(`DROP TABLE "claims"`);
    await queryRunner.query(`DROP TYPE "public"."claims_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."claims_finder_status_enum"`);
  }
}
