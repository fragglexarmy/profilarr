import { jobRegistry } from './registry.ts';
import { jobsQueries } from '$db/queries/jobs.ts';
import { logger } from '$logger/logger.ts';

// Import all job definitions
import { cleanupLogsJob } from './definitions/cleanupLogs.ts';
import { createBackupJob } from './definitions/createBackup.ts';
import { cleanupBackupsJob } from './definitions/cleanupBackups.ts';
import { syncDatabasesJob } from './definitions/syncDatabases.ts';
import { upgradeManagerJob } from './definitions/upgradeManager.ts';

/**
 * Register all job definitions
 */
function registerAllJobs(): void {
	// Register each job
	jobRegistry.register(cleanupLogsJob);
	jobRegistry.register(createBackupJob);
	jobRegistry.register(cleanupBackupsJob);
	jobRegistry.register(syncDatabasesJob);
	jobRegistry.register(upgradeManagerJob);
}

/**
 * Sync registered jobs with database
 * Creates DB records for any new jobs
 */
async function syncJobsWithDatabase(): Promise<void> {
	const registeredJobs = jobRegistry.getAll();

	for (const jobDef of registeredJobs) {
		// Check if job exists in database
		const existing = jobsQueries.getByName(jobDef.name);

		if (!existing) {
			// Create new job record
			const id = jobsQueries.create({
				name: jobDef.name,
				description: jobDef.description,
				schedule: jobDef.schedule,
				enabled: true
			});

			await logger.info(`Created job in database: ${jobDef.name}`, {
				source: 'JobSystem',
				meta: { jobId: id }
			});
		}
	}
}

/**
 * Initialize the job system
 * 1. Register all job definitions
 * 2. Sync with database
 */
export async function initializeJobs(): Promise<void> {
	await logger.info('Initializing job system', { source: 'JobSystem' });

	// Register all jobs
	registerAllJobs();

	// Sync with database
	await syncJobsWithDatabase();

	await logger.info('Job system initialized', {
		source: 'JobSystem',
		meta: { jobCount: jobRegistry.getAll().length }
	});
}
