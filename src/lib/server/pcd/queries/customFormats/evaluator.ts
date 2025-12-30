/**
 * Custom format condition evaluator
 * Evaluates conditions against parsed release titles
 */

import { logger } from '$logger/logger.ts';
import type { ParseResult } from '$lib/server/utils/arr/parser/types.ts';
import { QualitySource, QualityModifier, Resolution, ReleaseType, Language } from '$lib/server/utils/arr/parser/types.ts';
import type { ConditionData } from './conditions.ts';

export interface ConditionResult {
	conditionId: number;
	conditionName: string;
	conditionType: string;
	matched: boolean;
	required: boolean;
	negate: boolean;
	/** Final result after applying negate */
	passes: boolean;
	/** What the condition expected */
	expected: string;
	/** What was actually found in the parsed title */
	actual: string;
}

export interface EvaluationResult {
	/** Whether the custom format matches overall */
	matches: boolean;
	/** Individual condition results */
	conditions: ConditionResult[];
}

/** Serializable parsed info for frontend display */
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

// Name mappings
const sourceNames: Record<QualitySource, string> = {
	[QualitySource.Unknown]: 'Unknown',
	[QualitySource.Cam]: 'Cam',
	[QualitySource.Telesync]: 'Telesync',
	[QualitySource.Telecine]: 'Telecine',
	[QualitySource.Workprint]: 'Workprint',
	[QualitySource.DVD]: 'DVD',
	[QualitySource.TV]: 'TV',
	[QualitySource.WebDL]: 'WebDL',
	[QualitySource.WebRip]: 'WebRip',
	[QualitySource.Bluray]: 'Bluray'
};

const resolutionNames: Record<Resolution, string> = {
	[Resolution.Unknown]: 'Unknown',
	[Resolution.R360p]: '360p',
	[Resolution.R480p]: '480p',
	[Resolution.R540p]: '540p',
	[Resolution.R576p]: '576p',
	[Resolution.R720p]: '720p',
	[Resolution.R1080p]: '1080p',
	[Resolution.R2160p]: '2160p'
};

const modifierNames: Record<QualityModifier, string> = {
	[QualityModifier.None]: 'None',
	[QualityModifier.Regional]: 'Regional',
	[QualityModifier.Screener]: 'Screener',
	[QualityModifier.RawHD]: 'RawHD',
	[QualityModifier.BRDisk]: 'BRDisk',
	[QualityModifier.Remux]: 'Remux'
};

const releaseTypeNames: Record<ReleaseType, string> = {
	[ReleaseType.Unknown]: 'Unknown',
	[ReleaseType.SingleEpisode]: 'SingleEpisode',
	[ReleaseType.MultiEpisode]: 'MultiEpisode',
	[ReleaseType.SeasonPack]: 'SeasonPack'
};

