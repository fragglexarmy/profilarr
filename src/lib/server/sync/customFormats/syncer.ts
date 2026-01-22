/**
 * Custom format syncer
 * Syncs custom formats from PCD to arr instances
 *
 * This is a helper syncer used by quality profiles - custom formats must be
 * synced before quality profiles since profiles reference format IDs.
 */

import type { BaseArrClient } from '$arr/base.ts';
import { logger } from '$logger/logger.ts';
import type { SyncArrType } from '../mappings.ts';
import { transformCustomFormat, type PcdCustomFormat } from './transformer.ts';

/**
 * Sync custom formats to an arr instance
 * Returns a map of format name -> arr format ID
 */
export async function syncCustomFormats(
	client: BaseArrClient,
	instanceId: number,
	instanceType: SyncArrType,
	pcdFormats: Map<string, PcdCustomFormat>
): Promise<Map<string, number>> {
	// Get existing formats from arr
	const existingFormats = await client.getCustomFormats();
	const existingMap = new Map(existingFormats.map((f) => [f.name, f.id!]));

	for (const pcdFormat of pcdFormats.values()) {
		const arrFormat = transformCustomFormat(pcdFormat, instanceType);

		await logger.debug(`Compiled custom format "${arrFormat.name}"`, {
			source: 'Compile:CustomFormat',
			meta: {
				instanceId,
				format: arrFormat
			}
		});

		try {
			if (existingMap.has(arrFormat.name)) {
				// Update existing
				const existingId = existingMap.get(arrFormat.name)!;
				arrFormat.id = existingId;
				await client.updateCustomFormat(existingId, arrFormat);
				await logger.debug(`Updated custom format "${arrFormat.name}"`, {
					source: 'Sync:CustomFormats',
					meta: { instanceId, formatId: existingId }
				});
			} else {
				// Create new
				const response = await client.createCustomFormat(arrFormat);
				existingMap.set(arrFormat.name, response.id!);
				await logger.debug(`Created custom format "${arrFormat.name}"`, {
					source: 'Sync:CustomFormats',
					meta: { instanceId, formatId: response.id }
				});
			}
		} catch (error) {
			const errorDetails = extractErrorDetails(error);
			await logger.error(`Failed to sync custom format "${arrFormat.name}"`, {
				source: 'Sync:CustomFormats',
				meta: {
					instanceId,
					formatName: arrFormat.name,
					request: arrFormat,
					...errorDetails
				}
			});
		}
	}

	// Refresh format map from arr to get accurate IDs
	const refreshedFormats = await client.getCustomFormats();
	const formatIdMap = new Map<string, number>();
	for (const format of refreshedFormats) {
		formatIdMap.set(format.name, format.id!);
	}

	return formatIdMap;
}

/**
 * Extract error details from HTTP errors for logging
 */
function extractErrorDetails(error: unknown): Record<string, unknown> {
	const details: Record<string, unknown> = {
		error: error instanceof Error ? error.message : 'Unknown error'
	};

	if (error && typeof error === 'object') {
		const err = error as Record<string, unknown>;
		if ('status' in err) details.status = err.status;
		if ('statusText' in err) details.statusText = err.statusText;
		if ('response' in err) details.response = err.response;
		if ('body' in err) details.responseBody = err.body;
		if ('data' in err) details.responseData = err.data;
		if (err.cause) details.cause = err.cause;
	}

	return details;
}
