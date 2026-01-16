import { redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { cache } from '$cache/cache.ts';

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
