/**
 * Core notification types and interfaces
 */

/**
 * Notification payload sent to services
 */
export interface Notification {
	type: string; // e.g., 'job.backup.success', 'job.cleanup.failed'
	title: string;
	message: string;
	metadata?: Record<string, unknown>;
}

/**
 * Result of a notification attempt
 */
export interface NotificationResult {
	success: boolean;
	error?: string;
}

/**
 * Configuration for Discord notifications
 */
export interface DiscordConfig {
	webhook_url: string;
	username?: string;
	avatar_url?: string;
	enable_mentions?: boolean;
}
/**
 * Union type for all notification service configs
 */
export type NotificationServiceConfig = DiscordConfig;

/**
 * Service types supported
 */
export type NotificationServiceType = 'discord';