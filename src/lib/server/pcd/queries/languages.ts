/**
 * Language queries for PCD cache
 */

import type { PCDCache } from '../cache.ts';

/**
 * Available language from the database
 */
export interface Language {
	id: number;
	name: string;
}

/**
 * Get all available languages
 */
export function list(cache: PCDCache): Language[] {
	const languages = cache.query<{
		id: number;
		name: string;
	}>(`
    SELECT
      id,
      name
    FROM languages
    ORDER BY name
  `);

	return languages.map(lang => ({
		id: lang.id,
		name: lang.name
	}));
}
