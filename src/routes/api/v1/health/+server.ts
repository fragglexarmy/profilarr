import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$db/db.ts';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { jobsQueries } from '$db/queries/jobs.ts';
import { backupSettingsQueries } from '$db/queries/backupSettings.ts';
import { appInfoQueries } from '$db/queries/appInfo.ts';
import { getCache } from '$pcd/cache.ts';
import { config } from '$config';
import type { components } from '$api/v1.d.ts';

type HealthResponse = components['schemas']['HealthResponse'];
type ComponentStatus = components['schemas']['ComponentStatus'];

// Track startup time for uptime calculation
const startupTime = Date.now();

// Thresholds
const LOG_SIZE_WARN_BYTES = 100 * 1024 * 1024; // 100MB
const LOG_SIZE_CRITICAL_BYTES = 500 * 1024 * 1024; // 500MB

export const GET: RequestHandler = async () => {
	const response: HealthResponse = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: appInfoQueries.getVersion(),
		uptime: Math.floor((Date.now() - startupTime) / 1000),
		components: {
			database: checkDatabase(),
			databases: checkDatabases(),
			jobs: checkJobs(),
			backups: await checkBackups(),
			logs: await checkLogs()
		}
	};

	// Determine overall status
	response.status = determineOverallStatus(response.components);

	return json(response);
};

function determineOverallStatus(components: HealthResponse['components']): ComponentStatus {
	const statuses = [
		components.database.status,
		components.databases.status,
		components.jobs.status,
		components.backups.status,
		components.logs.status
	];

	// If database is unhealthy, everything is unhealthy
	if (components.database.status === 'unhealthy') {
		return 'unhealthy';
	}

	// If all PCD databases are unhealthy, system is unhealthy
	if (components.databases.status === 'unhealthy') {
		return 'unhealthy';
	}

	// If any component is degraded, system is degraded
	if (statuses.some((s) => s === 'degraded')) {
		return 'degraded';
	}

	return 'healthy';
}

function checkDatabase(): HealthResponse['components']['database'] {
	const start = performance.now();

	try {
		db.queryFirst('SELECT 1');
		const responseTimeMs = Math.round((performance.now() - start) * 100) / 100;

		return {
			status: 'healthy',
			responseTimeMs
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			responseTimeMs: -1,
			message: error instanceof Error ? error.message : 'Database query failed'
		};
	}
}

function checkDatabases(): HealthResponse['components']['databases'] {
	try {
		const allDatabases = databaseInstancesQueries.getAll();
		const enabledDatabases = allDatabases.filter((d) => d.enabled === 1);
		const disabledDatabases = allDatabases.filter((d) => d.enabled === 0);

		// Check how many have compiled caches
		let cachedCount = 0;
		for (const dbInstance of enabledDatabases) {
			const cache = getCache(dbInstance.id);
			if (cache?.isBuilt()) {
				cachedCount++;
			}
		}

		const total = allDatabases.length;
		const enabled = enabledDatabases.length;
		const disabled = disabledDatabases.length;

		let status: ComponentStatus = 'healthy';
		let message: string | undefined;

		if (total === 0) {
			status = 'healthy';
			message = 'No databases configured';
		} else if (enabled === 0) {
			status = 'unhealthy';
			message = 'All databases are disabled';
		} else if (disabled > 0) {
			status = 'degraded';
			message = `${disabled} database(s) disabled due to errors`;
		} else if (cachedCount < enabled) {
			status = 'degraded';
			message = `${enabled - cachedCount} database(s) not cached`;
		}

		return {
			status,
			total,
			enabled,
			cached: cachedCount,
			disabled,
			message
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			total: 0,
			enabled: 0,
			cached: 0,
			disabled: 0,
			message: error instanceof Error ? error.message : 'Failed to check databases'
		};
	}
}

