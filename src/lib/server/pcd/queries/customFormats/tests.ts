/**
 * Custom format test read queries
 */

import type { PCDCache } from '../../cache.ts';
import type { CustomFormatBasic, CustomFormatTest } from './types.ts';

/**
 * Get custom format basic info by ID
 */
export async function getById(cache: PCDCache, formatId: number): Promise<CustomFormatBasic | null> {
	const db = cache.kb;

	const format = await db
		.selectFrom('custom_formats')
		.select(['id', 'name', 'description'])
		.where('id', '=', formatId)
		.executeTakeFirst();

	return format ?? null;
}

/**
 * Get all tests for a custom format
 */
export async function listTests(cache: PCDCache, formatId: number): Promise<CustomFormatTest[]> {
	const db = cache.kb;

	const tests = await db
		.selectFrom('custom_format_tests')
		.select(['id', 'title', 'type', 'should_match', 'description'])
		.where('custom_format_id', '=', formatId)
		.orderBy('id')
		.execute();

	return tests.map((test) => ({
		...test,
		should_match: test.should_match === 1
	}));
}

/**
 * Get a single test by ID
 */
export async function getTestById(cache: PCDCache, testId: number): Promise<CustomFormatTest | null> {
	const db = cache.kb;

	const test = await db
		.selectFrom('custom_format_tests')
		.select(['id', 'title', 'type', 'should_match', 'description'])
		.where('id', '=', testId)
		.executeTakeFirst();

	if (!test) return null;

	return {
		...test,
		should_match: test.should_match === 1
	};
}
