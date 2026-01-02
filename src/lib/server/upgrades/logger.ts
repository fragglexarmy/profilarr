/**
 * Structured logging for upgrade jobs
 * Uses the shared logger with source 'UpgradeJob'
 */

import { logger } from '$logger/logger.ts';
import type { UpgradeJobLog } from './types.ts';

const SOURCE = 'UpgradeJob';

/**
 * Log an upgrade run with structured data
 * Logs info summary and debug with full details
 */
export async function logUpgradeRun(log: UpgradeJobLog): Promise<void> {
	// Build summary message
	const statusEmoji = log.status === 'success' ? '✓' : log.status === 'partial' ? '~' : '✗';
	const duration = new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime();

	const summary = `[${statusEmoji}] ${log.instanceName}: ${log.filter.name} - ${log.selection.actualCount}/${log.selection.requestedCount} items searched (${duration}ms)`;

	// Log debug with key metrics
	await logger.debug(summary, {
		source: SOURCE,
		meta: {
			instanceId: log.instanceId,
			configId: log.configId,
			status: log.status,
			matchedCount: log.filter.matchedCount,
			afterCooldown: log.filter.afterCooldown,
			searchedCount: log.selection.actualCount,
			durationMs: duration
		}
	});
}

/**
 * Log when an upgrade config is skipped
 */
export async function logUpgradeSkipped(
	instanceId: number,
	instanceName: string,
	reason: string
): Promise<void> {
	await logger.debug(`Skipped ${instanceName}: ${reason}`, {
		source: SOURCE,
		meta: { instanceId, reason }
	});
}

/**
 * Log when upgrade processing starts
 */
export async function logUpgradeStart(
	instanceId: number,
	instanceName: string,
	filterName: string
): Promise<void> {
	await logger.debug(`Starting upgrade for ${instanceName} with filter "${filterName}"`, {
		source: SOURCE,
		meta: { instanceId, filterName }
	});
}

/**
 * Log errors during upgrade processing
 */
export async function logUpgradeError(
	instanceId: number,
	instanceName: string,
	error: string
): Promise<void> {
	await logger.error(`Upgrade failed for ${instanceName}: ${error}`, {
		source: SOURCE,
		meta: { instanceId, error }
	});
}
