import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

// Valid arr types
const VALID_TYPES = ['radarr', 'sonarr', 'lidarr', 'chaptarr'];

export const load: ServerLoad = ({ params }) => {
	const type = params.type;

	// Validate type
	if (!type || !VALID_TYPES.includes(type)) {
		error(404, `Invalid arr type: ${type}`);
	}

	return {
		type
	};
};
