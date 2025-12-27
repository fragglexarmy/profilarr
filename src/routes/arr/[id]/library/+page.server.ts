import { error, redirect } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { cache } from '$cache/cache.ts';

export const load: ServerLoad = async ({ params }) => {
	const id = parseInt(params.id || '', 10);

	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	return {
		instance
	};
};

export const actions: Actions = {
	delete: ({ params }) => {
		const id = parseInt(params.id || '', 10);
		if (!isNaN(id)) {
			arrInstancesQueries.delete(id);
			cache.delete(`library:${id}`);
		}
		redirect(303, '/arr');
	}
};
