import { db } from '../db.ts';
import type { Job, CreateJobInput, UpdateJobInput, JobRun } from '../../jobs/types.ts';

/**
 * All queries for jobs table
 */
export const jobsQueries = {
	/**
	 * Create a new job
	 */
	create(input: CreateJobInput): number {
		const enabled = input.enabled !== false ? 1 : 0;

		db.execute(
			`INSERT INTO jobs (name, description, schedule, enabled)
       VALUES (?, ?, ?, ?)`,
			input.name,
			input.description ?? null,
			input.schedule,
			enabled
		);

		const result = db.queryFirst<{ id: number }>('SELECT last_insert_rowid() as id');
		return result?.id ?? 0;
	},

	/**
	 * Get a job by ID
	 */
	getById(id: number): Job | undefined {
		return db.queryFirst<Job>('SELECT * FROM jobs WHERE id = ?', id);
	},

	/**
	 * Get a job by name
	 */
	getByName(name: string): Job | undefined {
		return db.queryFirst<Job>('SELECT * FROM jobs WHERE name = ?', name);
	},

	/**
	 * Get all jobs
	 */
	getAll(): Job[] {
		return db.query<Job>('SELECT * FROM jobs ORDER BY name');
	},

	/**
	 * Get enabled jobs
	 */
	getEnabled(): Job[] {
		return db.query<Job>('SELECT * FROM jobs WHERE enabled = 1 ORDER BY name');
	},

	/**
	 * Get jobs that need to run (next_run_at <= now)
	 */
	getDueJobs(): Job[] {
		return db.query<Job>(
			`SELECT * FROM jobs
       WHERE enabled = 1
       AND (next_run_at IS NULL OR next_run_at <= datetime('now'))
       ORDER BY next_run_at`
		);
	},

	/**
	 * Update a job
	 */
	update(id: number, input: UpdateJobInput): boolean {
		const updates: string[] = [];
		const params: (string | number | null)[] = [];

		if (input.description !== undefined) {
			updates.push('description = ?');
			params.push(input.description);
		}
		if (input.schedule !== undefined) {
			updates.push('schedule = ?');
			params.push(input.schedule);
		}
		if (input.enabled !== undefined) {
			updates.push('enabled = ?');
			params.push(input.enabled ? 1 : 0);
		}
		if (input.lastRunAt !== undefined) {
			updates.push('last_run_at = ?');
			params.push(input.lastRunAt);
		}
		if (input.nextRunAt !== undefined) {
			updates.push('next_run_at = ?');
			params.push(input.nextRunAt);
		}

		if (updates.length === 0) {
			return false;
		}

		updates.push('updated_at = CURRENT_TIMESTAMP');
		params.push(id);

		const affected = db.execute(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`, ...params);

		return affected > 0;
	},

	/**
	 * Delete a job
	 */
	delete(id: number): boolean {
		const affected = db.execute('DELETE FROM jobs WHERE id = ?', id);
		return affected > 0;
	}
};

/**
 * All queries for job_runs table
 */
export const jobRunsQueries = {
	/**
	 * Create a new job run record
	 */
	create(
		jobId: number,
		status: 'success' | 'failure',
		startedAt: string,
		finishedAt: string,
		durationMs: number,
		error?: string,
		output?: string
	): number {
		db.execute(
			`INSERT INTO job_runs (job_id, status, started_at, finished_at, duration_ms, error, output)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			jobId,
			status,
			startedAt,
			finishedAt,
			durationMs,
			error ?? null,
			output ?? null
		);

		const result = db.queryFirst<{ id: number }>('SELECT last_insert_rowid() as id');
		return result?.id ?? 0;
	},

	/**
	 * Get job runs for a specific job
	 */
	getByJobId(jobId: number, limit: number = 50): JobRun[] {
		return db.query<JobRun>(
			`SELECT * FROM job_runs
       WHERE job_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
			jobId,
			limit
		);
	},

	/**
	 * Get recent job runs (all jobs)
	 */
	getRecent(limit: number = 100): JobRun[] {
		return db.query<JobRun>(
			`SELECT * FROM job_runs
       ORDER BY started_at DESC
       LIMIT ?`,
			limit
		);
	},

	/**
	 * Delete old job runs (cleanup)
	 */
	deleteOlderThan(days: number): number {
		const affected = db.execute(
			`DELETE FROM job_runs
       WHERE started_at < datetime('now', '-' || ? || ' days')`,
			days
		);
		return affected;
	}
};
