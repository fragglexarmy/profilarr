/**
 * Cron utility functions for sync scheduling
 */

import { Cron } from 'croner';

/**
 * Calculate the next run time from a cron expression
 */
export function calculateNextRun(cronExpr: string | null): string | null {
	if (!cronExpr) return null;
	try {
		const cron = new Cron(cronExpr);
		const nextRun = cron.nextRun();
		return nextRun?.toISOString() ?? null;
	} catch {
		return null;
	}
}
