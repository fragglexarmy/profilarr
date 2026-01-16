import { BaseArrClient } from '../base.ts';
import type { SonarrSeries, SonarrRelease } from '../types.ts';

/**
 * Sonarr API client
 * Extends BaseArrClient with Sonarr-specific API methods
 */
export class SonarrClient extends BaseArrClient {
	// =========================================================================
	// Series Methods
	// =========================================================================

	/**
	 * Get all series
	 */
	getAllSeries(): Promise<SonarrSeries[]> {
		return this.get<SonarrSeries[]>(`/api/${this.apiVersion}/series`);
	}

	/**
	 * Get a specific series by ID
	 * Includes season information with statistics
	 */
	getSeries(seriesId: number): Promise<SonarrSeries> {
		return this.get<SonarrSeries>(`/api/${this.apiVersion}/series/${seriesId}`);
	}

	// =========================================================================
	// Search Methods
	// =========================================================================

	/**
	 * Get releases for a series/season (interactive search)
	 * Queries all configured indexers and returns available releases
	 * Note: This can take several seconds as it searches indexers in real-time
	 *
	 * @param seriesId - The series ID
	 * @param seasonNumber - The season number to search
	 * @returns Array of releases from indexers
	 */
	getReleases(seriesId: number, seasonNumber: number): Promise<SonarrRelease[]> {
		return this.get<SonarrRelease[]>(
			`/api/${this.apiVersion}/release?seriesId=${seriesId}&seasonNumber=${seasonNumber}`
		);
	}

	/**
	 * Get only season pack releases (fullSeason: true)
	 * Filters out individual episode releases
	 */
	async getSeasonPackReleases(seriesId: number, seasonNumber: number): Promise<SonarrRelease[]> {
		const releases = await this.getReleases(seriesId, seasonNumber);
		return releases.filter((r) => r.fullSeason);
	}
}
