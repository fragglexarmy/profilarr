import { logger } from '$logger/logger.ts';
import type { Notification } from '../types.ts';
import type { Notifier } from './Notifier.ts';

/**
 * Base class for HTTP-based notification services (webhooks)
 * Provides rate limiting and common HTTP functionality
 */
export abstract class BaseHttpNotifier implements Notifier {
	private lastSentAt: Date | null = null;
	private readonly minInterval: number = 1000; // 1 second between notifications
	private readonly timeout: number = 10000; // 10 second timeout

	/**
	 * Get the webhook URL for this service
	 */
	protected abstract getWebhookUrl(): string;

	/**
	 * Format the notification into a service-specific payload
	 */
	protected abstract formatPayload(notification: Notification): unknown;

	/**
	 * Get the service name for logging
	 */
	abstract getName(): string;

	/**
	 * Send notification via HTTP POST
	 * Includes rate limiting and error handling
	 */
	async notify(notification: Notification): Promise<void> {
		// Check rate limit
		if (this.lastSentAt) {
			const elapsed = Date.now() - this.lastSentAt.getTime();
			if (elapsed < this.minInterval) {
				await logger.warn('Rate limit hit, skipping notification', {
					source: this.getName(),
					meta: { elapsed, minInterval: this.minInterval, type: notification.type }
				});
				return;
			}
		}

		try {
			const payload = this.formatPayload(notification);
			const url = this.getWebhookUrl();

			// Create abort controller for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(payload),
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorText = await response.text().catch(() => 'Unknown error');
					throw new Error(`HTTP ${response.status}: ${errorText}`);
				}

				await logger.info(`Notification sent successfully`, {
					source: this.getName(),
					meta: { type: notification.type, title: notification.title }
				});

				this.lastSentAt = new Date();
			} catch (error) {
				clearTimeout(timeoutId);

				// Handle timeout
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Request timeout');
				}

				throw error;
			}
		} catch (error) {
			// Log error but don't throw (fire-and-forget)
			await logger.error(`Failed to send notification`, {
				source: this.getName(),
				meta: {
					type: notification.type,
					title: notification.title,
					error: error instanceof Error ? error.message : String(error)
				}
			});
		}
	}
}
