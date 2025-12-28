/**
 * AI client for OpenAI-compatible APIs
 */

import { aiSettingsQueries } from '$db/queries/aiSettings.ts';
import { logger } from '$logger/logger.ts';

interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface ChatCompletionResponse {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
	output?: Array<{
		type: string;
		content?: Array<{
			type: string;
			text?: string;
		}>;
	}>;
}

/**
 * Check if AI is enabled and configured
 */
export function isAIEnabled(): boolean {
	const settings = aiSettingsQueries.get();
	return settings?.enabled === 1 && !!settings.api_url && !!settings.model;
}

/**
 * Generate a commit message from a diff
 */
export async function generateCommitMessage(diff: string): Promise<string> {
	const settings = aiSettingsQueries.get();

	if (!settings || settings.enabled !== 1) {
		throw new Error('AI is not enabled');
	}

	const systemPrompt = `Generate a git commit message for database operation files.

File format: "N.operation-entity-name.sql" where operation is create/update/delete.

Commit format: "type(entity): name"

Types:
- create → create
- update → tweak
- delete → remove

Entity types: custom-format, quality-profile, delay-profile, tag

Examples:
- File "1.create-custom_format-HDR.sql" → "create(custom-format): HDR"
- File "2.update-quality_profile-HD.sql" → "tweak(quality-profile): HD"
- File "3.delete-delay_profile-test.sql" → "remove(delay-profile): test"

For multiple files, combine: "create(custom-format): HDR, DV" or list operations.

Output only the commit message, max 72 chars.`;

	const userPrompt = diff;

	// Use Responses API for GPT-5 models, Chat Completions for others
	const isGpt5 = settings.model.startsWith('gpt-5');

	let response: Response;

	if (isGpt5) {
		// Responses API (recommended for GPT-5)
		response = await fetch(`${settings.api_url}/responses`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(settings.api_key ? { 'Authorization': `Bearer ${settings.api_key}` } : {})
			},
			body: JSON.stringify({
				model: settings.model,
				instructions: systemPrompt,
				input: userPrompt,
				text: { verbosity: 'low' }
			})
		});
	} else {
		// Chat Completions API (for other models)
		const messages: ChatMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		];

		response = await fetch(`${settings.api_url}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(settings.api_key ? { 'Authorization': `Bearer ${settings.api_key}` } : {})
			},
			body: JSON.stringify({
				model: settings.model,
				messages,
				max_tokens: 100,
				temperature: 0.3
			})
		});
	}

	if (!response.ok) {
		const text = await response.text();
		await logger.error('AI request failed', {
			source: 'ai/client',
			meta: { status: response.status, error: text }
		});
		throw new Error(`AI request failed: ${response.status} ${text}`);
	}

	const data = await response.json() as ChatCompletionResponse;

	await logger.debug('AI response received', {
		source: 'ai/client',
		meta: { response: JSON.stringify(data) }
	});

	// Handle Responses API format
	if (data.output) {
		const textOutput = data.output.find(o => o.type === 'message');
		const textContent = textOutput?.content?.find(c => c.type === 'output_text');
		if (textContent?.text) {
			return textContent.text.trim();
		}
	}

	// Handle Chat Completions API format
	if (data.choices?.[0]?.message?.content) {
		return data.choices[0].message.content.trim();
	}

	await logger.error('Invalid AI response structure', {
		source: 'ai/client',
		meta: { response: JSON.stringify(data) }
	});
	throw new Error('Invalid response from AI');
}
