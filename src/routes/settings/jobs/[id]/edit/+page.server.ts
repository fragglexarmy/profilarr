import type { Actions, RequestEvent } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { jobsQueries } from '$db/queries/jobs.ts';
import { logger } from '$logger/logger.ts';

export const load = ({ params }: { params: Record<string, string | undefined> }) => {
	const jobId = parseInt(params.id || '');

	if (isNaN(jobId)) {
		throw redirect(303, '/settings/jobs');
	}

	const job = jobsQueries.getById(jobId);

	if (!job) {
		throw redirect(303, '/settings/jobs');
	}

	return {
		job: {
			id: job.id,
			name: job.name,
			description: job.description || '',
			schedule: job.schedule
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params }: RequestEvent) => {
		const jobId = parseInt(params.id || '');
		const formData = await request.formData();

		const description = formData.get('description') as string;
		const schedule = formData.get('schedule') as string;

		if (isNaN(jobId)) {
			return fail(400, { error: 'Invalid job ID' });
		}

		const job = jobsQueries.getById(jobId);
		if (!job) {
			return fail(404, { error: 'Job not found' });
		}

		// Validate schedule
		if (!schedule || schedule.trim() === '') {
			return fail(400, { error: 'Schedule is required' });
		}

		const updated = jobsQueries.update(jobId, {
			description: description?.trim() || undefined,
			schedule: schedule.trim()
		});

		if (!updated) {
			await logger.error(`Failed to update job: ${job.name}`, {
				source: 'settings/jobs/edit',
				meta: { jobId, description, schedule }
			});
			return fail(500, { error: 'Failed to update job' });
		}

		await logger.info(`Job updated: ${job.name}`, {
			source: 'settings/jobs/edit',
			meta: { jobId, description, schedule }
		});

		throw redirect(303, '/settings/jobs');
	}
};
