import { jobRegistry } from './registry.ts';
import { jobsQueries, jobRunsQueries } from '$db/queries/jobs.ts';
import { logger } from '$logger';
import { notificationManager } from '../notifications/NotificationManager.ts';
import type { Job, JobResult } from './types.ts';

/**
 * Parse schedule string and calculate next run time
 * @param schedule Schedule string (e.g., "daily", "hourly", "every 5 minutes")
 * @returns ISO timestamp for next run
 */
function calculateNextRun(schedule: string): string {
	const now = new Date();

	// Parse schedule
	if (schedule === 'daily') {
		// Run at midnight next day
		const next = new Date(now);
		next.setDate(next.getDate() + 1);
		next.setHours(0, 0, 0, 0);
		return next.toISOString();
	} else if (schedule === 'hourly') {
		// Run at start of next hour
		const next = new Date(now);
		next.setHours(next.getHours() + 1, 0, 0, 0);
		return next.toISOString();
	} else if (schedule.startsWith('*/')) {
		// Parse "*/N minutes" format
		const match = schedule.match(/^\*\/(\d+)\s+minutes?$/);
		if (match) {
			const minutes = parseInt(match[1], 10);
			const next = new Date(now);
			next.setMinutes(next.getMinutes() + minutes, 0, 0);
			return next.toISOString();
		}
	}

	// Default: run in 1 hour if we can't parse
	const next = new Date(now);
	next.setHours(next.getHours() + 1);
	return next.toISOString();
}

/**
 * Execute a single job
 * @param job Job record from database
 * @returns true if job executed successfully
 */
export async function runJob(job: Job): Promise<boolean> {
	// Get job definition from registry
	const definition = jobRegistry.get(job.name);
	if (!definition) {
		await logger.error(`Job "${job.name}" not found in registry`, {
			source: 'JobRunner',
			meta: { jobId: job.id }
		});
		return false;
	}

	await logger.info(`Starting job: ${job.name}`, {
		source: 'JobRunner',
		meta: { jobId: job.id }
	});

	const startedAt = new Date().toISOString();
	const startTime = Date.now();

	let result: JobResult;
	try {
		// Execute job handler
		result = await definition.handler();
	} catch (error) {
		// Catch any unhandled errors
		result = {
			success: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}

	const finishedAt = new Date().toISOString();
	const durationMs = Date.now() - startTime;

	// Log result
	if (result.success) {
		await logger.info(`Job completed successfully: ${job.name}`, {
			source: 'JobRunner',
			meta: { jobId: job.id, durationMs, output: result.output }
		});
	} else {
		await logger.error(`Job failed: ${job.name}`, {
			source: 'JobRunner',
			meta: { jobId: job.id, durationMs, error: result.error }
		});
	}

	// Send notifications
	const notificationType = result.success ? `job.${job.name}.success` : `job.${job.name}.failed`;
	const notificationTitle = result.success
		? `${definition.description} - Success`
		: `${definition.description} - Failed`;
	const notificationMessage = result.success
		? result.output ?? 'Job completed successfully'
		: result.error ?? 'Unknown error';

	await notificationManager.notify({
		type: notificationType,
		title: notificationTitle,
		message: notificationMessage,
		metadata: {
			jobId: job.id,
			jobName: job.name,
			durationMs,
			timestamp: finishedAt
		}
	});

	// Save job run to database
	jobRunsQueries.create(
		job.id,
		result.success ? 'success' : 'failure',
		startedAt,
		finishedAt,
		durationMs,
		result.error,
		result.output
	);

	// Update job's last_run_at and next_run_at
	const nextRunAt = calculateNextRun(job.schedule);
	jobsQueries.update(job.id, {
		lastRunAt: finishedAt,
		nextRunAt
	});

	return result.success;
}
