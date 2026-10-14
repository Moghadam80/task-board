import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTodoEvents1760000002000 implements MigrationInterface {
  name = 'AddTodoEvents1760000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "todo_events" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "todo_id" uuid NOT NULL,
      "actor_id" uuid,
      "action" varchar(20) NOT NULL,
      "changes" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_todo_events_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_todo_events_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
      CONSTRAINT "CHK_todo_events_action" CHECK ("action" IN ('created', 'updated', 'deleted'))
    )`);
    await queryRunner.query('CREATE INDEX "IDX_todo_events_todo_created" ON "todo_events" ("todo_id", "created_at" DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_todo_events_todo_created"');
    await queryRunner.query('DROP TABLE IF EXISTS "todo_events"');
  }
}
