import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItemHandovers1731000008000 implements MigrationInterface {
  name = 'CreateItemHandovers1731000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."item_handovers_confirmation_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "item_handovers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "claim_id" uuid NOT NULL,
        "handed_over_by_id" uuid NOT NULL,
        "received_by_id" uuid NOT NULL,
        "handover_location" character varying(255) NOT NULL,
        "handover_at" TIMESTAMP WITH TIME ZONE,
        "confirmation_status" "public"."item_handovers_confirmation_status_enum" NOT NULL DEFAULT 'PENDING',
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_item_handovers_claim_id" UNIQUE ("claim_id"),
        CONSTRAINT "PK_item_handovers_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_handovers" ADD CONSTRAINT "FK_item_handovers_claim_id" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_handovers" ADD CONSTRAINT "FK_item_handovers_handed_over_by_id" FOREIGN KEY ("handed_over_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_handovers" ADD CONSTRAINT "FK_item_handovers_received_by_id" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_item_handovers_claim_id" ON "item_handovers" ("claim_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_item_handovers_handed_over_by_id" ON "item_handovers" ("handed_over_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_item_handovers_received_by_id" ON "item_handovers" ("received_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_item_handovers_confirmation_status" ON "item_handovers" ("confirmation_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "item_handovers" DROP CONSTRAINT "FK_item_handovers_received_by_id"`);
    await queryRunner.query(`ALTER TABLE "item_handovers" DROP CONSTRAINT "FK_item_handovers_handed_over_by_id"`);
    await queryRunner.query(`ALTER TABLE "item_handovers" DROP CONSTRAINT "FK_item_handovers_claim_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_handovers_confirmation_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_handovers_received_by_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_handovers_handed_over_by_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_handovers_claim_id"`);
    await queryRunner.query(`DROP TABLE "item_handovers"`);
    await queryRunner.query(`DROP TYPE "public"."item_handovers_confirmation_status_enum"`);
  }
}
