import { config } from '$config';
import { backupSettingsQueries } from '$db/queries/backupSettings.ts';
import { logger } from '$logger/logger.ts';
import { createBackup } from '../logic/createBackup.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Create backup job
 * Creates a compressed backup of the entire data directory
 */
export const createBackupJob: JobDefinition = {
	name: 'create_backup',
	description: 'Create compressed backup of data directory',
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

			const sourceDir = config.paths.data;
			const backupsDir = config.paths.backups;

			// Run backup creation
			const result = await createBackup(sourceDir, backupsDir);

			if (!result.success) {
				await logger.error('Backup creation failed', {
					source: 'CreateBackupJob',
					meta: { error: result.error }
				});
				return {
					success: false,
					error: result.error ?? 'Unknown error'
				};
			}

			// Calculate size in MB for display
			const sizeInMB = ((result.sizeBytes ?? 0) / (1024 * 1024)).toFixed(2);

			return {
				success: true,
				output: `Backup created: ${result.filename} (${sizeInMB} MB)`
			};
		} catch (error) {
			await logger.error('Backup creation failed', {
				source: 'CreateBackupJob',
				meta: { error }
			});
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
