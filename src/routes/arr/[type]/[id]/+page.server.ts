import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';

// Valid arr types
const VALID_TYPES = ['radarr', 'sonarr', 'lidarr', 'chaptarr'];

export const load: ServerLoad = ({ params }) => {
	const type = params.type;
	const id = parseInt(params.id || '', 10);

	// Validate type
	if (!type || !VALID_TYPES.includes(type)) {
		error(404, `Invalid arr type: ${type}`);
	}

	// Validate ID
	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	// Fetch the specific instance
	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	// Verify instance type matches route type
	if (instance.type !== type) {
		error(404, `Instance ${id} is not a ${type} instance`);
	}

	// Fetch all instances of this type for the tabs
	const allInstances = arrInstancesQueries.getByType(type);

	return {
		type,
		instance,
		allInstances
	};
};
