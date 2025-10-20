/**
 * Job system types and interfaces
 */

/**
 * Job execution result
 */
export interface JobResult {
	success: boolean;
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
 * Job run record from database
 */
export interface JobRun {
	id: number;
	job_id: number;
	status: 'success' | 'failure';
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
