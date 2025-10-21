import { BaseHttpNotifier } from '../base/BaseHttpNotifier.ts';
import type { DiscordConfig, Notification } from '../types.ts';

/**
 * Discord embed color constants
 */
const COLORS = {
	SUCCESS: 0x00ff00, // Green
	FAILED: 0xff0000, // Red
	ERROR: 0xff0000, // Red
	INFO: 0x0099ff, // Blue
	WARNING: 0xffaa00 // Orange
} as const;

/**
 * Discord notification service implementation
 */
export class DiscordNotifier extends BaseHttpNotifier {
	constructor(private config: DiscordConfig) {
		super();
	}

	getName(): string {
		return 'Discord';
	}

	protected getWebhookUrl(): string {
		return this.config.webhook_url;
	}

	protected formatPayload(notification: Notification) {
		const color = this.getColorForType(notification.type);

		return {
			username: this.config.username || 'Profilarr',
			avatar_url: this.config.avatar_url,
			content: this.config.enable_mentions ? '@here' : undefined,
			embeds: [
				{
					title: notification.title,
					description: notification.message,
					color,
					timestamp: new Date().toISOString(),
					footer: {
						text: `Type: ${notification.type}`
					}
				}
			]
		};
	}

	/**
	 * Determine embed color based on notification type
	 */
	private getColorForType(type: string): number {
		const lowerType = type.toLowerCase();

		if (lowerType.includes('success')) {
			return COLORS.SUCCESS;
		}
		if (lowerType.includes('failed') || lowerType.includes('error')) {
			return COLORS.ERROR;
		}
		if (lowerType.includes('warning') || lowerType.includes('warn')) {
			return COLORS.WARNING;
		}

		return COLORS.INFO;
	}
}
