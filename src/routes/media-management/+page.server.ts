import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/index.ts';

export const load: ServerLoad = ({ url }) => {
	// Get all databases
	const databases = pcdManager.getAll();

	// Check for section query param (naming, media-settings, quality-definitions)
	const section = url.searchParams.get('section') || 'naming';

	// If there are databases, redirect to the first one's requested section
	if (databases.length > 0) {
		throw redirect(303, `/media-management/${databases[0].id}/${section}`);
	}

	// If no databases, return empty array (page will show empty state)
	return {
		databases
	};
};
