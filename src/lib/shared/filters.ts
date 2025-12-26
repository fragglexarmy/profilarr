/**
 * Shared filter types for both backend and frontend
 * Defines all available filter fields for upgrade filtering
 */

export interface FilterOperator {
	id: string;
	label: string;
}

export interface FilterValue {
	value: any;
	label: string;
}

export interface FilterField {
	id: string;
	label: string;
	operators: FilterOperator[];
	valueType: 'boolean' | 'select' | 'text' | 'number' | 'date';
	values?: FilterValue[];
}

export interface FilterRule {
	type: 'rule';
	field: string;
	operator: string;
	value: any;
}

export interface FilterGroup {
	type: 'group';
	match: 'all' | 'any';
	children: (FilterRule | FilterGroup)[];
}

export interface FilterConfig {
	id: string;
	name: string;
	enabled: boolean;
	group: FilterGroup;
	selector: string;
	count: number;
	cutoff: number;
	searchCooldown: number; // hours - skip items searched within this time
}

export type FilterMode = 'round_robin' | 'random';

export interface UpgradeConfig {
	id?: number;
	arrInstanceId: number;
	enabled: boolean;
	schedule: number; // minutes
	filterMode: FilterMode;
	filters: FilterConfig[];
	currentFilterIndex: number;
	lastRunAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export const filterModes: { id: FilterMode; label: string; description: string }[] = [
	{
		id: 'round_robin',
		label: 'Round Robin',
		description: 'Cycle through filters in order, one per run'
	},
	{
		id: 'random',
		label: 'Random Shuffle',
		description: 'Shuffle filters, cycle through all before repeating'
	}
];

/**
 * Common operator sets
 */
const booleanOperators: FilterOperator[] = [
	{ id: 'is', label: 'is' },
	{ id: 'is_not', label: 'is not' }
];

const numberOperators: FilterOperator[] = [
	{ id: 'eq', label: 'equals' },
	{ id: 'neq', label: 'does not equal' },
	{ id: 'gt', label: 'is greater than' },
	{ id: 'gte', label: 'is greater than or equal' },
	{ id: 'lt', label: 'is less than' },
	{ id: 'lte', label: 'is less than or equal' }
];

const textOperators: FilterOperator[] = [
	{ id: 'contains', label: 'contains' },
	{ id: 'not_contains', label: 'does not contain' },
	{ id: 'starts_with', label: 'starts with' },
	{ id: 'ends_with', label: 'ends with' },
	{ id: 'eq', label: 'equals' },
	{ id: 'neq', label: 'does not equal' }
];

const dateOperators: FilterOperator[] = [
	{ id: 'before', label: 'is before' },
	{ id: 'after', label: 'is after' },
	{ id: 'in_last', label: 'in the last' },
	{ id: 'not_in_last', label: 'not in the last' }
];

/**
 * All available filter fields
 */
export const filterFields: FilterField[] = [
	// Boolean fields
	{
		id: 'monitored',
		label: 'Monitored',
		operators: booleanOperators,
		valueType: 'boolean',
		values: [
			{ value: true, label: 'True' },
			{ value: false, label: 'False' }
		]
	},
	{
		id: 'cutoff_met',
		label: 'Cutoff Met',
		operators: booleanOperators,
		valueType: 'boolean',
		values: [
			{ value: true, label: 'True' },
			{ value: false, label: 'False' }
		]
	},

	// Select fields
	{
		id: 'minimum_availability',
		label: 'Minimum Availability',
		operators: booleanOperators,
		valueType: 'select',
		values: [
			{ value: 'announced', label: 'Announced' },
			{ value: 'inCinemas', label: 'In Cinemas' },
			{ value: 'released', label: 'Released' }
		]
	},

	// Text fields
	{
		id: 'title',
		label: 'Title',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'quality_profile',
		label: 'Quality Profile',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'collection',
		label: 'Collection',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'studio',
		label: 'Studio',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'original_language',
		label: 'Original Language',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'genres',
		label: 'Genres',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'keywords',
		label: 'Keywords',
		operators: textOperators,
		valueType: 'text'
	},
	{
		id: 'release_group',
		label: 'Release Group',
		operators: textOperators,
		valueType: 'text'
	},

	// Number fields
	{
		id: 'year',
		label: 'Year',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'popularity',
		label: 'Popularity',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'runtime',
		label: 'Runtime (minutes)',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'size_on_disk',
		label: 'Size on Disk (GB)',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'tmdb_rating',
		label: 'TMDb Rating',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'imdb_rating',
		label: 'IMDb Rating',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'tomato_rating',
		label: 'Rotten Tomatoes Rating',
		operators: numberOperators,
		valueType: 'number'
	},
	{
		id: 'trakt_rating',
		label: 'Trakt Rating',
		operators: numberOperators,
		valueType: 'number'
	},

	// Date fields
	{
		id: 'date_added',
		label: 'Date Added',
		operators: dateOperators,
		valueType: 'date'
	}
];

/**
 * Get a filter field by ID
 */
export function getFilterField(id: string): FilterField | undefined {
	return filterFields.find((f) => f.id === id);
}

/**
 * Get all filter field IDs
 */
export function getAllFilterFieldIds(): string[] {
	return filterFields.map((f) => f.id);
}

/**
 * Validate if a filter field ID exists
 */
export function isValidFilterField(id: string): boolean {
	return filterFields.some((f) => f.id === id);
}

/**
 * Create an empty filter group
 */
export function createEmptyGroup(): FilterGroup {
	return {
		type: 'group',
		match: 'all',
		children: []
	};
}

/**
 * Create an empty filter config
 */
export function createEmptyFilterConfig(name: string = 'New Filter'): FilterConfig {
	return {
		id: crypto.randomUUID(),
		name,
		enabled: true,
		group: createEmptyGroup(),
		selector: 'random',
		count: 5,
		cutoff: 80,
		searchCooldown: 24 // default 24 hours
	};
}

/**
 * Create an empty upgrade config for an arr instance
 */
export function createEmptyUpgradeConfig(arrInstanceId: number): UpgradeConfig {
	return {
		arrInstanceId,
		enabled: false,
		schedule: 360, // 6 hours
		filterMode: 'round_robin',
		filters: [],
		currentFilterIndex: 0
	};
}

/**
 * Create an empty filter rule with defaults
 */
export function createEmptyRule(): FilterRule {
	const firstField = filterFields[0];
	return {
		type: 'rule',
		field: firstField.id,
		operator: firstField.operators[0].id,
		value: firstField.values?.[0]?.value ?? null
	};
}

/**
 * Check if a child is a rule
 */
export function isRule(child: FilterRule | FilterGroup): child is FilterRule {
	return child.type === 'rule';
}

/**
 * Check if a child is a group
 */
export function isGroup(child: FilterRule | FilterGroup): child is FilterGroup {
	return child.type === 'group';
}
