import { jobRegistry } from './registry.ts';
import { jobsQueries, jobRunsQueries } from '$db/queries/jobs.ts';
import { logger } from '$logger/logger.ts';
import { notify } from '$notifications/builder.ts';
import { NotificationTypes } from '$notifications/types.ts';
import type { Job, JobResult } from './types.ts';
import { Cron } from 'croner';

/**
 * Parse schedule string and calculate next run time
 * Supports cron expressions and legacy formats
 * @param schedule Schedule string (cron expression or legacy format)
 * @returns ISO timestamp for next run
 */
function calculateNextRun(schedule: string): string {
	const now = new Date();

	// Handle legacy formats for backwards compatibility
	if (schedule === 'daily') {
		const next = new Date(now);
		next.setDate(next.getDate() + 1);
		next.setHours(0, 0, 0, 0);
		return next.toISOString();
	} else if (schedule === 'hourly') {
		const next = new Date(now);
		next.setHours(next.getHours() + 1, 0, 0, 0);
		return next.toISOString();
	}

	// Try to parse as cron expression
	try {
		const cron = new Cron(schedule);
		const nextRun = cron.nextRun();
		if (nextRun) {
			return nextRun.toISOString();
		}
	} catch {
		// Invalid cron expression, fall through to default
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

	await logger.debug(`Starting job: ${job.name}`, {
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

	// Send notification
	const notificationType = result.success
		? NotificationTypes.jobSuccess(job.name)
		: NotificationTypes.jobFailed(job.name);

	await notify(notificationType)
		.title(`${definition.description} - ${result.success ? 'Success' : 'Failed'}`)
		.message(result.success ? (result.output ?? 'Job completed successfully') : (result.error ?? 'Unknown error'))
		.meta({ jobId: job.id, jobName: job.name, durationMs, timestamp: finishedAt })
		.send();

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
