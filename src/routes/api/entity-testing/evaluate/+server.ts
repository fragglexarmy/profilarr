/**
 * API endpoint for parsing and evaluating release titles against custom formats
 * Used by entity testing to get CF matches for scoring
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pcdManager } from '$pcd/pcd.ts';
import { parseWithCacheBatch, isParserHealthy } from '$lib/server/utils/arr/parser/index.ts';
import type { ParseResult, MediaType } from '$lib/server/utils/arr/parser/types.ts';
import { getAllConditionsForEvaluation } from '$pcd/queries/customFormats/allConditions.ts';
import { evaluateCustomFormat, getParsedInfo, type ParsedInfo } from '$pcd/queries/customFormats/evaluator.ts';

export interface ReleaseEvaluation {
	releaseId: number;
	title: string;
	parsed: ParsedInfo | null;
	/** Map of custom format ID to whether it matches */
	cfMatches: Record<number, boolean>;
}

export interface EvaluateResponse {
	parserAvailable: boolean;
	evaluations: ReleaseEvaluation[];
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { databaseId, releases } = body as {
		databaseId: number;
		releases: Array<{ id: number; title: string; type: MediaType }>;
	};

	if (!databaseId) {
		throw error(400, 'Missing databaseId');
	}

	if (!releases || !Array.isArray(releases) || releases.length === 0) {
		throw error(400, 'Missing or empty releases array');
	}

	// Check parser health
	const parserAvailable = await isParserHealthy();
	if (!parserAvailable) {
		return json({
			parserAvailable: false,
			evaluations: releases.map((r) => ({
				releaseId: r.id,
				title: r.title,
				parsed: null,
				cfMatches: {}
			}))
		} satisfies EvaluateResponse);
	}

	// Get the PCD cache
	const cache = pcdManager.getCache(databaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	// Parse all releases in batch (uses cache)
	const parseItems = releases.map((r) => ({ title: r.title, type: r.type }));
	const parseResults = await parseWithCacheBatch(parseItems);

	// Get all custom formats with conditions
	const customFormats = await getAllConditionsForEvaluation(cache);

	// Evaluate each release against all custom formats
	const evaluations: ReleaseEvaluation[] = releases.map((release) => {
		const cacheKey = `${release.title}:${release.type}`;
		const parsed = parseResults.get(cacheKey);

		if (!parsed) {
			return {
				releaseId: release.id,
				title: release.title,
				parsed: null,
				cfMatches: {}
			};
		}

		// Evaluate against all custom formats
		const cfMatches: Record<number, boolean> = {};
		for (const cf of customFormats) {
			if (cf.conditions.length === 0) {
				// No conditions = doesn't match
				cfMatches[cf.id] = false;
				continue;
			}

			const result = evaluateCustomFormat(cf.conditions, parsed, release.title);
			cfMatches[cf.id] = result.matches;
		}

		return {
			releaseId: release.id,
			title: release.title,
			parsed: getParsedInfo(parsed),
			cfMatches
		};
	});

	return json({
		parserAvailable: true,
		evaluations
	} satisfies EvaluateResponse);
};
