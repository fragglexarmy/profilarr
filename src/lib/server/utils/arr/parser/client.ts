/**
 * Parser Service Client
 * Calls the C# parser microservice with optional caching
 */

import { config } from '$config';
import { logger } from '$logger/logger.ts';
import { parsedReleaseCacheQueries } from '$db/queries/parsedReleaseCache.ts';
import {
	QualitySource,
	QualityModifier,
	Language,
	ReleaseType,
	type QualityInfo,
	type ParseResult,
	type EpisodeInfo,
	type Resolution,
	type MediaType
} from './types.ts';

// Cached parser version (fetched once per session)
let cachedParserVersion: string | null = null;

interface EpisodeResponse {
	seriesTitle: string | null;
	seasonNumber: number;
	episodeNumbers: number[];
	absoluteEpisodeNumbers: number[];
	airDate: string | null;
	fullSeason: boolean;
	isPartialSeason: boolean;
	isMultiSeason: boolean;
	isMiniSeries: boolean;
	special: boolean;
	releaseType: string;
}

interface ParseResponse {
	title: string;
	type: MediaType;
	source: string;
	resolution: number;
	modifier: string;
	revision: {
		version: number;
		real: number;
		isRepack: boolean;
	};
	languages: string[];
	releaseGroup: string | null;
	movieTitles: string[];
	year: number;
	edition: string | null;
	imdbId: string | null;
	tmdbId: number;
	hardcodedSubs: string | null;
	releaseHash: string | null;
	episode: EpisodeResponse | null;
}

/**
 * Parse a release title - returns quality, resolution, modifier, revision, and languages
 * @param title - The release title to parse
 * @param type - The media type: 'movie' or 'series'
 */
export async function parse(title: string, type: MediaType): Promise<ParseResult> {
	const res = await fetch(`${config.parserUrl}/parse`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title, type })
	});

	if (!res.ok) {
		throw new Error(`Parser error: ${res.status}`);
	}

	const data: ParseResponse = await res.json();

	return {
		title: data.title,
		type: data.type,
		source: QualitySource[data.source as keyof typeof QualitySource] ?? QualitySource.Unknown,
		resolution: data.resolution as Resolution,
		modifier:
			QualityModifier[data.modifier as keyof typeof QualityModifier] ?? QualityModifier.None,
		revision: data.revision,
		languages: data.languages.map(
			(l) => Language[l as keyof typeof Language] ?? Language.Unknown
		),
		releaseGroup: data.releaseGroup,
		movieTitles: data.movieTitles,
		year: data.year,
		edition: data.edition,
		imdbId: data.imdbId,
		tmdbId: data.tmdbId,
		hardcodedSubs: data.hardcodedSubs,
		releaseHash: data.releaseHash,
		episode: data.episode
			? {
					seriesTitle: data.episode.seriesTitle,
					seasonNumber: data.episode.seasonNumber,
					episodeNumbers: data.episode.episodeNumbers,
					absoluteEpisodeNumbers: data.episode.absoluteEpisodeNumbers,
					airDate: data.episode.airDate,
					fullSeason: data.episode.fullSeason,
					isPartialSeason: data.episode.isPartialSeason,
					isMultiSeason: data.episode.isMultiSeason,
					isMiniSeries: data.episode.isMiniSeries,
					special: data.episode.special,
					releaseType:
						ReleaseType[data.episode.releaseType as keyof typeof ReleaseType] ??
						ReleaseType.Unknown
				}
			: null
	};
}

/**
 * Parse quality info from a release title (legacy - use parse() for full results)
 */
export async function parseQuality(title: string, type: MediaType): Promise<QualityInfo> {
	const result = await parse(title, type);
	return {
		source: result.source,
		resolution: result.resolution,
		modifier: result.modifier,
		revision: result.revision
	};
}

/**
 * Check parser service health
 */
