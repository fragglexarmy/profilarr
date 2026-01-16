import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readManifest, type Manifest } from '$lib/server/pcd/manifest.ts';
import { parseMarkdown } from '$utils/markdown/markdown.ts';

export const load: PageServerLoad = async ({ parent }) => {
	const { database } = await parent();

	if (!database.personal_access_token) {
		error(403, 'Config page requires a personal access token');
	}

	let manifest: Manifest | null = null;
	let readmeRaw: string | null = null;
	let readmeHtml: string | null = null;

	try {
		manifest = await readManifest(database.local_path);
	} catch {
		// Manifest might not exist yet
	}

	try {
		readmeRaw = await Deno.readTextFile(`${database.local_path}/README.md`);
		readmeHtml = parseMarkdown(readmeRaw);
	} catch {
		// README might not exist
	}

	return {
		manifest,
		readmeRaw,
		readmeHtml
	};
};
