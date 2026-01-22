/**
 * Core sync logic for syncing PCD profiles to arr instances
 * Delegates to the sync processor module
 */

import { processPendingSyncs, type ProcessSyncsResult } from '$lib/server/sync/index.ts';

/**
 * Outcome of a sync operation
 * - success: All syncs completed successfully
 * - partial: Some syncs succeeded, some failed
 * - failed: All syncs failed
 * - skipped: No syncs were pending
 */
export type SyncOutcome = 'success' | 'partial' | 'failed' | 'skipped';

export interface SyncStatus {
	instanceId: number;
	instanceName: string;
	section: 'qualityProfiles' | 'delayProfiles' | 'mediaManagement';
	success: boolean;
	error?: string;
}

export interface SyncArrResult {
	outcome: SyncOutcome;
	totalProcessed: number;
	successCount: number;
	failureCount: number;
	syncs: SyncStatus[];
}

/**
 * Process all pending syncs
 * Delegates to processPendingSyncs and transforms result to job-expected format
 */
export async function syncArr(): Promise<SyncArrResult> {
	const result = await processPendingSyncs();
	return transformResult(result);
}

/**
 * Transform ProcessSyncsResult to SyncArrResult for job compatibility
 */
function transformResult(result: ProcessSyncsResult): SyncArrResult {
	const syncs: SyncStatus[] = [];
	let successCount = 0;
	let failureCount = 0;

	for (const instanceResult of result.results) {
		// Quality profiles
		if (instanceResult.qualityProfiles) {
			const qp = instanceResult.qualityProfiles;
			syncs.push({
				instanceId: instanceResult.instanceId,
				instanceName: instanceResult.instanceName,
				section: 'qualityProfiles',
				success: qp.success,
				error: qp.error
			});
			if (qp.success) successCount++;
			else failureCount++;
		}

		// Delay profiles
		if (instanceResult.delayProfiles) {
			const dp = instanceResult.delayProfiles;
			syncs.push({
				instanceId: instanceResult.instanceId,
				instanceName: instanceResult.instanceName,
				section: 'delayProfiles',
				success: dp.success,
				error: dp.error
			});
			if (dp.success) successCount++;
			else failureCount++;
		}

		// Media management
		if (instanceResult.mediaManagement) {
			const mm = instanceResult.mediaManagement;
			syncs.push({
				instanceId: instanceResult.instanceId,
				instanceName: instanceResult.instanceName,
				section: 'mediaManagement',
				success: mm.success,
				error: mm.error
			});
			if (mm.success) successCount++;
			else failureCount++;
		}
	}

	// Determine outcome based on success/failure counts
	const outcome = determineOutcome(syncs.length, successCount, failureCount);

	return {
		outcome,
		totalProcessed: syncs.length,
		successCount,
		failureCount,
		syncs
	};
}

/**
 * Determine the outcome based on counts
 */
function determineOutcome(total: number, success: number, failure: number): SyncOutcome {
	if (total === 0) return 'skipped';
	if (failure === 0) return 'success';
	if (success === 0) return 'failed';
	return 'partial';
}
