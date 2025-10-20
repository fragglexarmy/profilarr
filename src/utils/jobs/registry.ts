import type { JobDefinition } from './types.ts';

/**
 * Job registry - central place to register all available jobs
 */
class JobRegistry {
	private jobs: Map<string, JobDefinition> = new Map();

	/**
	 * Register a job definition
	 * If job already exists, it will be replaced (for dev server HMR)
	 */
	register(job: JobDefinition): void {
		this.jobs.set(job.name, job);
	}

	/**
	 * Get a job definition by name
	 */
	get(name: string): JobDefinition | undefined {
		return this.jobs.get(name);
	}

	/**
	 * Get all registered job definitions
	 */
	getAll(): JobDefinition[] {
		return Array.from(this.jobs.values());
	}

	/**
	 * Check if a job is registered
	 */
	has(name: string): boolean {
		return this.jobs.has(name);
	}
}

// Export singleton instance
export const jobRegistry = new JobRegistry();
