/**
 * Logger types and interfaces
 */

export interface LogOptions {
	/** Optional metadata to include with the log */
	meta?: unknown;
	/** Optional source/context tag (e.g., "database", "api") */
	source?: string;
}

export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	source?: string;
	meta?: unknown;
}
