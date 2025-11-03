import { jobsQueries } from '$db/queries/jobs.ts';
import { runJob } from './runner.ts';
import { logger } from '$logger/logger.ts';

/**
 * Job scheduler - checks for due jobs and executes them
 */
class JobScheduler {
	private intervalId: number | null = null;
	private isRunning = false;
	private checkIntervalMs = 60 * 1000; // Check every minute

	/**
	 * Start the job scheduler
	 */
	async start(): Promise<void> {
		if (this.intervalId !== null) {
			// Already running, just return silently (dev server HMR)
			return;
		}

		await logger.info('Starting job scheduler', { source: 'JobScheduler' });

		// Check immediately on start
		await this.checkAndRunJobs();

		// Then check periodically
		this.intervalId = setInterval(async () => {
			await this.checkAndRunJobs();
		}, this.checkIntervalMs);
	}

	/**
	 * Stop the job scheduler
	 */
	async stop(): Promise<void> {
		if (this.intervalId === null) {
			return;
		}

		await logger.info('Stopping job scheduler', { source: 'JobScheduler' });

		clearInterval(this.intervalId);
		this.intervalId = null;
	}

	/**
	 * Check for due jobs and run them
	 */
	private async checkAndRunJobs(): Promise<void> {
		// Prevent concurrent runs
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		try {
			// Get jobs that are due to run
			const dueJobs = jobsQueries.getDueJobs();

			if (dueJobs.length === 0) {
				return;
			}

			await logger.info(`Found ${dueJobs.length} job(s) to run`, {
				source: 'JobScheduler',
				meta: { jobNames: dueJobs.map((j) => j.name) }
			});

			// Run jobs sequentially (could be parallel in the future)
			for (const job of dueJobs) {
				try {
					await runJob(job);
				} catch (error) {
					await logger.error(`Failed to run job: ${job.name}`, {
						source: 'JobScheduler',
						meta: { jobId: job.id, error }
					});
				}
			}
		} catch (error) {
			await logger.error('Error in job scheduler', {
				source: 'JobScheduler',
				meta: error
			});
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Manually trigger a job by name (for testing or manual runs)
	 */
	async triggerJob(jobName: string): Promise<boolean> {
		const job = jobsQueries.getByName(jobName);

		if (!job) {
			await logger.warn(`Job not found: ${jobName}`, { source: 'JobScheduler' });
			return false;
		}

		if (!job.enabled) {
			await logger.warn(`Job is disabled: ${jobName}`, { source: 'JobScheduler' });
			return false;
		}

		await logger.info(`Manually triggering job: ${jobName}`, { source: 'JobScheduler' });

		try {
			return await runJob(job);
		} catch (error) {
			await logger.error(`Failed to trigger job: ${jobName}`, {
				source: 'JobScheduler',
				meta: error
			});
			return false;
		}
	}
}

// Export singleton instance
export const jobScheduler = new JobScheduler();
