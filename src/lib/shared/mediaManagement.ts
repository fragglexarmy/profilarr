/**
 * Shared media management types and options
 * Used by both UI and sync engine
 */

// ============================================================================
// PROPERS AND REPACKS
// ============================================================================

export type PropersRepacks = 'doNotPrefer' | 'preferAndUpgrade' | 'doNotUpgradeAutomatically';

// ============================================================================
// MEDIA SETTINGS
// ============================================================================

export interface MediaSettings {
	id: number;
	propers_repacks: PropersRepacks;
	enable_media_info: boolean;
}

export const PROPERS_REPACKS_OPTIONS: {
	value: PropersRepacks;
	label: string;
	description: string;
}[] = [
	{
		value: 'doNotPrefer',
		label: 'Do Not Prefer',
		description: 'Propers and repacks are not preferred over existing files'
	},
	{
		value: 'preferAndUpgrade',
		label: 'Prefer and Upgrade',
		description: 'Automatically upgrade to propers and repacks when available'
	},
	{
		value: 'doNotUpgradeAutomatically',
		label: 'Do Not Upgrade Automatically',
		description: 'Prefer propers/repacks but do not automatically upgrade'
	}
];

/**
 * Get the display label for a propers_repacks value
 */
export function getPropersRepacksLabel(value: PropersRepacks): string {
	const option = PROPERS_REPACKS_OPTIONS.find((o) => o.value === value);
	return option?.label ?? value;
}

// ============================================================================
// SONARR NAMING
// ============================================================================

export type ColonReplacementFormat =
	| 'delete'
	| 'dash'
	| 'spaceDash'
	| 'spaceDashSpace'
	| 'smart'
	| 'custom';

export const COLON_REPLACEMENT_OPTIONS: {
	value: ColonReplacementFormat;
	label: string;
}[] = [
	{ value: 'delete', label: 'Delete' },
	{ value: 'dash', label: 'Replace with Dash' },
	{ value: 'spaceDash', label: 'Replace with Space Dash' },
	{ value: 'spaceDashSpace', label: 'Replace with Space Dash Space' },
	{ value: 'smart', label: 'Smart Replace' },
	{ value: 'custom', label: 'Custom' }
];

export function getColonReplacementLabel(value: ColonReplacementFormat): string {
	const option = COLON_REPLACEMENT_OPTIONS.find((o) => o.value === value);
	return option?.label ?? value;
}

// Database stores as numbers: 0=delete, 1=dash, 2=spaceDash, 3=spaceDashSpace, 4=smart, 5=custom
const COLON_REPLACEMENT_NUM_MAP: Record<number, ColonReplacementFormat> = {
	0: 'delete',
	1: 'dash',
	2: 'spaceDash',
	3: 'spaceDashSpace',
	4: 'smart',
	5: 'custom'
};

const COLON_REPLACEMENT_STR_MAP: Record<ColonReplacementFormat, number> = {
	delete: 0,
	dash: 1,
	spaceDash: 2,
	spaceDashSpace: 3,
	smart: 4,
	custom: 5
};

export function colonReplacementFromDb(value: number): ColonReplacementFormat {
	return COLON_REPLACEMENT_NUM_MAP[value] ?? 'delete';
}

export function colonReplacementToDb(value: ColonReplacementFormat): number {
	return COLON_REPLACEMENT_STR_MAP[value] ?? 0;
}

export type MultiEpisodeStyle =
	| 'extend'
	| 'duplicate'
	| 'repeat'
	| 'scene'
	| 'range'
	| 'prefixedRange';

export const MULTI_EPISODE_STYLE_OPTIONS: {
	value: MultiEpisodeStyle;
	label: string;
}[] = [
	{ value: 'extend', label: 'Extend' },
	{ value: 'duplicate', label: 'Duplicate' },
	{ value: 'repeat', label: 'Repeat' },
	{ value: 'scene', label: 'Scene' },
	{ value: 'range', label: 'Range' },
	{ value: 'prefixedRange', label: 'Prefixed Range' }
];

export function getMultiEpisodeStyleLabel(value: MultiEpisodeStyle): string {
	const option = MULTI_EPISODE_STYLE_OPTIONS.find((o) => o.value === value);
	return option?.label ?? value;
}

// Database stores as numbers: 0=extend, 1=duplicate, 2=repeat, 3=scene, 4=range, 5=prefixedRange
const MULTI_EPISODE_NUM_MAP: Record<number, MultiEpisodeStyle> = {
	0: 'extend',
	1: 'duplicate',
	2: 'repeat',
	3: 'scene',
	4: 'range',
	5: 'prefixedRange'
};

