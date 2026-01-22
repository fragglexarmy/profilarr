import { config } from '$config';
import { logSettingsQueries } from '$db/queries/logSettings.ts';
import { logger } from '$logger/logger.ts';
import { cleanupLogs } from '../logic/cleanupLogs.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Cleanup old log files job
 * Deletes daily log files (YYYY-MM-DD.log) older than the configured retention period
 */
export const cleanupLogsJob: JobDefinition = {
	name: 'cleanup_logs',
	description: 'Delete log files according to retention policy',
	schedule: '0 0 * * *', // Daily at midnight

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

			// Run cleanup
			const result = await cleanupLogs(logsDir, retentionDays);

			// Log individual deletions
			// Note: We don't have access to which specific files were deleted anymore
			// If we need that, we can modify cleanupLogs to return the list

			// Log errors
			for (const { file, error } of result.errors) {
				await logger.error(`Failed to process log file: ${file}`, {
					source: 'CleanupLogsJob',
					meta: { file, error }
				});
			}

			const message = `Cleanup completed: deleted ${result.deletedCount} file(s), ${result.errorCount} error(s)`;

			if (result.errorCount > 0 && result.deletedCount === 0) {
				return {
					success: false,
					error: message
				};
			}

			// Mark as skipped if nothing was deleted (no old logs to clean)
			if (result.deletedCount === 0) {
				return {
					success: true,
					skipped: true,
					output: 'No old log files to clean up'
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
