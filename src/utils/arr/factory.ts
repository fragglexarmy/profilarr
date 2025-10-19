import type { ArrType } from './types.ts';
import { BaseArrClient } from './base.ts';
import { RadarrClient } from './clients/radarr.ts';
import { SonarrClient } from './clients/sonarr.ts';
import { LidarrClient } from './clients/lidarr.ts';
import { ChaptarrClient } from './clients/chaptarr.ts';

/**
 * Factory function to create an arr client instance
 * @param type - The arr application type (radarr, sonarr, lidarr, chaptarr)
 * @param url - Base URL of the arr instance
 * @param apiKey - API key for authentication
 * @returns Arr client instance
 */
export function createArrClient(
	type: ArrType,
	url: string,
	apiKey: string
): BaseArrClient {
	switch (type) {
		case 'radarr':
			return new RadarrClient(url, apiKey);
		case 'sonarr':
			return new SonarrClient(url, apiKey);
		case 'lidarr':
			return new LidarrClient(url, apiKey);
		case 'chaptarr':
			return new ChaptarrClient(url, apiKey);
		default:
			throw new Error(`Unknown arr type: ${type}`);
	}
}
