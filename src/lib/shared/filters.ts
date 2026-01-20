/**
 * Shared filter types for both backend and frontend
 * Defines all available filter fields for upgrade filtering
 */

import { uuid } from './uuid.ts';

export interface FilterOperator {
	id: string;
	label: string;
}

export type FilterValueType = string | number | boolean | null;

export interface FilterValue {
	value: FilterValueType;
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
	value: FilterValueType;
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
	dryRun: boolean;
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

const ordinalOperators: FilterOperator[] = [
	{ id: 'eq', label: 'is exactly' },
	{ id: 'neq', label: 'is not' },
	{ id: 'gte', label: 'has reached' },
	{ id: 'lte', label: "hasn't passed" },
	{ id: 'gt', label: 'is past' },
	{ id: 'lt', label: 'is before' }
];

/**
 * Ordinal value mappings for ordered select fields
 * Higher number = further along in the progression
 */
export const availabilityOrder: Record<string, number> = {
	tba: 0,
	announced: 1,
	inCinemas: 2,
	released: 3
};

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

	// Ordinal fields (ordered select values)
	{
		id: 'minimum_availability',
		label: 'Minimum Availability',
		operators: ordinalOperators,
		valueType: 'select',
		values: [
			{ value: 'tba', label: 'TBA' },
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
	},
	{
		id: 'digital_release',
		label: 'Digital Release',
		operators: dateOperators,
		valueType: 'date'
	},
	{
		id: 'physical_release',
		label: 'Physical Release',
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
		id: uuid(),
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
		dryRun: false,
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

/**
 * Evaluate a single filter rule against an item
 */
export function evaluateRule(item: Record<string, unknown>, rule: FilterRule): boolean {
	const fieldValue = item[rule.field];
	const ruleValue = rule.value;

	// Handle null/undefined field values
	if (fieldValue === null || fieldValue === undefined) {
		// For 'is_not' or negation operators, null means "not equal" so return true
		if (['is_not', 'neq', 'not_contains'].includes(rule.operator)) {
			return true;
		}
		return false;
	}

	switch (rule.operator) {
		// Boolean operators
		case 'is':
			return fieldValue === ruleValue;
		case 'is_not':
			return fieldValue !== ruleValue;

		// Number operators
		case 'eq':
			if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
				return fieldValue.toLowerCase() === ruleValue.toLowerCase();
			}
			return fieldValue === ruleValue;
		case 'neq':
			if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
				return fieldValue.toLowerCase() !== ruleValue.toLowerCase();
			}
			return fieldValue !== ruleValue;
		// Text operators (case-insensitive)
		case 'contains': {
			const strField = String(fieldValue).toLowerCase();
			const strRule = String(ruleValue).toLowerCase();
			return strField.includes(strRule);
		}
		case 'not_contains': {
			const strField = String(fieldValue).toLowerCase();
			const strRule = String(ruleValue).toLowerCase();
			return !strField.includes(strRule);
		}
		case 'starts_with': {
			const strField = String(fieldValue).toLowerCase();
			const strRule = String(ruleValue).toLowerCase();
			return strField.startsWith(strRule);
		}
		case 'ends_with': {
			const strField = String(fieldValue).toLowerCase();
			const strRule = String(ruleValue).toLowerCase();
			return strField.endsWith(strRule);
		}

		// Ordinal operators (for fields like minimum_availability)
		case 'gte': {
			// Check if this is an ordinal field
			if (rule.field === 'minimum_availability') {
				const fieldOrdinal = availabilityOrder[fieldValue as string] ?? -1;
				const ruleOrdinal = availabilityOrder[ruleValue as string] ?? -1;
				return fieldOrdinal >= ruleOrdinal;
			}
			// Fall through to number comparison
			return (
				typeof fieldValue === 'number' && typeof ruleValue === 'number' && fieldValue >= ruleValue
			);
		}
		case 'lte': {
			if (rule.field === 'minimum_availability') {
				const fieldOrdinal = availabilityOrder[fieldValue as string] ?? -1;
				const ruleOrdinal = availabilityOrder[ruleValue as string] ?? -1;
				return fieldOrdinal <= ruleOrdinal;
			}
			return (
				typeof fieldValue === 'number' && typeof ruleValue === 'number' && fieldValue <= ruleValue
			);
		}
		case 'gt': {
			if (rule.field === 'minimum_availability') {
				const fieldOrdinal = availabilityOrder[fieldValue as string] ?? -1;
				const ruleOrdinal = availabilityOrder[ruleValue as string] ?? -1;
				return fieldOrdinal > ruleOrdinal;
			}
			return (
				typeof fieldValue === 'number' && typeof ruleValue === 'number' && fieldValue > ruleValue
			);
		}
		case 'lt': {
			if (rule.field === 'minimum_availability') {
				const fieldOrdinal = availabilityOrder[fieldValue as string] ?? -1;
				const ruleOrdinal = availabilityOrder[ruleValue as string] ?? -1;
				return fieldOrdinal < ruleOrdinal;
			}
			return (
				typeof fieldValue === 'number' && typeof ruleValue === 'number' && fieldValue < ruleValue
			);
		}

		// Date operators
		case 'before': {
			const fieldDate = new Date(fieldValue as string);
			const ruleDate = new Date(ruleValue as string);
			return fieldDate < ruleDate;
		}
		case 'after': {
			const fieldDate = new Date(fieldValue as string);
			const ruleDate = new Date(ruleValue as string);
			return fieldDate > ruleDate;
		}
		case 'in_last': {
			// ruleValue is number of days/hours depending on context
			const fieldDate = new Date(fieldValue as string);
			const now = new Date();
			const diffMs = now.getTime() - fieldDate.getTime();
			const diffDays = diffMs / (1000 * 60 * 60 * 24);
			return diffDays <= (ruleValue as number);
		}
		case 'not_in_last': {
			const fieldDate = new Date(fieldValue as string);
			const now = new Date();
			const diffMs = now.getTime() - fieldDate.getTime();
			const diffDays = diffMs / (1000 * 60 * 60 * 24);
			return diffDays > (ruleValue as number);
		}

		default:
			return false;
	}
}

/**
 * Evaluate a filter group against an item
 * Supports nested groups with AND/OR logic
 */
export function evaluateGroup(item: Record<string, unknown>, group: FilterGroup): boolean {
	if (group.children.length === 0) {
		// Empty group matches everything
		return true;
	}

	if (group.match === 'all') {
		// AND logic: all children must match
		return group.children.every((child) => {
			if (isRule(child)) {
				return evaluateRule(item, child);
			} else {
				return evaluateGroup(item, child);
			}
		});
	} else {
		// OR logic: any child must match
		return group.children.some((child) => {
			if (isRule(child)) {
				return evaluateRule(item, child);
			} else {
				return evaluateGroup(item, child);
			}
		});
	}
}
