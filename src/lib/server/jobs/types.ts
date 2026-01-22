/**
 * Job system types and interfaces
 */

/**
 * Job execution result
 */
export interface JobResult {
	success: boolean;
	skipped?: boolean; // True if job ran but had nothing to do
	output?: string;
	error?: string;
}

/**
 * Job handler function signature
 */
export type JobHandler = () => Promise<JobResult>;

/**
 * Job definition (code-level)
 */
export interface JobDefinition {
	name: string;
	description: string;
	schedule: string; // e.g., "daily", "hourly", "*/5 minutes"
	handler: JobHandler;
}

/**
 * Job record from database
 */
export interface Job {
	id: number;
	name: string;
	description: string | null;
	schedule: string;
	enabled: number;
	last_run_at: string | null;
	next_run_at: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Job run status
 * - success: Job completed and did work
 * - failure: Job encountered an error
 * - skipped: Job ran but had nothing to do (e.g., no pending syncs)
 */
export type JobRunStatus = 'success' | 'failure' | 'skipped';

/**
 * Job run record from database
 */
export interface JobRun {
	id: number;
	job_id: number;
	status: JobRunStatus;
	started_at: string;
	finished_at: string;
	duration_ms: number;
	error: string | null;
	output: string | null;
}

/**
 * Input for creating a job
 */
export interface CreateJobInput {
	name: string;
	description?: string;
	schedule: string;
	enabled?: boolean;
}

/**
 * Input for updating a job
 */
export interface UpdateJobInput {
	description?: string;
	schedule?: string;
	enabled?: boolean;
	lastRunAt?: string;
	nextRunAt?: string;
}
