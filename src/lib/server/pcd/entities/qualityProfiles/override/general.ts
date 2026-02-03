import { getCache } from '$pcd/index.ts';
import type { WriteResult } from '$pcd/index.ts';
import { general as readProfileGeneral } from '../general/read.ts';
import { updateGeneral } from '../general/update.ts';
import type { StoredOpMetadata, StoredDesiredState } from '$pcd/conflicts/overrideUtils.ts';
import {
	getDesiredTo,
	normalizeTags,
	normalizeText,
	tagsEqual
} from '$pcd/conflicts/overrideUtils.ts';
import { resolveProfileName } from './resolve.ts';

function resolveTags(current: string[], desiredState: StoredDesiredState): string[] {
	const desiredTags = desiredState.tags;
	if (Array.isArray(desiredTags)) {
		return normalizeTags(desiredTags);
	}
	if (desiredTags && typeof desiredTags === 'object') {
		const add = Array.isArray((desiredTags as { add?: unknown }).add)
			? ((desiredTags as { add: unknown[] }).add as unknown[]).map((tag) => String(tag))
			: [];
		const remove = Array.isArray((desiredTags as { remove?: unknown }).remove)
			? ((desiredTags as { remove: unknown[] }).remove as unknown[]).map((tag) => String(tag))
			: [];
		const set = new Set(current);
		for (const tag of remove) set.delete(tag);
		for (const tag of add) set.add(tag);
		return Array.from(set);
	}
	return current;
}

function resolveLanguage(current: string | null, desiredState: StoredDesiredState): string | null {
	const langField = desiredState.language;
	if (!langField || typeof langField !== 'object') return current;
	const typed = langField as { from?: unknown; to?: unknown };
	if ('to' in typed) {
		return typeof typed.to === 'string' ? typed.to : null;
	}
	return current;
}

export async function overrideGeneral(
	databaseId: number,
	metadata: StoredOpMetadata | null,
	desiredState: StoredDesiredState | null
): Promise<WriteResult> {
	if (!desiredState) {
		return { success: false, error: 'Missing desired state for override' };
	}

	const cache = getCache(databaseId);
	if (!cache) {
		return { success: false, error: 'Cache not available' };
	}

	const profileName = await resolveProfileName(cache, databaseId, metadata, desiredState);
	if (!profileName) {
		return { success: false, error: 'Quality profile not found for override' };
	}

	const profileRow = await cache.kb
		.selectFrom('quality_profiles')
		.select(['id', 'name'])
		.where('name', '=', profileName)
		.executeTakeFirst();
	if (!profileRow) {
		return { success: false, error: 'Quality profile not found for override' };
	}

	const current = await readProfileGeneral(cache, profileRow.id);
	if (!current) {
		return { success: false, error: 'Quality profile not found for override' };
	}

	const desiredName =
		getDesiredTo<string>(desiredState.name) ??
		(typeof desiredState.name === 'string' ? desiredState.name : current.name);
	const desiredDescription =
		getDesiredTo<string | null>(desiredState.description) ??
		(typeof desiredState.description === 'string' || desiredState.description === null
			? (desiredState.description as string | null)
			: current.description);
	const currentTags = current.tags.map((tag) => tag.name);
	const desiredTags = resolveTags(currentTags, desiredState);
	const desiredLanguage = resolveLanguage(current.language, desiredState);

	const matches =
		normalizeText(current.name) === normalizeText(desiredName) &&
		normalizeText(current.description) === normalizeText(desiredDescription ?? '') &&
		tagsEqual(currentTags, desiredTags) &&
		current.language === desiredLanguage;

	if (matches) {
		return { success: true };
	}

	return updateGeneral({
		databaseId,
		cache,
		layer: 'user',
		current,
		input: {
			name: desiredName,
			description: normalizeText(desiredDescription ?? ''),
			tags: desiredTags,
			language: desiredLanguage
		}
	});
}
