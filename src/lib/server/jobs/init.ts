import { jobRegistry } from './registry.ts';
import { jobsQueries } from '$db/queries/jobs.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { logger } from '$logger/logger.ts';
import { recoverInterruptedSyncs } from '$sync/index.ts';

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
 * Update the sync_arr job enabled state based on whether any scheduled configs exist
 * Called on startup and when sync configs are changed
 */
export async function updateSyncArrJobEnabled(): Promise<void> {
	const job = jobsQueries.getByName('sync_arr');
	if (!job) return;

	const hasScheduled = arrSyncQueries.hasAnyScheduledConfigs();
	const shouldEnable = hasScheduled;
	const isEnabled = job.enabled === 1;

	if (isEnabled !== shouldEnable) {
		jobsQueries.update(job.id, { enabled: shouldEnable });
		await logger.info(`sync_arr job ${shouldEnable ? 'enabled' : 'disabled'}`, {
			source: 'JobSystem',
			meta: { reason: shouldEnable ? 'scheduled configs exist' : 'no scheduled configs' }
		});
	}
}

/**
 * Initialize the job system
 * 1. Recover interrupted syncs from previous run
 * 2. Register all job definitions
 * 3. Sync with database
 * 4. Auto-enable/disable sync_arr based on config
 */
export async function initializeJobs(): Promise<void> {
	await logger.debug('Initializing job system', { source: 'JobSystem' });

	// Recover any syncs that were interrupted by a crash
	await recoverInterruptedSyncs();

	// Register all jobs
	registerAllJobs();

	// Sync with database
	const created = syncJobsWithDatabase();

	// Auto-enable/disable sync_arr job based on whether scheduled configs exist
	await updateSyncArrJobEnabled();

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
