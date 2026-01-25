import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = ({ params }) => {
	// Redirect to the settings tab by default
	redirect(302, `/arr/${params.id}/settings`);
};
