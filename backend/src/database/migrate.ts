import { AppDataSource } from './data-source.js';
try {
  await AppDataSource.initialize();
  const migrations = await AppDataSource.runMigrations();
  console.log(
    migrations.length
      ? `Applied ${migrations.length} migration(s).`
      : 'Database is already up to date.',
  );
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
