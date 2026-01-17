import { jobRegistry } from './registry.ts';
import { jobsQueries } from '$db/queries/jobs.ts';
import { logger } from '$logger/logger.ts';

// Import all job definitions
import { cleanupLogsJob } from './definitions/cleanupLogs.ts';
import { createBackupJob } from './definitions/createBackup.ts';
import { cleanupBackupsJob } from './definitions/cleanupBackups.ts';
import { syncDatabasesJob } from './definitions/syncDatabases.ts';
import { upgradeManagerJob } from './definitions/upgradeManager.ts';
import { syncArrJob } from './definitions/syncArr.ts';
import { renameManagerJob } from './definitions/renameManager.ts';

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
	jobRegistry.register(syncArrJob);
	jobRegistry.register(renameManagerJob);
}

/**
 * Sync registered jobs with database
 * Creates DB records for any new jobs
 * Returns list of newly created job names
 */
function syncJobsWithDatabase(): string[] {
	const registeredJobs = jobRegistry.getAll();
	const created: string[] = [];

	for (const jobDef of registeredJobs) {
		const existing = jobsQueries.getByName(jobDef.name);

		if (!existing) {
			jobsQueries.create({
				name: jobDef.name,
				description: jobDef.description,
				schedule: jobDef.schedule,
				enabled: true
			});
			created.push(jobDef.name);
		}
	}

	return created;
}

/**
 * Initialize the job system
 * 1. Register all job definitions
 * 2. Sync with database
 */
export async function initializeJobs(): Promise<void> {
	await logger.debug('Initializing job system', { source: 'JobSystem' });

	// Register all jobs
	registerAllJobs();

	// Sync with database
	const created = syncJobsWithDatabase();

	const meta: { jobCount: number; created?: string[] } = {
		jobCount: jobRegistry.getAll().length
	};
	if (created.length > 0) {
		meta.created = created;
	}

	await logger.info('Job system ready', {
		source: 'JobSystem',
		meta
	});
}
