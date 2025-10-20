import type { Actions, RequestEvent } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { jobsQueries, jobRunsQueries } from '$db/queries/jobs.ts';
import { jobScheduler } from '../../../jobs/scheduler.ts';
import { logger } from '$logger';

// Helper to format schedule for display
function formatSchedule(schedule: string): string {
	const scheduleMap: Record<string, string> = {
		daily: 'Daily',
		hourly: 'Hourly',
		weekly: 'Weekly',
		monthly: 'Monthly'
	};

	// Check for cron-like patterns
	if (schedule.startsWith('*/')) {
		const match = schedule.match(/\*\/(\d+)\s*(\w+)/);
		if (match) {
			const [, interval, unit] = match;
			return `Every ${interval} ${unit}`;
		}
	}

	return scheduleMap[schedule.toLowerCase()] || schedule;
}

export const load = () => {
	const jobs = jobsQueries.getAll();

	// Get the last run for each job
	const jobsWithRuns = jobs.map((job) => {
		const lastRun = jobRunsQueries.getByJobId(job.id, 1)[0] || null;

		return {
			id: job.id,
			name: job.name,
			description: job.description || 'No description provided',
			schedule: job.schedule,
			scheduleDisplay: formatSchedule(job.schedule),
			enabled: job.enabled === 1,
			last_run_at: job.last_run_at,
			next_run_at: job.next_run_at,
			last_run_status: lastRun?.status || null,
			last_run_duration: lastRun?.duration_ms || null,
			last_run_error: lastRun?.error || null
		};
	});

	// Get recent job runs across all jobs
	const recentRuns = jobRunsQueries.getRecent(50);

	// Join with job names
	const jobRunsWithNames = recentRuns.map((run) => {
		const job = jobs.find((j) => j.id === run.job_id);
		return {
			...run,
			job_name: job?.name || 'Unknown Job'
		};
	});

	return {
		jobs: jobsWithRuns,
		jobRuns: jobRunsWithNames
	};
};

export const actions: Actions = {
	toggleEnabled: async ({ request }: RequestEvent) => {
		const formData = await request.formData();
		const jobId = parseInt(formData.get('job_id') as string);
		const enabled = formData.get('enabled') === 'true';

		if (isNaN(jobId)) {
			return fail(400, { error: 'Invalid job ID' });
		}

		const job = jobsQueries.getById(jobId);
		if (!job) {
			return fail(404, { error: 'Job not found' });
		}

		const updated = jobsQueries.update(jobId, { enabled });

		if (!updated) {
			await logger.error(`Failed to toggle job: ${job.name}`, {
				source: 'settings/jobs',
				meta: { jobId, enabled }
			});
			return fail(500, { error: 'Failed to update job' });
		}

		await logger.info(`Job ${enabled ? 'enabled' : 'disabled'}: ${job.name}`, {
			source: 'settings/jobs',
			meta: { jobId, enabled }
		});

		return { success: true };
	},

	trigger: async ({ request }: RequestEvent) => {
		const formData = await request.formData();
		const jobName = formData.get('job_name') as string;

		if (!jobName) {
			return fail(400, { error: 'Job name is required' });
		}

		try {
			const success = await jobScheduler.triggerJob(jobName);

			if (!success) {
				return fail(400, { error: 'Job not found or disabled' });
			}

			return { success: true };
		} catch (error) {
			await logger.error(`Failed to trigger job: ${jobName}`, {
				source: 'settings/jobs',
				meta: { jobName, error }
			});
			return fail(500, { error: 'Failed to trigger job' });
		}
	}
};
