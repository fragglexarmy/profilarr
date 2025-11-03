import { BaseHttpClient } from '../http/client.ts';
import type { ArrSystemStatus } from './types.ts';
import { logger } from '$logger/logger.ts';

/**
 * Base client for all *arr applications
 * Extends BaseHttpClient with arr-specific features
 */
export class BaseArrClient extends BaseHttpClient {
	private apiKey: string;
	protected apiVersion: string = 'v3'; // Default to v3, can be overridden by subclasses

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
	 * Calls /api/{version}/system/status endpoint
	 * Note: This method has built-in retry logic (3 attempts by default)
	 * @returns true if connection successful, false otherwise
	 */
	async testConnection(): Promise<boolean> {
		try {
			const status = await this.get<ArrSystemStatus>(`/api/${this.apiVersion}/system/status`);

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
			// Only log after all retries are exhausted
			await logger.error(`Connection failed to ${this.baseUrl} after retries`, {
				source: 'BaseArrClient',
				meta: error
			});

			return false;
		}
	}
}
