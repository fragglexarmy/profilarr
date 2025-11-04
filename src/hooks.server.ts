import { config } from '$config';
import { logStartup } from '$logger/startup.ts';
import { logSettings } from '$logger/settings.ts';
import { db } from '$db/db.ts';
import { runMigrations } from '$db/migrations.ts';
import { initializeJobs } from '$jobs/init.ts';
import { jobScheduler } from '$jobs/scheduler.ts';
import { pcdManager } from '$pcd/pcd.ts';

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

// Initialize PCD caches (must be after migrations and log settings)
await pcdManager.initialize();

// Initialize and start job system
await initializeJobs();
await jobScheduler.start();
