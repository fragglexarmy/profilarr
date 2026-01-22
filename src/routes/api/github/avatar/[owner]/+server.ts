import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCachedAvatar } from '$lib/server/utils/github/cache.ts';

export const GET: RequestHandler = async ({ params }) => {
	const { owner } = params;

	if (!owner) {
		throw error(400, 'Missing owner parameter');
	}

	const dataUrl = await getCachedAvatar(owner);

	if (!dataUrl) {
		throw error(404, 'Avatar not found');
	}

	// Parse the data URL to extract content type and base64 data
	const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
	if (!match) {
		throw error(500, 'Invalid cached avatar data');
	}

	const [, contentType, base64Data] = match;

	// Convert base64 to binary
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return new Response(bytes, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=86400' // 24 hours browser cache
		}
	});
};
