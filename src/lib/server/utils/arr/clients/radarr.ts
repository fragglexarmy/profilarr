import { BaseArrClient } from '../base.ts';
import type {
	RadarrMovie,
	RadarrMovieFile,
	RadarrQualityProfile,
	RadarrLibraryItem,
	ScoreBreakdownItem,
	CustomFormatRef,
	QualityProfileFormatItem,
	RadarrTag,
	RadarrCommand
} from '../types.ts';

/**
 * Radarr API client
 * Extends BaseArrClient with Radarr-specific API methods
 */
export class RadarrClient extends BaseArrClient {
	/**
	 * Get all movies
	 */
	getMovies(): Promise<RadarrMovie[]> {
		return this.get<RadarrMovie[]>(`/api/${this.apiVersion}/movie`);
	}

	/**
	 * Get all quality profiles
	 */
	getQualityProfiles(): Promise<RadarrQualityProfile[]> {
		return this.get<RadarrQualityProfile[]>(`/api/${this.apiVersion}/qualityprofile`);
	}

	/**
	 * Get movie files by movie IDs
	 * Uses movieId params for batching (NOT movieFileIds which can error on stale IDs)
	 */
	getMovieFiles(movieIds: number[]): Promise<RadarrMovieFile[]> {
		if (movieIds.length === 0) {
			return Promise.resolve([]);
		}

		// Build query string with repeated movieId params
		const queryString = movieIds.map((id) => `movieId=${id}`).join('&');
		return this.get<RadarrMovieFile[]>(`/api/${this.apiVersion}/moviefile?${queryString}`);
	}

	/**
	 * Compute score breakdown for a movie's custom formats against a profile's format items
	 */
	private computeScoreBreakdown(
		movieCustomFormats: CustomFormatRef[],
		profileFormatItems: QualityProfileFormatItem[]
	): ScoreBreakdownItem[] {
		return movieCustomFormats.map((cf) => {
			const profileItem = profileFormatItems.find((fi) => fi.format === cf.id);
			return {
				name: cf.name,
				score: profileItem?.score ?? 0
			};
		});
	}

	/**
	 * Fetch and compute library data with all joined information
	 * Makes 3 API calls: movies, quality profiles, and movie files (batched)
	 * @param profilarrProfileNames - Set of profile names from Profilarr databases
	 */
	async getLibrary(profilarrProfileNames?: Set<string>): Promise<RadarrLibraryItem[]> {
		// Fetch movies and profiles in parallel
		const [movies, profiles] = await Promise.all([this.getMovies(), this.getQualityProfiles()]);

		// Create profile lookup map
		const profileMap = new Map(profiles.map((p) => [p.id, p]));

		// Get movie IDs that have files
		const movieIdsWithFiles = movies.filter((m) => m.hasFile).map((m) => m.id);

		// Fetch movie files in batch
		const movieFiles = await this.getMovieFiles(movieIdsWithFiles);

		// Create movie file lookup by movieId
		const movieFileMap = new Map(movieFiles.map((mf) => [mf.movieId, mf]));

		// Build library items
		const libraryItems: RadarrLibraryItem[] = movies.map((movie) => {
			const profile = profileMap.get(movie.qualityProfileId);
			const movieFile = movieFileMap.get(movie.id);

			const customFormats = movieFile?.customFormats ?? [];
			const customFormatScore = movieFile?.customFormatScore ?? 0;
			const cutoffScore = profile?.cutoffFormatScore ?? 0;
			const minScore = profile?.minFormatScore ?? 0;

			// Compute score breakdown
			const scoreBreakdown = profile
				? this.computeScoreBreakdown(customFormats, profile.formatItems)
				: [];

			// Calculate progress (0 to 1+, where 1 = cutoff met)
			const progress = cutoffScore > 0 ? customFormatScore / cutoffScore : 0;

			const profileName = profile?.name ?? 'Unknown';

			return {
				id: movie.id,
				tmdbId: movie.tmdbId,
				title: movie.title,
				year: movie.year,
				qualityProfileId: movie.qualityProfileId,
				qualityProfileName: profileName,
				hasFile: movie.hasFile,
				dateAdded: movie.added,
				popularity: movie.popularity,
				customFormats,
				customFormatScore,
				qualityName: movieFile?.quality?.quality?.name,
				fileName: movieFile?.relativePath?.split('/').pop(),
				scoreBreakdown,
				cutoffScore,
				minScore,
				progress,
				cutoffMet: customFormatScore >= cutoffScore,
				isProfilarrProfile: profilarrProfileNames?.has(profileName) ?? false
			};
		});

		return libraryItems;
	}

	// =========================================================================
	// Search Methods
	// =========================================================================

	/**
	 * Trigger a search for specific movies
	 * Uses the MoviesSearch command endpoint
	 */
	searchMovies(movieIds: number[]): Promise<RadarrCommand> {
		return this.post<RadarrCommand>(`/api/${this.apiVersion}/command`, {
			name: 'MoviesSearch',
			movieIds
		});
	}

	// =========================================================================
	// Tag Methods
	// =========================================================================

	/**
	 * Get all tags
	 */
	override getTags(): Promise<RadarrTag[]> {
		return this.get<RadarrTag[]>(`/api/${this.apiVersion}/tag`);
	}

	/**
	 * Create a new tag
	 */
	override createTag(label: string): Promise<RadarrTag> {
		return this.post<RadarrTag>(`/api/${this.apiVersion}/tag`, { label });
	}

	/**
	 * Get a tag by label, or create it if it doesn't exist
	 */
	async getOrCreateTag(label: string): Promise<RadarrTag> {
		const tags = await this.getTags();
		const existing = tags.find((t) => t.label.toLowerCase() === label.toLowerCase());

		if (existing) {
			return existing;
		}

		return this.createTag(label);
	}

	// =========================================================================
	// Movie Update Methods
	// =========================================================================

	/**
	 * Update a movie (used for adding/removing tags)
	 */
	updateMovie(movie: RadarrMovie): Promise<RadarrMovie> {
		return this.put<RadarrMovie>(`/api/${this.apiVersion}/movie/${movie.id}`, movie);
	}
}
