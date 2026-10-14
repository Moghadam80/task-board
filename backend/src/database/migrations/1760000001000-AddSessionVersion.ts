import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionVersion1760000001000 implements MigrationInterface {
  name = 'AddSessionVersion1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "session_version" integer NOT NULL DEFAULT 0',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN "session_version"',
    );
  }
}