const languageNames: Record<Language, string> = {
	[Language.Unknown]: 'Unknown',
	[Language.English]: 'English',
	[Language.French]: 'French',
	[Language.Spanish]: 'Spanish',
	[Language.German]: 'German',
	[Language.Italian]: 'Italian',
	[Language.Danish]: 'Danish',
	[Language.Dutch]: 'Dutch',
	[Language.Japanese]: 'Japanese',
	[Language.Icelandic]: 'Icelandic',
	[Language.Chinese]: 'Chinese',
	[Language.Russian]: 'Russian',
	[Language.Polish]: 'Polish',
	[Language.Vietnamese]: 'Vietnamese',
	[Language.Swedish]: 'Swedish',
	[Language.Norwegian]: 'Norwegian',
	[Language.Finnish]: 'Finnish',
	[Language.Turkish]: 'Turkish',
	[Language.Portuguese]: 'Portuguese',
	[Language.Flemish]: 'Flemish',
	[Language.Greek]: 'Greek',
	[Language.Korean]: 'Korean',
	[Language.Hungarian]: 'Hungarian',
	[Language.Hebrew]: 'Hebrew',
	[Language.Lithuanian]: 'Lithuanian',
	[Language.Czech]: 'Czech',
	[Language.Hindi]: 'Hindi',
	[Language.Romanian]: 'Romanian',
	[Language.Thai]: 'Thai',
	[Language.Bulgarian]: 'Bulgarian',
	[Language.PortugueseBR]: 'Portuguese (BR)',
	[Language.Arabic]: 'Arabic',
	[Language.Ukrainian]: 'Ukrainian',
	[Language.Persian]: 'Persian',
	[Language.Bengali]: 'Bengali',
	[Language.Slovak]: 'Slovak',
	[Language.Latvian]: 'Latvian',
	[Language.SpanishLatino]: 'Spanish (Latino)',
	[Language.Catalan]: 'Catalan',
	[Language.Croatian]: 'Croatian',
	[Language.Serbian]: 'Serbian',
	[Language.Bosnian]: 'Bosnian',
	[Language.Estonian]: 'Estonian',
	[Language.Tamil]: 'Tamil',
	[Language.Indonesian]: 'Indonesian',
	[Language.Telugu]: 'Telugu',
	[Language.Macedonian]: 'Macedonian',
	[Language.Slovenian]: 'Slovenian',
	[Language.Malayalam]: 'Malayalam',
	[Language.Kannada]: 'Kannada',
	[Language.Albanian]: 'Albanian',
	[Language.Afrikaans]: 'Afrikaans',
	[Language.Marathi]: 'Marathi',
	[Language.Tagalog]: 'Tagalog',
	[Language.Urdu]: 'Urdu',
	[Language.Romansh]: 'Romansh',
	[Language.Mongolian]: 'Mongolian',
	[Language.Georgian]: 'Georgian',
	[Language.Original]: 'Original'
};

/**
 * Get serializable parsed info for frontend display
 */
export function getParsedInfo(parsed: ParseResult): ParsedInfo {
	return {
		source: sourceNames[parsed.source] || 'Unknown',
		resolution: resolutionNames[parsed.resolution] || 'Unknown',
		modifier: modifierNames[parsed.modifier] || 'None',
		languages: parsed.languages.map((l) => languageNames[l] || 'Unknown'),
		releaseGroup: parsed.releaseGroup,
		year: parsed.year,
		edition: parsed.edition,
		releaseType: parsed.episode ? releaseTypeNames[parsed.episode.releaseType] || 'Unknown' : null
	};
}

interface ConditionEvalResult {
	matched: boolean;
	expected: string;
	actual: string;
}

/**
 * Evaluate a single condition against parsed result
 */
function evaluateCondition(
	condition: ConditionData,
	parsed: ParseResult,
	title: string
): ConditionEvalResult {
	switch (condition.type) {
		case 'release_title':
			return evaluatePattern(condition, title);

		case 'language':
			return evaluateLanguage(condition, parsed);

		case 'source':
			return evaluateSource(condition, parsed);

		case 'resolution':
			return evaluateResolution(condition, parsed);

		case 'quality_modifier':
			return evaluateQualityModifier(condition, parsed);

		case 'release_type':
			return evaluateReleaseType(condition, parsed);

		case 'year':
			return evaluateYear(condition, parsed);

		case 'edition':
			return evaluateEdition(condition, parsed, title);

		case 'release_group':
			return evaluateReleaseGroup(condition, parsed, title);

		// These require additional data we don't have
		case 'indexer_flag':
			return { matched: false, expected: 'Indexer flags', actual: 'N/A (no indexer data)' };
		case 'size':
			return { matched: false, expected: 'File size range', actual: 'N/A (no file data)' };

		default:
			logger.warn(`Unknown condition type: ${condition.type}`);
			return { matched: false, expected: 'Unknown', actual: 'Unknown' };
	}
}

/**
 * Evaluate regex pattern against title
 */
function evaluatePattern(condition: ConditionData, title: string): ConditionEvalResult {
	if (!condition.patterns || condition.patterns.length === 0) {
		return { matched: false, expected: 'No patterns defined', actual: title };
	}

	const patternStrs = condition.patterns.map((p) => p.pattern);
	const expected = patternStrs.join(' OR ');

	for (const pattern of condition.patterns) {
		try {
			const regex = new RegExp(pattern.pattern, 'i');
			if (regex.test(title)) {
				return { matched: true, expected, actual: `Matched: ${pattern.pattern}` };
			}
		} catch (e) {
			logger.warn(`Invalid regex pattern: ${pattern.pattern}`, e);
		}
	}
	return { matched: false, expected, actual: 'No match' };
}

