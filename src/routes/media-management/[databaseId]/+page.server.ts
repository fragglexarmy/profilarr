import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ params }) => {
	// Redirect to radarr by default
	throw redirect(303, `/media-management/${params.databaseId}/radarr`);
};
