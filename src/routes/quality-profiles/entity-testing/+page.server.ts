import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';

export const load: ServerLoad = () => {
	// Get all databases
	const databases = pcdManager.getAll();

	// If there are databases, redirect to the first one
	if (databases.length > 0) {
		throw redirect(303, `/quality-profiles/entity-testing/${databases[0].id}`);
	}

	// If no databases, return empty array (page will show empty state)
	return {
		databases
	};
};
