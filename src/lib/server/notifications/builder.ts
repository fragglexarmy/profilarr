/**
 * Fluent notification builder
 * Provides a chainable API for constructing and sending notifications
 */

import { notificationManager } from './NotificationManager.ts';
import type { Notification } from './types.ts';

/**
 * Builder class for constructing notifications
 */
class NotificationBuilder {
	private data: Notification;

	constructor(type: string) {
		this.data = {
			type,
			title: '',
			message: ''
		};
	}

	/**
	 * Set the notification title
	 */
	title(t: string): this {
		this.data.title = t;
		return this;
	}

	/**
	 * Set the notification message
	 */
	message(m: string): this {
		this.data.message = m;
		return this;
	}

	/**
	 * Build message from multiple lines
	 * Automatically filters out null/undefined/empty values
	 */
	lines(messageLines: (string | null | undefined | false)[]): this {
		this.data.message = messageLines.filter(Boolean).join('\n').trim();
		return this;
	}

	/**
	 * Set metadata
	 */
	meta(metadata: Record<string, unknown>): this {
		this.data.metadata = metadata;
		return this;
	}

	/**
	 * Send the notification
	 */
	async send(): Promise<void> {
		await notificationManager.notify(this.data);
	}
}

/**
 * Create a new notification builder
 *
 * @example
 * // Simple notification
 * await notify('pcd.linked')
 *   .title('Database Linked')
 *   .message('Database "MyDB" has been linked successfully')
 *   .meta({ databaseId: 1 })
 *   .send();
 *
 * @example
 * // Multi-line notification
 * await notify('upgrade.success')
 *   .title('Upgrade Completed')
 *   .lines([
 *     'Filter: 50 matched → 30 after cooldown',
 *     'Selection: 10/10 items',
 *     hasItems ? `Items: ${items.join(', ')}` : null
 *   ])
 *   .meta({ instanceId: 1 })
 *   .send();
 */
export function notify(type: string): NotificationBuilder {
	return new NotificationBuilder(type);
}
