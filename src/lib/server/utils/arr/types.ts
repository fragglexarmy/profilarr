/**
 * Arr Client Types
 */

export type ArrType = 'radarr' | 'sonarr' | 'lidarr' | 'chaptarr';

// =============================================================================
// Radarr Types
// =============================================================================

/**
 * Movie from /api/v3/movie
 */
export interface RadarrMovie {
	id: number;
	title: string;
	originalTitle?: string;
	sortTitle?: string;
	year?: number;
	qualityProfileId: number;
	hasFile: boolean;
	movieFileId?: number;
	monitored?: boolean;
	minimumAvailability?: string;
	runtime?: number;
	tmdbId?: number;
	imdbId?: string;
	added?: string;
	ratings?: {
		imdb?: { votes: number; value: number };
		tmdb?: { votes: number; value: number };
		rottenTomatoes?: { votes: number; value: number };
		trakt?: { votes: number; value: number };
	};
	genres?: string[];
	overview?: string;
	images?: { coverType: string; url: string; remoteUrl?: string }[];
	path?: string;
	studio?: string;
	rootFolderPath?: string;
	sizeOnDisk?: number;
	status?: string;
	tags?: number[];
	collection?: {
		title?: string;
		name?: string; // Deprecated, use title
		tmdbId?: number;
	};
	popularity?: number;
	originalLanguage?: {
		id: number;
		name: string;
	};
}

/**
 * Custom format reference (minimal, as returned in movie file)
 */
export interface CustomFormatRef {
	id: number;
	name: string;
}

/**
 * Movie file from /api/v3/moviefile
 */
export interface RadarrMovieFile {
	id: number;
	movieId: number;
	relativePath?: string;
	path?: string;
	size?: number;
	dateAdded?: string;
	quality?: {
		quality: { id: number; name: string; source?: string; resolution?: number };
		revision?: { version: number; real: number; isRepack?: boolean };
	};
	customFormats: CustomFormatRef[];
	customFormatScore: number;
	mediaInfo?: {
		audioBitrate?: number;
		audioChannels?: number;
		audioCodec?: string;
		audioLanguages?: string;
		audioStreamCount?: number;
		videoBitDepth?: number;
		videoBitrate?: number;
		videoCodec?: string;
		videoFps?: number;
		videoDynamicRange?: string;
		videoDynamicRangeType?: string;
		resolution?: string;
		runTime?: string;
		scanType?: string;
		subtitles?: string;
	};
	originalFilePath?: string;
	sceneName?: string;
	releaseGroup?: string;
	edition?: string;
	languages?: { id: number; name: string }[];
}

/**
 * Format item within a quality profile
 */
export interface QualityProfileFormatItem {
	format: number;
	name: string;
	score: number;
}

/**
 * Quality profile from /api/v3/qualityprofile
 */
export interface RadarrQualityProfile {
	id: number;
	name: string;
	upgradeAllowed?: boolean;
	cutoff?: number;
	cutoffFormatScore: number;
	minFormatScore: number;
	formatItems: QualityProfileFormatItem[];
	items?: {
		id?: number;
		name?: string;
		quality?: { id: number; name: string; source?: string; resolution?: number };
		items?: unknown[];
		allowed?: boolean;
	}[];
}

/**
 * Tag from /api/v3/tag
 */
export interface RadarrTag {
	id: number;
	label: string;
}

/**
 * Command response from /api/v3/command
 */
export interface RadarrCommand {
	id: number;
	name: string;
	commandName: string;
	status: 'queued' | 'started' | 'completed' | 'failed' | string;
	queued?: string;
	started?: string;
	ended?: string;
	message?: string;
	body?: {
		movieIds?: number[];
		sendUpdatesToClient?: boolean;
	};
}

// =============================================================================
// Library View Types (computed/joined data)
// =============================================================================

/**
 * Score breakdown showing how each custom format contributes to the total score
 */
export interface ScoreBreakdownItem {
	name: string;
	score: number;
}

/**
 * Library item with all computed fields for the UI
 */
export interface RadarrLibraryItem {
	// From /movie
	id: number;
	tmdbId?: number;
	title: string;
	year?: number;
	qualityProfileId: number;
	qualityProfileName: string;
	hasFile: boolean;
	dateAdded?: string;
	popularity?: number;

	// From /moviefile (only if hasFile)
	customFormats: CustomFormatRef[];
	customFormatScore: number;
	qualityName?: string;
	fileName?: string;

	// Computed
	scoreBreakdown: ScoreBreakdownItem[];
	cutoffScore: number;
	minScore: number;
	progress: number; // customFormatScore / cutoffFormatScore (0-1, can exceed 1)
	cutoffMet: boolean;
	isProfilarrProfile: boolean; // true if profile name matches a Profilarr database profile
}

/**
 * System status response from /api/v3/system/status
 * Based on actual Radarr API response
 */
export interface ArrSystemStatus {
	appName: string;
	instanceName: string;
	version: string;
	buildTime: string;
	isDebug: boolean;
	isProduction: boolean;
	isAdmin: boolean;
	isUserInteractive: boolean;
	startupPath: string;
	appData: string;
	osName: string;
	osVersion: string;
	isNetCore: boolean;
	isLinux: boolean;
	isOsx: boolean;
	isWindows: boolean;
	isDocker: boolean;
	mode: 'console' | string;
	branch: string;
	databaseType: 'sqLite' | string;
	databaseVersion: string;
	authentication: 'none' | 'basic' | 'forms' | string;
	migrationVersion: number;
	urlBase: string;
	runtimeVersion: string;
	runtimeName: string;
	startTime: string;
	packageVersion: string;
	packageAuthor: string;
	packageUpdateMechanism: 'builtIn' | string;
	packageUpdateMechanismMessage: string;
}