export async function isParserHealthy(): Promise<boolean> {
	try {
		const res = await fetch(`${config.parserUrl}/health`);
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Get the parser version from the health endpoint
 * Caches the version for the session to avoid repeated calls
 */
export async function getParserVersion(): Promise<string | null> {
	if (cachedParserVersion) {
		return cachedParserVersion;
	}

	try {
		const res = await fetch(`${config.parserUrl}/health`);
		if (!res.ok) {
			await logger.warn('Parser health check failed', {
				source: 'ParserClient',
				meta: { status: res.status }
			});
			return null;
		}

		const data: { status: string; version: string } = await res.json();
		cachedParserVersion = data.version;
		await logger.debug(`Parser version: ${data.version}`, { source: 'ParserClient' });
		return cachedParserVersion;
	} catch (err) {
		await logger.warn('Failed to connect to parser service', {
			source: 'ParserClient',
			meta: { error: err instanceof Error ? err.message : 'Unknown error' }
		});
		return null;
	}
}

/**
 * Clear the cached parser version
 * Call this if you need to re-fetch the version (e.g., after parser restart)
 */
export function clearParserVersionCache(): void {
	cachedParserVersion = null;
}

/**
 * Generate cache key for a release title
 */
function getCacheKey(title: string, type: MediaType): string {
	return `${title}:${type}`;
}

/**
 * Parse a release title with caching
 * First checks the cache, falls back to parser service on miss
 * Automatically handles version invalidation
 *
 * @param title - The release title to parse
 * @param type - The media type: 'movie' or 'series'
 * @returns ParseResult or null if parser unavailable
 */
export async function parseWithCache(
	title: string,
	type: MediaType
): Promise<ParseResult | null> {
	const parserVersion = await getParserVersion();
	if (!parserVersion) {
		// Parser not available
		return null;
	}

	const cacheKey = getCacheKey(title, type);

	// Check cache first
	const cached = parsedReleaseCacheQueries.get(cacheKey, parserVersion);
	if (cached) {
		return JSON.parse(cached.parsed_result) as ParseResult;
	}

	// Cache miss - parse and store
	try {
		const result = await parse(title, type);

		// Store in cache
		parsedReleaseCacheQueries.set(cacheKey, parserVersion, JSON.stringify(result));

		return result;
	} catch {
		// Parser error
		return null;
	}
}

/**
 * Parse multiple release titles with caching (batch operation)
 * More efficient than calling parseWithCache in a loop
 *
 * @param items - Array of { title, type } to parse
 * @returns Map of cache key to ParseResult (null for failures)
 */
export async function parseWithCacheBatch(
	items: Array<{ title: string; type: MediaType }>
): Promise<Map<string, ParseResult | null>> {
	const results = new Map<string, ParseResult | null>();

	const parserVersion = await getParserVersion();
	if (!parserVersion) {
		// Parser not available - return all nulls
		await logger.debug(`Parser unavailable, skipping ${items.length} items`, {
			source: 'ParserCache'
		});
		for (const item of items) {
			results.set(getCacheKey(item.title, item.type), null);
		}
		return results;
	}

	// Separate cached vs uncached
	const uncached: Array<{ title: string; type: MediaType; cacheKey: string }> = [];

	for (const item of items) {
		const cacheKey = getCacheKey(item.title, item.type);
		const cached = parsedReleaseCacheQueries.get(cacheKey, parserVersion);

		if (cached) {
			results.set(cacheKey, JSON.parse(cached.parsed_result) as ParseResult);
		} else {
			uncached.push({ ...item, cacheKey });
		}
	}

	const cacheHits = items.length - uncached.length;

	// Parse uncached items in parallel
	if (uncached.length > 0) {
		const parsePromises = uncached.map(async (item) => {
			try {
				const result = await parse(item.title, item.type);
				// Store in cache
				parsedReleaseCacheQueries.set(item.cacheKey, parserVersion, JSON.stringify(result));
				return { cacheKey: item.cacheKey, result };
			} catch {
				return { cacheKey: item.cacheKey, result: null };
			}
		});

		const parsed = await Promise.all(parsePromises);
		for (const { cacheKey, result } of parsed) {
			results.set(cacheKey, result);
		}
	}

	await logger.debug(`Parsed ${items.length} releases: ${cacheHits} cache hits, ${uncached.length} parsed`, {
		source: 'ParserCache',
		meta: { total: items.length, cacheHits, parsed: uncached.length, version: parserVersion }
	});

	return results;
}

/**
 * Clean up old cache entries from previous parser versions
 * Call this on startup or periodically
 */
export async function cleanupOldCacheEntries(): Promise<number> {
	const parserVersion = await getParserVersion();
	if (!parserVersion) {
		return 0;
	}

	const deleted = parsedReleaseCacheQueries.deleteOldVersions(parserVersion);
	if (deleted > 0) {
		await logger.info(`Cleaned up ${deleted} stale parser cache entries`, {
			source: 'ParserCache',
			meta: { deleted, currentVersion: parserVersion }
		});
	}
	return deleted;
}

/**
 * Match multiple regex patterns against a text string using .NET regex
 * This ensures patterns work exactly as they do in Sonarr/Radarr
 *
 * @param text - The text to match against (e.g., release title)
 * @param patterns - Array of regex patterns to test
 * @returns Map of pattern -> matched (true/false), or null if parser unavailable
 */
export async function matchPatterns(
	text: string,
	patterns: string[]
): Promise<Map<string, boolean> | null> {
	if (patterns.length === 0) {
		return new Map();
	}

	try {
		const res = await fetch(`${config.parserUrl}/match`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text, patterns })
		});

		if (!res.ok) {
			await logger.warn('Pattern match request failed', {
				source: 'ParserClient',
				meta: { status: res.status }
			});
			return null;
		}

		const data: { results: Record<string, boolean> } = await res.json();
		return new Map(Object.entries(data.results));
	} catch (err) {
		await logger.warn('Failed to connect to parser for pattern matching', {
			source: 'ParserClient',
			meta: { error: err instanceof Error ? err.message : 'Unknown error' }
		});
		return null;
	}
}
