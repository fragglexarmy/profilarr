/**
 * PCD Type Overrides
 *
 * Manual type overrides for columns that store numeric values in the DB
 * but need semantic string types (because that's what the API expects).
 *
 * Format: 'table_name.column_name': 'TypeScript type'
 *
 * Note: Columns with CHECK constraints in the schema don't need overrides -
 * the generator parses those automatically.
 */

export const columnTypeOverrides: Record<string, string> = {
	// Sonarr stores these as integers (0-5) but API expects semantic strings
	'sonarr_naming.colon_replacement_format':
		"'delete' | 'dash' | 'spaceDash' | 'spaceDashSpace' | 'smart' | 'custom'",
	'sonarr_naming.multi_episode_style':
		"'extend' | 'duplicate' | 'repeat' | 'scene' | 'range' | 'prefixedRange'"
};

/**
 * DB value mappings for converting between numeric DB values and semantic strings.
 * Used by query read/write functions.
 */
export const colonReplacementFromDb: Record<number, string> = {
	0: 'delete',
	1: 'dash',
	2: 'spaceDash',
	3: 'spaceDashSpace',
	4: 'smart',
	5: 'custom'
};

export const colonReplacementToDb: Record<string, number> = {
	delete: 0,
	dash: 1,
	spaceDash: 2,
	spaceDashSpace: 3,
	smart: 4,
	custom: 5
};

export const multiEpisodeStyleFromDb: Record<number, string> = {
	0: 'extend',
	1: 'duplicate',
	2: 'repeat',
	3: 'scene',
	4: 'range',
	5: 'prefixedRange'
};

export const multiEpisodeStyleToDb: Record<string, number> = {
	extend: 0,
	duplicate: 1,
	repeat: 2,
	scene: 3,
	range: 4,
	prefixedRange: 5
};
