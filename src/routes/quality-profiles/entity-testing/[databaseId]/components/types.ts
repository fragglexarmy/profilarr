export interface TestRelease {
	id: number;
	title: string;
	size_bytes: number | null;
	languages: string[];
	indexers: string[];
	flags: string[];
}

export interface TestEntity {
	id: number;
	type: 'movie' | 'series';
	tmdb_id: number;
	title: string;
	year: number | null;
	poster_path: string | null;
	releases: TestRelease[];
}

/** Parsed info from parser service */
export interface ParsedInfo {
	source: string;
	resolution: string;
	modifier: string;
	languages: string[];
	releaseGroup: string | null;
	year: number;
	edition: string | null;
	releaseType: string | null;
}

/** Evaluation result for a single release */
export interface ReleaseEvaluation {
	releaseId: number;
	title: string;
	parsed: ParsedInfo | null;
	/** Map of custom format ID to whether it matches */
	cfMatches: Record<number, boolean>;
}

/** CF score for a specific arr type */
export interface CfScore {
	radarr: number | null;
	sonarr: number | null;
}

/** Profile CF scores data */
export interface ProfileCfScores {
	profileId: number;
	scores: Record<number, CfScore>;
}

/** Custom format info */
export interface CustomFormatInfo {
	id: number;
	name: string;
}