function checkJobs(): HealthResponse['components']['jobs'] {
	try {
		const jobs = jobsQueries.getAll();
		const lastRun: Record<string, string | null> = {};

		for (const job of jobs) {
			lastRun[job.name] = job.last_run_at ?? null;
		}

		// Check if sync_arr job is stale (hasn't run in 5+ minutes when it should run every minute)
		const syncArrJob = jobs.find((j) => j.name === 'sync_arr');
		let status: ComponentStatus = 'healthy';
		let message: string | undefined;

		if (syncArrJob?.enabled && syncArrJob.last_run_at) {
			const lastRunTime = new Date(syncArrJob.last_run_at).getTime();
			const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

			if (lastRunTime < fiveMinutesAgo) {
				status = 'degraded';
				message = 'sync_arr job is stale';
			}
		}

		return {
			status,
			lastRun,
			message
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			message: error instanceof Error ? error.message : 'Failed to check jobs'
		};
	}
}

async function checkBackups(): Promise<HealthResponse['components']['backups']> {
	try {
		const settings = backupSettingsQueries.get();
		const enabled = settings?.enabled === 1;
		const retentionDays = settings?.retention_days ?? 30;

		if (!enabled) {
			return {
				status: 'healthy',
				enabled: false,
				message: 'Backups disabled'
			};
		}

		// Check backup directory
		const backupPath = config.paths.backups;
		let count = 0;
		let totalSizeBytes = 0;
		let lastBackup: string | null = null;
		let lastBackupTime: number | null = null;

		try {
			for await (const entry of Deno.readDir(backupPath)) {
				if (entry.isFile && entry.name.startsWith('backup-') && entry.name.endsWith('.tar.gz')) {
					count++;
					const stat = await Deno.stat(`${backupPath}/${entry.name}`);
					totalSizeBytes += stat.size;

					if (!lastBackupTime || stat.mtime!.getTime() > lastBackupTime) {
						lastBackupTime = stat.mtime!.getTime();
						lastBackup = stat.mtime!.toISOString();
					}
				}
			}
		} catch {
			// Directory might not exist yet
		}

		let status: ComponentStatus = 'healthy';
		let message: string | undefined;

		if (count === 0) {
			status = 'degraded';
			message = 'No backups exist';
		} else if (lastBackupTime) {
			// Check if last backup is older than 2x retention period
			const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
			if (lastBackupTime < twoDaysAgo) {
				status = 'degraded';
				message = 'Last backup is older than 2 days';
			}
		}

		return {
			status,
			enabled,
			lastBackup,
			count,
			totalSizeBytes,
			retentionDays,
			message
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			enabled: false,
			message: error instanceof Error ? error.message : 'Failed to check backups'
		};
	}
}

async function checkLogs(): Promise<HealthResponse['components']['logs']> {
	try {
		const logPath = config.paths.logs;
		let totalSizeBytes = 0;
		let fileCount = 0;
		let oldestLog: string | null = null;
		let newestLog: string | null = null;

		const logDateRegex = /^(\d{4}-\d{2}-\d{2})\.log$/;

		try {
			for await (const entry of Deno.readDir(logPath)) {
				if (entry.isFile) {
					const match = entry.name.match(logDateRegex);
					if (match) {
						fileCount++;
						const stat = await Deno.stat(`${logPath}/${entry.name}`);
						totalSizeBytes += stat.size;

						const dateStr = match[1];
						if (!oldestLog || dateStr < oldestLog) {
							oldestLog = dateStr;
						}
						if (!newestLog || dateStr > newestLog) {
							newestLog = dateStr;
						}
					}
				}
			}
		} catch {
			// Directory might not exist yet
		}

		let status: ComponentStatus = 'healthy';
		let message: string | undefined;

		if (totalSizeBytes > LOG_SIZE_CRITICAL_BYTES) {
			status = 'degraded';
			message = `Log directory is very large (${Math.round(totalSizeBytes / 1024 / 1024)}MB)`;
		} else if (totalSizeBytes > LOG_SIZE_WARN_BYTES) {
			status = 'degraded';
			message = `Log directory is getting large (${Math.round(totalSizeBytes / 1024 / 1024)}MB)`;
		}

		return {
			status,
			totalSizeBytes,
			fileCount,
			oldestLog,
			newestLog,
			message
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			message: error instanceof Error ? error.message : 'Failed to check logs'
		};
	}
}
