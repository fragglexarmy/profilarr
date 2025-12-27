/**
 * Tag-based cooldown tracking for upgrade searches
 *
 * Uses tags in the format: profilarr-searched-YYYY-MM-DD
 * This allows checking if an item was searched within the cooldown window
 */

import type { RadarrTag, RadarrMovie } from '$lib/server/utils/arr/types.ts';
import type { RadarrClient } from '$lib/server/utils/arr/clients/radarr.ts';

const TAG_PREFIX = 'profilarr-searched-';

/**
 * Get today's cooldown tag label
 */
export function getTodayTagLabel(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${TAG_PREFIX}${year}-${month}-${day}`;
}

/**
 * Parse a date from a profilarr search tag label
 * Returns null if not a valid profilarr tag
 */
function parseDateFromTagLabel(label: string): Date | null {
	if (!label.startsWith(TAG_PREFIX)) {
		return null;
	}

	const dateStr = label.slice(TAG_PREFIX.length);
	const parsed = new Date(dateStr);

	// Check if valid date
	if (isNaN(parsed.getTime())) {
		return null;
	}

	return parsed;
}

/**
 * Check if an item is on cooldown based on its tags
 *
 * @param itemTagIds - The tag IDs on the item
 * @param allTags - All tags from the arr instance
 * @param cooldownHours - The cooldown period in hours
 */
export function isOnCooldown(
	itemTagIds: number[],
	allTags: RadarrTag[],
	cooldownHours: number
): boolean {
	const now = new Date();
	const cooldownMs = cooldownHours * 60 * 60 * 1000;

	// Create a lookup for tag IDs to labels
	const tagMap = new Map(allTags.map((t) => [t.id, t.label]));

	for (const tagId of itemTagIds) {
		const label = tagMap.get(tagId);
		if (!label) continue;

		const tagDate = parseDateFromTagLabel(label);
		if (!tagDate) continue;

		// Check if the tag date is within the cooldown window
		const diffMs = now.getTime() - tagDate.getTime();
		if (diffMs <= cooldownMs) {
			return true;
		}
	}

	return false;
}

/**
 * Filter items that are NOT on cooldown
 *
 * @param items - Items with _tags property
 * @param allTags - All tags from the arr instance
 * @param cooldownHours - The cooldown period in hours
 */
export function filterByCooldown<T extends { _tags: number[] }>(
	items: T[],
	allTags: RadarrTag[],
	cooldownHours: number
): T[] {
	if (cooldownHours <= 0) {
		// No cooldown, return all items
		return items;
	}

	return items.filter((item) => !isOnCooldown(item._tags, allTags, cooldownHours));
}

/**
 * Apply today's search tag to a movie
 * Adds the tag to the movie's existing tags and updates via API
 */
export async function applySearchTag(
	client: RadarrClient,
	movie: RadarrMovie,
	tagId: number
): Promise<RadarrMovie> {
	// Get current tags, add new one if not present
	const currentTags = movie.tags ?? [];
	if (currentTags.includes(tagId)) {
		return movie; // Already has the tag
	}

	const updatedMovie = {
		...movie,
		tags: [...currentTags, tagId]
	};

	return await client.updateMovie(updatedMovie);
}

/**
 * Apply search tag to multiple movies
 */
export async function applySearchTagToMovies(
	client: RadarrClient,
	movies: RadarrMovie[],
	tagId: number
): Promise<{ success: number; failed: number; errors: string[] }> {
	let success = 0;
	let failed = 0;
	const errors: string[] = [];

	for (const movie of movies) {
		try {
			await applySearchTag(client, movie, tagId);
			success++;
		} catch (error) {
			failed++;
			errors.push(`Failed to tag "${movie.title}": ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	return { success, failed, errors };
}
