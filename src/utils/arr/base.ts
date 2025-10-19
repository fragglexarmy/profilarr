import { BaseHttpClient } from '../http/client.ts';
import type { ArrSystemStatus } from './types.ts';
import { logger } from '$logger';

/**
 * Base client for all *arr applications
 * Extends BaseHttpClient with arr-specific features
 */
export class BaseArrClient extends BaseHttpClient {
	private apiKey: string;

	constructor(url: string, apiKey: string) {
		super(url, {
			headers: {
				'X-Api-Key': apiKey
			}
		});
		this.apiKey = apiKey;
	}

	/**
	 * Test connection to the arr instance
	 * Calls /api/v3/system/status endpoint
	 * @returns true if connection successful, false otherwise
	 */
	async testConnection(): Promise<boolean> {
		try {
			const status = await this.get<ArrSystemStatus>('/api/v3/system/status');

			await logger.info(`Connection successful to ${this.baseUrl}`, {
				source: 'BaseArrClient',
				meta: {
					appName: status.appName,
					version: status.version,
					osName: status.osName
				}
			});

			return true;
		} catch (error) {
			await logger.error(`Connection failed to ${this.baseUrl}`, {
				source: 'BaseArrClient',
				meta: error
			});

			return false;
		}
	}
}
