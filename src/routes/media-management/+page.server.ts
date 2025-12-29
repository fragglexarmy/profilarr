import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';

export const load: ServerLoad = () => {
	// Get all databases
	const databases = pcdManager.getAll();

	// If there are databases, redirect to the first one's radarr page
	if (databases.length > 0) {
		throw redirect(303, `/media-management/${databases[0].id}/radarr`);
	}

	// If no databases, return empty array (page will show empty state)
	return {
		databases
	};
};
