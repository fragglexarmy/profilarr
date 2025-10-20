import type { Actions, RequestEvent } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { logSettingsQueries } from '$db/queries/logSettings.ts';
import { backupSettingsQueries } from '$db/queries/backupSettings.ts';
import { logSettings } from '$logger/settings.ts';
import { logger } from '$logger';

export const load = () => {
	const logSetting = logSettingsQueries.get();
	const backupSetting = backupSettingsQueries.get();

	if (!logSetting) {
		throw new Error('Log settings not found in database');
	}

	if (!backupSetting) {
		throw new Error('Backup settings not found in database');
	}

	return {
		logSettings: {
			rotation_strategy: logSetting.rotation_strategy,
			retention_days: logSetting.retention_days,
			max_file_size: logSetting.max_file_size,
			min_level: logSetting.min_level,
			enabled: logSetting.enabled === 1,
			file_logging: logSetting.file_logging === 1,
			console_logging: logSetting.console_logging === 1
		},
		backupSettings: {
			schedule: backupSetting.schedule,
			retention_days: backupSetting.retention_days,
			enabled: backupSetting.enabled === 1,
			include_database: backupSetting.include_database === 1,
			compression_enabled: backupSetting.compression_enabled === 1
		}
	};
};

export const actions: Actions = {
	updateLogs: async ({ request }: RequestEvent) => {
		const formData = await request.formData();

		// Parse form data
		const rotationStrategy = formData.get('rotation_strategy') as 'daily' | 'size' | 'both';
		const retentionDays = parseInt(formData.get('retention_days') as string);
		const maxFileSize = parseInt(formData.get('max_file_size') as string);
		const minLevel = formData.get('min_level') as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
		const enabled = formData.get('enabled') === 'on';
		const fileLogging = formData.get('file_logging') === 'on';
		const consoleLogging = formData.get('console_logging') === 'on';

		// Validate
		if (!rotationStrategy || !['daily', 'size', 'both'].includes(rotationStrategy)) {
			return fail(400, { error: 'Invalid rotation strategy' });
		}

		if (isNaN(retentionDays) || retentionDays < 1 || retentionDays > 365) {
			return fail(400, { error: 'Retention days must be between 1 and 365' });
		}

		if (isNaN(maxFileSize) || maxFileSize < 1 || maxFileSize > 1000) {
			return fail(400, { error: 'Max file size must be between 1 and 1000 MB' });
		}

		if (!minLevel || !['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(minLevel)) {
			return fail(400, { error: 'Invalid minimum log level' });
		}

		// Update settings
		const updated = logSettingsQueries.update({
			rotationStrategy,
			retentionDays,
			maxFileSize,
			minLevel,
			enabled,
			fileLogging,
			consoleLogging
		});

		if (!updated) {
			await logger.error('Failed to update log settings', {
				source: 'settings/general'
			});
			return fail(500, { error: 'Failed to update settings' });
		}

		// Reload settings into cache
		logSettings.reload();

		await logger.info('Log settings updated', {
			source: 'settings/general',
			meta: {
				rotationStrategy,
				retentionDays,
				maxFileSize,
				minLevel,
				enabled,
				fileLogging,
				consoleLogging
			}
		});

		return { success: true };
	},

	resetLogs: async () => {
		const reset = logSettingsQueries.reset();

		if (!reset) {
			await logger.error('Failed to reset log settings', {
				source: 'settings/general'
			});
			return fail(500, { error: 'Failed to reset settings' });
		}

		// Reload settings into cache
		logSettings.reload();

		await logger.info('Log settings reset to defaults', {
			source: 'settings/general'
		});

		return { success: true, reset: true };
	},

	updateBackups: async ({ request }: RequestEvent) => {
		const formData = await request.formData();

		// Parse form data
		const schedule = formData.get('schedule') as string;
		const retentionDays = parseInt(formData.get('retention_days') as string);
		const enabled = formData.get('enabled') === 'on';
		const compressionEnabled = formData.get('compression_enabled') === 'on';

		// Validate
		if (!schedule) {
			return fail(400, { error: 'Schedule is required' });
		}

		if (isNaN(retentionDays) || retentionDays < 1 || retentionDays > 365) {
			return fail(400, { error: 'Retention days must be between 1 and 365' });
		}

		// Update settings
		const updated = backupSettingsQueries.update({
			schedule,
			retentionDays,
			enabled,
			compressionEnabled
		});

		if (!updated) {
			await logger.error('Failed to update backup settings', {
				source: 'settings/general'
			});
			return fail(500, { error: 'Failed to update settings' });
		}

		await logger.info('Backup settings updated', {
			source: 'settings/general',
			meta: {
				schedule,
				retentionDays,
				enabled,
				compressionEnabled
			}
		});

		return { success: true };
	}
};
