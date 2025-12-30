/**
 * Parser Service Client
 * Calls the C# parser microservice
 */

import { config } from '$config';
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
