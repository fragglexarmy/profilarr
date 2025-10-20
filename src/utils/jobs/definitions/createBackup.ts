import { config } from '$config';
import { backupSettingsQueries } from '$db/queries/backupSettings.ts';
import { logger } from '$logger';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Create backup job
 * Creates a compressed backup of the entire data directory
 */
export const createBackupJob: JobDefinition = {
	name: 'create_backup',
	description: 'Create compressed backup of data directory',
	schedule: 'daily',

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

			const backupsDir = config.paths.backups;

			// Generate backup filename with timestamp
			const now = new Date();
			const datePart = now.toISOString().split('T')[0]; // YYYY-MM-DD
			const timePart = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, ''); // HHMMSS
			const backupFilename = `backup-${datePart}-${timePart}.tar.gz`;
			const backupPath = `${backupsDir}/${backupFilename}`;

			await logger.info(`Creating backup: ${backupFilename}`, {
				source: 'CreateBackupJob',
				meta: { backupPath }
			});

			// Create tar.gz archive of data directory
			const command = new Deno.Command('tar', {
				args: [
					'-czf',
					backupPath,
					'-C',
					config.paths.base,
					'data'
				],
				stdout: 'piped',
				stderr: 'piped'
			});

			const { code, stderr } = await command.output();

			if (code !== 0) {
				const errorMessage = new TextDecoder().decode(stderr);
				await logger.error('Backup creation failed', {
					source: 'CreateBackupJob',
					meta: { error: errorMessage, exitCode: code }
				});
				return {
					success: false,
					error: `tar command failed with code ${code}: ${errorMessage}`
				};
			}

			// Get backup file size
			const stat = await Deno.stat(backupPath);
			const sizeInMB = (stat.size / (1024 * 1024)).toFixed(2);

			await logger.info(`Backup created successfully: ${backupFilename} (${sizeInMB} MB)`, {
				source: 'CreateBackupJob',
				meta: { filename: backupFilename, sizeBytes: stat.size }
			});

			return {
				success: true,
				output: `Backup created: ${backupFilename} (${sizeInMB} MB)`
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
