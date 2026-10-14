-- Runs once, the first time the postgres volume is created.
-- Dedicated database for `npm run test:e2e` (the suite truncates its tables).
CREATE DATABASE taskboard_test OWNER taskboard;
