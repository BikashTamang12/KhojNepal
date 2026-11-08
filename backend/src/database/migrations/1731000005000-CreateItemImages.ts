import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItemImages1731000005000 implements MigrationInterface {
  name = 'CreateItemImages1731000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "item_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "item_id" uuid NOT NULL,
        "file_path" character varying(500) NOT NULL,
        "original_filename" character varying(255),
        "mime_type" character varying(100),
        "file_size" integer,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_item_images_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_images" ADD CONSTRAINT "FK_item_images_item_id" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_item_images_item_id" ON "item_images" ("item_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "item_images" DROP CONSTRAINT "FK_item_images_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_images_item_id"`);
    await queryRunner.query(`DROP TABLE "item_images"`);
  }
}
