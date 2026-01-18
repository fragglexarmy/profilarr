import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { readFilteredLogs } from '$logger/reader.ts';
import type { UpgradeJobLog } from '$lib/server/upgrades/types.ts';

/**
 * Extract UpgradeJobLog from a DEBUG log entry
 * DEBUG logs contain the full structured log in the meta field
 */
function extractUpgradeJobLog(meta: unknown): UpgradeJobLog | null {
	if (!meta || typeof meta !== 'object') return null;

	const log = meta as Record<string, unknown>;

	// Check for required UpgradeJobLog fields
	if (
		typeof log.id === 'string' &&
		typeof log.instanceId === 'number' &&
		typeof log.status === 'string' &&
		log.config &&
		log.library &&
		log.filter &&
		log.selection &&
		log.results
	) {
		return log as unknown as UpgradeJobLog;
	}

	return null;
}

export const load: ServerLoad = async ({ params }) => {
	const id = parseInt(params.id || '', 10);

	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	// Load upgrade job logs for this instance
	const logs = await readFilteredLogs({
		source: 'UpgradeJob',
		instanceId: id
	});

	// Extract full UpgradeJobLog objects from DEBUG entries
	const upgradeRuns: UpgradeJobLog[] = [];
	const seenIds = new Set<string>();

	for (const log of logs) {
		if (log.level === 'DEBUG' && log.meta) {
			const upgradeLog = extractUpgradeJobLog(log.meta);
			if (upgradeLog && !seenIds.has(upgradeLog.id)) {
				seenIds.add(upgradeLog.id);
				upgradeRuns.push(upgradeLog);
			}
		}
	}

	// Sort by startedAt (newest first)
	upgradeRuns.sort(
		(a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
	);

	return {
		instance,
		logs,
		upgradeRuns
	};
};
