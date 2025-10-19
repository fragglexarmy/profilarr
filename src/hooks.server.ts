import { config } from '$config';
import { logStartup } from './utils/logger/startup.ts';
import { db } from '$db/db.ts';
import { runMigrations } from '$db/migrations.ts';

// Initialize configuration on server startup
await config.init();

// Log startup banner
await logStartup();

// Initialize database
await db.initialize();

// Run database migrations
await runMigrations();
