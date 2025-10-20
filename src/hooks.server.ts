import { config } from '$config';
import { logStartup } from './utils/logger/startup.ts';
import { logSettings } from './utils/logger/settings.ts';
import { db } from '$db/db.ts';
import { runMigrations } from '$db/migrations.ts';
import { initializeJobs } from './utils/jobs/init.ts';
import { jobScheduler } from './utils/jobs/scheduler.ts';

// Initialize configuration on server startup
await config.init();

// Log startup banner
await logStartup();

// Initialize database
await db.initialize();

// Run database migrations
await runMigrations();

// Load log settings from database (must be after migrations)
logSettings.load();

// Initialize and start job system
await initializeJobs();
await jobScheduler.start();