const MULTI_EPISODE_STR_MAP: Record<MultiEpisodeStyle, number> = {
	extend: 0,
	duplicate: 1,
	repeat: 2,
	scene: 3,
	range: 4,
	prefixedRange: 5
};

export function multiEpisodeStyleFromDb(value: number): MultiEpisodeStyle {
	return MULTI_EPISODE_NUM_MAP[value] ?? 'extend';
}

export function multiEpisodeStyleToDb(value: MultiEpisodeStyle): number {
	return MULTI_EPISODE_STR_MAP[value] ?? 0;
}

// Radarr colon replacement (no custom option)
export type RadarrColonReplacementFormat =
	| 'delete'
	| 'dash'
	| 'spaceDash'
	| 'spaceDashSpace'
	| 'smart';

export const RADARR_COLON_REPLACEMENT_OPTIONS: {
	value: RadarrColonReplacementFormat;
	label: string;
}[] = [
	{ value: 'delete', label: 'Delete' },
	{ value: 'dash', label: 'Replace with Dash' },
	{ value: 'spaceDash', label: 'Replace with Space Dash' },
	{ value: 'spaceDashSpace', label: 'Replace with Space Dash Space' },
	{ value: 'smart', label: 'Smart Replace' }
];

export function getRadarrColonReplacementLabel(value: RadarrColonReplacementFormat): string {
	const option = RADARR_COLON_REPLACEMENT_OPTIONS.find((o) => o.value === value);
	return option?.label ?? value;
}

export function radarrColonReplacementFromDb(value: number): RadarrColonReplacementFormat {
	const map: Record<number, RadarrColonReplacementFormat> = {
		0: 'delete',
		1: 'dash',
		2: 'spaceDash',
		3: 'spaceDashSpace',
		4: 'smart'
	};
	return map[value] ?? 'delete';
}

export function radarrColonReplacementToDb(value: RadarrColonReplacementFormat): number {
	const map: Record<RadarrColonReplacementFormat, number> = {
		delete: 0,
		dash: 1,
		spaceDash: 2,
		spaceDashSpace: 3,
		smart: 4
	};
	return map[value] ?? 0;
}

export interface RadarrNaming {
	id: number;
	rename: boolean;
	movie_format: string;
	movie_folder_format: string;
	replace_illegal_characters: boolean;
	colon_replacement_format: RadarrColonReplacementFormat;
}

export interface SonarrNaming {
	id: number;
	rename: boolean;
	replace_illegal_characters: boolean;
	colon_replacement_format: ColonReplacementFormat;
	custom_colon_replacement_format: string | null;
	standard_episode_format: string;
	daily_episode_format: string;
	anime_episode_format: string;
	series_folder_format: string;
	season_folder_format: string;
	multi_episode_style: MultiEpisodeStyle;
}

// ============================================================================
// QUALITY DEFINITION RESOLUTION GROUPS
// ============================================================================

export type ResolutionGroup = 'SD' | '720p' | '1080p' | '2160p' | 'Prereleases' | 'Other';

export const RESOLUTION_GROUP_ORDER: ResolutionGroup[] = [
	'2160p',
	'1080p',
	'720p',
	'SD',
	'Prereleases',
	'Other'
];

export const RESOLUTION_GROUP_LABELS: Record<ResolutionGroup, string> = {
	'2160p': '4K Ultra HD (2160p)',
	'1080p': 'Full HD (1080p)',
	'720p': 'HD (720p)',
	SD: 'Standard Definition (SD)',
	Prereleases: 'Prereleases',
	Other: 'Other'
};

// Qualities that belong to Prereleases group
const PRERELEASE_QUALITIES = ['cam', 'dvdscr', 'regional', 'telecine', 'telesync', 'workprint'];

// Qualities that belong to Other group
const OTHER_QUALITIES = ['raw-hd', 'unknown'];

/**
 * Determine the resolution group from a quality name
 * Parses names like "Bluray-1080p", "WEBDL-720p", "HDTV-2160p", etc.
 */
export function getResolutionGroup(qualityName: string): ResolutionGroup {
	const name = qualityName.toLowerCase();

	// Check for prereleases first
	if (PRERELEASE_QUALITIES.some((q) => name === q || name.includes(q))) {
		return 'Prereleases';
	}

	// Check for other/unknown
	if (OTHER_QUALITIES.some((q) => name === q || name.includes(q))) {
		return 'Other';
	}

	// Check by resolution
	if (name.includes('2160') || name.includes('4k') || name.includes('uhd')) {
		return '2160p';
	}
	if (name.includes('1080')) {
		return '1080p';
	}
	if (name.includes('720')) {
		return '720p';
	}

	// Everything else is SD (480p, SDTV, DVD, etc.)
	return 'SD';
}
