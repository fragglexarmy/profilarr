import type { Actions, RequestEvent } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { logger } from '$logger/logger.ts';
import { notificationServicesQueries } from '$db/queries/notificationServices.ts';

export const actions: Actions = {
	create: async ({ request }: RequestEvent) => {
		const formData = await request.formData();
		const serviceType = formData.get('type') as string;
		const name = formData.get('name') as string;

		if (!serviceType || !name) {
			return fail(400, { error: 'Service type and name are required' });
		}

		// Validate name uniqueness
		if (notificationServicesQueries.existsByName(name)) {
			return fail(400, { error: 'A service with this name already exists' });
		}

		// Build config based on service type
		let config: Record<string, unknown> = {};
		let enabledTypes: string[] = [];

		if (serviceType === 'discord') {
			const webhookUrl = formData.get('webhook_url') as string;
			const username = formData.get('username') as string;
			const avatarUrl = formData.get('avatar_url') as string;
			const enableMentions = formData.get('enable_mentions') === 'on';

			if (!webhookUrl) {
				return fail(400, { error: 'Webhook URL is required for Discord' });
			}

			config = {
				webhook_url: webhookUrl,
				...(username && { username }),
				...(avatarUrl && { avatar_url: avatarUrl }),
				enable_mentions: enableMentions
			};

			// Get enabled notification types
			const jobBackupSuccess = formData.get('job.create_backup.success') === 'on';
			const jobBackupFailed = formData.get('job.create_backup.failed') === 'on';
			const jobCleanupBackupsSuccess = formData.get('job.cleanup_backups.success') === 'on';
			const jobCleanupBackupsFailed = formData.get('job.cleanup_backups.failed') === 'on';
			const jobCleanupLogsSuccess = formData.get('job.cleanup_logs.success') === 'on';
			const jobCleanupLogsFailed = formData.get('job.cleanup_logs.failed') === 'on';

			enabledTypes = [
				...(jobBackupSuccess ? ['job.create_backup.success'] : []),
				...(jobBackupFailed ? ['job.create_backup.failed'] : []),
				...(jobCleanupBackupsSuccess ? ['job.cleanup_backups.success'] : []),
				...(jobCleanupBackupsFailed ? ['job.cleanup_backups.failed'] : []),
				...(jobCleanupLogsSuccess ? ['job.cleanup_logs.success'] : []),
				...(jobCleanupLogsFailed ? ['job.cleanup_logs.failed'] : [])
			];
		}

		// Generate UUID for the service
		const id = crypto.randomUUID();

		// Create the service
		const success = notificationServicesQueries.create({
			id,
			name,
			serviceType,
			enabled: true,
			config,
			enabledTypes
		});

		if (!success) {
			return fail(500, { error: 'Failed to create notification service' });
		}

		await logger.info('Notification service created', {
			source: 'settings/notifications/new',
			meta: { serviceId: id, serviceType, name }
		});

		throw redirect(303, '/settings/notifications');
	}
};
