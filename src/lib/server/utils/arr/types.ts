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

// =============================================================================
// Delay Profile Types (shared across arr apps)
// =============================================================================

/**
 * Delay profile from /api/v3/delayprofile
 * Schema is identical for Radarr and Sonarr
 */
export interface ArrDelayProfile {
	id: number;
	enableUsenet: boolean;
	enableTorrent: boolean;
	preferredProtocol: string; // 'usenet' | 'torrent' | 'unknown'
	usenetDelay: number;
	torrentDelay: number;
	bypassIfHighestQuality: boolean;
	bypassIfAboveCustomFormatScore: boolean;
	minimumCustomFormatScore: number;
	order: number;
	tags: number[];
}

/**
 * Tag from /api/v3/tag (shared across arr apps)
 */
export interface ArrTag {
	id: number;
	label: string;
}

// =============================================================================
// Media Management Config Types
// =============================================================================

/**
 * Propers and repacks download preference
 * Shared between Radarr and Sonarr
 * API values: doNotPrefer, preferAndUpgrade, doNotUpgrade
 */
export type ArrPropersAndRepacks = 'doNotPrefer' | 'preferAndUpgrade' | 'doNotUpgrade';

/**
 * Media management config from /api/v3/config/mediamanagement
 * Only includes fields we care about syncing - the full response has many more fields
 * We GET the full config, modify these fields, and PUT the whole thing back
 */
export interface ArrMediaManagementConfig {
	id: number;
	downloadPropersAndRepacks: ArrPropersAndRepacks;
	enableMediaInfo: boolean;
	// The API returns many more fields - we preserve them when updating
	[key: string]: unknown;
}

// =============================================================================
// Naming Config Types
// =============================================================================

/**
 * Radarr colon replacement format (string enum)
 */
export type RadarrColonReplacementFormat = 'delete' | 'dash' | 'spaceDash' | 'spaceDashSpace' | 'smart';

/**
 * Radarr naming config from /api/v3/config/naming
 */
export interface RadarrNamingConfig {
	id: number;
	renameMovies: boolean;
	replaceIllegalCharacters: boolean;
	colonReplacementFormat: RadarrColonReplacementFormat;
	standardMovieFormat: string | null;
	movieFolderFormat: string | null;
	[key: string]: unknown;
}

/**
 * Sonarr naming config from /api/v3/config/naming
 * Note: colonReplacementFormat and multiEpisodeStyle are integers, not strings
 */
export interface SonarrNamingConfig {
	id: number;
	renameEpisodes: boolean;
	replaceIllegalCharacters: boolean;
	colonReplacementFormat: number;
	customColonReplacementFormat: string | null;
	multiEpisodeStyle: number;
	standardEpisodeFormat: string | null;
	dailyEpisodeFormat: string | null;
	animeEpisodeFormat: string | null;
	seriesFolderFormat: string | null;
	seasonFolderFormat: string | null;
	specialsFolderFormat: string | null;
	[key: string]: unknown;
}

/**
 * Union type for naming config (varies by arr type)
 */
export type ArrNamingConfig = RadarrNamingConfig | SonarrNamingConfig;

// =============================================================================
// Quality Definition Types
// =============================================================================

/**
 * Quality info within a quality definition
 */
export interface ArrQuality {
	id: number;
	name: string | null;
	source?: string;
	resolution?: number;
}

/**
 * Quality definition from /api/v3/qualitydefinition
 */
export interface ArrQualityDefinition {
	id: number;
	quality: ArrQuality;
	title: string | null;
	weight: number;
	minSize: number | null;
	maxSize: number | null;
	preferredSize: number | null;
}

// =============================================================================
// System Types
// =============================================================================

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
