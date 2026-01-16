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

// Note: ParsedInfo, ReleaseEvaluation, and EvaluateResponse types are now
// generated from OpenAPI spec - see $api/v1.d.ts

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
