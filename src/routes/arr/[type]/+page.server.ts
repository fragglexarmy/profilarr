import { error, redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';

// Valid arr types
const VALID_TYPES = ['radarr', 'sonarr', 'lidarr', 'chaptarr'];

export const load: ServerLoad = ({ params }) => {
	const type = params.type;

	// Validate type
	if (!type || !VALID_TYPES.includes(type)) {
		error(404, `Invalid arr type: ${type}`);
	}

	// Fetch instances for this type
	const instances = arrInstancesQueries.getByType(type);

	// If instances exist, redirect to the first one
	if (instances.length > 0) {
		redirect(302, `/arr/${type}/${instances[0].id}`);
	}

	// If no instances, continue to show the page
	return {
		type,
		instances
	};
};