/**
 * Evaluate language condition
 */
function evaluateLanguage(condition: ConditionData, parsed: ParseResult): ConditionEvalResult {
	if (!condition.languages || condition.languages.length === 0) {
		return { matched: false, expected: 'No languages defined', actual: 'N/A' };
	}

	const parsedLangNames = parsed.languages.map((l) => languageNames[l] || 'Unknown');
	const actual = parsedLangNames.length > 0 ? parsedLangNames.join(', ') : 'None detected';

	const expectedParts: string[] = [];
	for (const lang of condition.languages) {
		if (lang.except) {
			expectedParts.push(`NOT ${lang.name}`);
		} else {
			expectedParts.push(lang.name);
		}
	}
	const expected = expectedParts.join(' OR ');

	for (const lang of condition.languages) {
		const langEnum = Language[lang.name as keyof typeof Language];
		if (langEnum === undefined) continue;

		const hasLanguage = parsed.languages.includes(langEnum);

		if (lang.except) {
			if (hasLanguage) return { matched: false, expected, actual };
		} else {
			if (hasLanguage) return { matched: true, expected, actual };
		}
	}

	const onlyExcepts = condition.languages.every((l) => l.except);
	if (onlyExcepts) return { matched: true, expected, actual };

	return { matched: false, expected, actual };
}

/**
 * Evaluate source condition (Bluray, WebDL, etc.)
 */
function evaluateSource(condition: ConditionData, parsed: ParseResult): ConditionEvalResult {
	if (!condition.sources || condition.sources.length === 0) {
		return { matched: false, expected: 'No sources defined', actual: 'N/A' };
	}

	const actual = sourceNames[parsed.source] || 'Unknown';
	const expected = condition.sources.join(' OR ');
	const matched = condition.sources.some((s) => s.toLowerCase() === actual.toLowerCase());

	return { matched, expected, actual };
}

/**
 * Evaluate resolution condition
 */
function evaluateResolution(condition: ConditionData, parsed: ParseResult): ConditionEvalResult {
	if (!condition.resolutions || condition.resolutions.length === 0) {
		return { matched: false, expected: 'No resolutions defined', actual: 'N/A' };
	}

	const actual = resolutionNames[parsed.resolution] || 'Unknown';
	const expected = condition.resolutions.join(' OR ');
	const matched = condition.resolutions.some((r) => r.toLowerCase() === actual.toLowerCase());

	return { matched, expected, actual };
}

/**
 * Evaluate quality modifier condition (Remux, etc.)
 */
function evaluateQualityModifier(condition: ConditionData, parsed: ParseResult): ConditionEvalResult {
	if (!condition.qualityModifiers || condition.qualityModifiers.length === 0) {
		return { matched: false, expected: 'No modifiers defined', actual: 'N/A' };
	}

	const actual = modifierNames[parsed.modifier] || 'None';
	const expected = condition.qualityModifiers.join(' OR ');
	const matched = condition.qualityModifiers.some((m) => m.toLowerCase() === actual.toLowerCase());

	return { matched, expected, actual };
}

/**
 * Evaluate release type condition (SingleEpisode, SeasonPack, etc.)
 */
function evaluateReleaseType(condition: ConditionData, parsed: ParseResult): ConditionEvalResult {
	if (!condition.releaseTypes || condition.releaseTypes.length === 0) {
		return { matched: false, expected: 'No release types defined', actual: 'N/A' };
	}

	const expected = condition.releaseTypes.join(' OR ');

	if (!parsed.episode) {
		return { matched: false, expected, actual: 'N/A (not a series)' };
	}

	const actual = releaseTypeNames[parsed.episode.releaseType] || 'Unknown';
	const matched = condition.releaseTypes.some((t) => t.toLowerCase() === actual.toLowerCase());

	return { matched, expected, actual };
}

