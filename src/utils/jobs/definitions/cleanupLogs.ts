import { config } from '$config';
import { logSettingsQueries } from '$db/queries/logSettings.ts';
import { logger } from '$logger';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Cleanup old log files job
 * Deletes daily log files (YYYY-MM-DD.log) older than the configured retention period
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

			// Calculate cutoff date (YYYY-MM-DD format)
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
			const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

			await logger.info(`Cleaning up logs older than ${retentionDays} days`, {
				source: 'CleanupLogsJob',
				meta: { cutoffDate: cutoffDateStr }
			});

			// Read all files in logs directory
			let deletedCount = 0;
			let errorCount = 0;

			// Regex to match daily log files: YYYY-MM-DD.log
			const dateLogPattern = /^(\d{4}-\d{2}-\d{2})\.log$/;

			try {
				for await (const entry of Deno.readDir(logsDir)) {
					if (!entry.isFile) continue;

					// Only process log files matching YYYY-MM-DD.log pattern
					const match = entry.name.match(dateLogPattern);
					if (!match) continue;

					const logDate = match[1]; // Extract YYYY-MM-DD from filename
					const filePath = `${logsDir}/${entry.name}`;

					try {
						// Compare date strings directly (YYYY-MM-DD format sorts correctly)
						if (logDate < cutoffDateStr) {
							await Deno.remove(filePath);
							deletedCount++;

							await logger.info(`Deleted old log file: ${entry.name}`, {
								source: 'CleanupLogsJob',
								meta: { file: entry.name, logDate }
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
					error: `Failed to read logs directory: ${
						error instanceof Error ? error.message : String(error)
					}`
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
