import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { validateRegex } from '$lib/server/utils/arr/parser/index.ts';
import type { components } from '$api/v1.d.ts';

type ValidateRegexRequest = components['schemas']['ValidateRegexRequest'];
type ValidateRegexResponse = components['schemas']['ValidateRegexResponse'];

export const POST: RequestHandler = async ({ request }) => {
	const { pattern }: ValidateRegexRequest = await request.json();

	if (!pattern?.trim()) {
		return json({ valid: false, error: 'Pattern is required' } satisfies ValidateRegexResponse);
	}

	const result = await validateRegex(pattern.trim());

	if (result === null) {
		// Parser offline — don't block saves
		return json({ valid: true, available: false } satisfies ValidateRegexResponse);
	}

	return json({ ...result, available: true } satisfies ValidateRegexResponse);
};
