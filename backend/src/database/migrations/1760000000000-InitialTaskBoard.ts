import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialTaskBoard1760000000000 implements MigrationInterface {
  name = 'InitialTaskBoard1760000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('owner', 'manager', 'member')`,
    );
    await queryRunner.query(
      `CREATE TYPE "todos_status_enum" AS ENUM ('todo', 'in_progress', 'done')`,
    );
    await queryRunner.query(
      `CREATE TYPE "todos_priority_enum" AS ENUM ('low', 'medium', 'high')`,
    );
    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar(120) NOT NULL,
      "email" varchar(254) NOT NULL,
      "password_hash" text NOT NULL,
      "role" "users_role_enum" NOT NULL DEFAULT 'member',
      "is_active" boolean NOT NULL DEFAULT true,
      "refresh_token_hash" text,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_users_email" UNIQUE ("email")
    )`);
    await queryRunner.query(`CREATE TABLE "todos" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "title" varchar(180) NOT NULL,
      "status" "todos_status_enum" NOT NULL DEFAULT 'todo',
      "priority" "todos_priority_enum" NOT NULL DEFAULT 'medium',
      "description" jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
      "due_date" date,
      "creator_id" uuid NOT NULL,
      "assignee_id" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_todos_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_todos_creator" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
      CONSTRAINT "FK_todos_assignee" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_todos_creator_id" ON "todos" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_todos_assignee_id" ON "todos" ("assignee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_todos_status" ON "todos" ("status")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_todos_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_todos_assignee_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_todos_creator_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "todos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "todos_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "todos_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