/**
 * Evaluate year condition
 */
function evaluateYear(condition: ConditionData, parsed: ParseResult): ConditionEvalResult {
	if (!condition.years) {
		return { matched: false, expected: 'No year range defined', actual: 'N/A' };
	}

	const { minYear, maxYear } = condition.years;
	const expectedParts: string[] = [];
	if (minYear !== null) expectedParts.push(`>= ${minYear}`);
	if (maxYear !== null) expectedParts.push(`<= ${maxYear}`);
	const expected = expectedParts.join(' AND ') || 'Any year';

	const year = parsed.year;
	if (!year || year === 0) {
		return { matched: false, expected, actual: 'No year detected' };
	}

	const actual = String(year);

	if (minYear !== null && year < minYear) return { matched: false, expected, actual };
	if (maxYear !== null && year > maxYear) return { matched: false, expected, actual };

	return { matched: true, expected, actual };
}

/**
 * Evaluate edition condition (regex on edition or title)
 */
function evaluateEdition(condition: ConditionData, parsed: ParseResult, title: string): ConditionEvalResult {
	if (!condition.patterns || condition.patterns.length === 0) {
		return { matched: false, expected: 'No patterns defined', actual: 'N/A' };
	}

	const textToCheck = parsed.edition || title;
	const actual = parsed.edition || 'None detected';
	const patternStrs = condition.patterns.map((p) => p.pattern);
	const expected = patternStrs.join(' OR ');

	for (const pattern of condition.patterns) {
		try {
			const regex = new RegExp(pattern.pattern, 'i');
			if (regex.test(textToCheck)) {
				return { matched: true, expected, actual };
			}
		} catch (e) {
			logger.warn(`Invalid regex pattern: ${pattern.pattern}`, e);
		}
	}
	return { matched: false, expected, actual };
}

/**
 * Evaluate release group condition
 */
function evaluateReleaseGroup(condition: ConditionData, parsed: ParseResult, title: string): ConditionEvalResult {
	if (!condition.patterns || condition.patterns.length === 0) {
		return { matched: false, expected: 'No patterns defined', actual: 'N/A' };
	}

	const textToCheck = parsed.releaseGroup || title;
	const actual = parsed.releaseGroup || 'None detected';
	const patternStrs = condition.patterns.map((p) => p.pattern);
	const expected = patternStrs.join(' OR ');

	for (const pattern of condition.patterns) {
		try {
			const regex = new RegExp(pattern.pattern, 'i');
			if (regex.test(textToCheck)) {
				return { matched: true, expected, actual };
			}
		} catch (e) {
			logger.warn(`Invalid regex pattern: ${pattern.pattern}`, e);
		}
	}
	return { matched: false, expected, actual };
}

/**
 * Evaluate all conditions for a custom format against a parsed release
 *
 * Custom format matching logic:
 * - ALL required conditions must pass
 * - At least ONE non-required condition must pass (if any exist)
 */
export function evaluateCustomFormat(
	conditions: ConditionData[],
	parsed: ParseResult,
	title: string
): EvaluationResult {
	const results: ConditionResult[] = [];

	for (const condition of conditions) {
		const evalResult = evaluateCondition(condition, parsed, title);
		const passes = condition.negate ? !evalResult.matched : evalResult.matched;

		results.push({
			conditionId: condition.id,
			conditionName: condition.name,
			conditionType: condition.type,
			matched: evalResult.matched,
			required: condition.required,
			negate: condition.negate,
			passes,
			expected: evalResult.expected,
			actual: evalResult.actual
		});
	}

	// Check if format matches
	const requiredConditions = results.filter((r) => r.required);
	const optionalConditions = results.filter((r) => !r.required);

	// All required must pass
	const allRequiredPass = requiredConditions.every((r) => r.passes);

	// If there are optional conditions, at least one must pass
	// If there are no optional conditions, only required matter
	const optionalPass =
		optionalConditions.length === 0 || optionalConditions.some((r) => r.passes);

	return {
		matches: allRequiredPass && optionalPass,
		conditions: results
	};
}
