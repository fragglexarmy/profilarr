import { config } from '$config';
import { backupSettingsQueries } from '$db/queries/backupSettings.ts';
import { logger } from '$logger/logger.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Cleanup old backups job
 * Deletes backup files older than the configured retention period
 */
export const cleanupBackupsJob: JobDefinition = {
	name: 'cleanup_backups',
	description: 'Delete backups according to retention policy',
	schedule: '0 0 * * *', // Daily at midnight

	handler: async (): Promise<JobResult> => {
		try {
			// Get backup settings
			const settings = backupSettingsQueries.get();
			if (!settings) {
				return {
					success: false,
					error: 'Backup settings not found'
				};
			}

			const retentionDays = settings.retention_days;
			const backupsDir = config.paths.backups;

			// Calculate cutoff date
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

			// Read all files in backups directory
			let deletedCount = 0;
			let errorCount = 0;

			try {
				for await (const entry of Deno.readDir(backupsDir)) {
					if (!entry.isFile) continue;

					// Only process backup files (backup-*.tar.gz)
					if (!entry.name.startsWith('backup-') || !entry.name.endsWith('.tar.gz')) {
						continue;
					}

					const filePath = `${backupsDir}/${entry.name}`;

					try {
						// Get file stats
						const stat = await Deno.stat(filePath);

						// Check if file is older than cutoff
						if (stat.mtime && stat.mtime < cutoffDate) {
							await Deno.remove(filePath);
							deletedCount++;
						}
					} catch (error) {
						errorCount++;
						await logger.error(`Failed to process backup file: ${entry.name}`, {
							source: 'CleanupBackupsJob',
							meta: { file: entry.name, error }
						});
					}
				}
			} catch (error) {
				return {
					success: false,
					error: `Failed to read backups directory: ${error instanceof Error ? error.message : String(error)}`
				};
			}

			const message = `Cleanup completed: deleted ${deletedCount} backup(s), ${errorCount} error(s)`;

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
