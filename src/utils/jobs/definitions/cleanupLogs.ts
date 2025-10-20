import { config } from '$config';
import { logSettingsQueries } from '$db/queries/logSettings.ts';
import { logger } from '$logger';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Cleanup old log files job
 * Deletes log files older than the configured retention period
 */
export const cleanupLogsJob: JobDefinition = {
	name: 'cleanup_logs',
	description: 'Delete log files according to retention policy',
	schedule: 'daily',

	handler: async (): Promise<JobResult> => {
		try {
			// Get log settings
			const settings = logSettingsQueries.get();
			if (!settings) {
				return {
					success: false,
					error: 'Log settings not found'
				};
			}

			const retentionDays = settings.retention_days;
			const logsDir = config.paths.logs;

			// Calculate cutoff date
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

			await logger.info(`Cleaning up logs older than ${retentionDays} days`, {
				source: 'CleanupLogsJob',
				meta: { cutoffDate: cutoffDate.toISOString() }
			});

			// Read all files in logs directory
			let deletedCount = 0;
			let errorCount = 0;

			try {
				for await (const entry of Deno.readDir(logsDir)) {
					if (!entry.isFile) continue;

					// Only process log files (*.log, app-*.log, etc.)
					if (!entry.name.endsWith('.log')) continue;

					const filePath = `${logsDir}/${entry.name}`;

					try {
						// Get file stats
						const stat = await Deno.stat(filePath);

						// Check if file is older than cutoff
						if (stat.mtime && stat.mtime < cutoffDate) {
							await Deno.remove(filePath);
							deletedCount++;

							await logger.info(`Deleted old log file: ${entry.name}`, {
								source: 'CleanupLogsJob',
								meta: { file: entry.name, modifiedAt: stat.mtime.toISOString() }
							});
						}
					} catch (error) {
						errorCount++;
						await logger.error(`Failed to process log file: ${entry.name}`, {
							source: 'CleanupLogsJob',
							meta: { file: entry.name, error }
						});
					}
				}
			} catch (error) {
				return {
					success: false,
					error: `Failed to read logs directory: ${error instanceof Error ? error.message : String(error)}`
				};
			}

			const message = `Cleanup completed: deleted ${deletedCount} file(s), ${errorCount} error(s)`;

			if (errorCount > 0 && deletedCount === 0) {
				return {
					success: false,
					error: message
				};
			}

			return {
				success: true,
				output: message
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
