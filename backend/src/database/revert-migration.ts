import { AppDataSource } from './data-source.js';
try {
  await AppDataSource.initialize();
  await AppDataSource.undoLastMigration();
  console.log('Reverted the last migration.');
} catch (error) {
  console.error('Migration rollback failed:', error);
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
