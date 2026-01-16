/**
 * PCD README Handler
 * Handles reading and writing README.md files for PCD repositories
 */

import { logger } from '$logger/logger.ts';

/**
 * Read README from a PCD repository
 */
export async function readReadme(pcdPath: string): Promise<string | null> {
	try {
		return await Deno.readTextFile(`${pcdPath}/README.md`);
	} catch {
		return null;
	}
}

/**
 * Write README to a PCD repository
 */
export async function writeReadme(pcdPath: string, content: string): Promise<void> {
	await Deno.writeTextFile(`${pcdPath}/README.md`, content);
	await logger.info('Wrote README', {
		source: 'PCDReadme',
		meta: { path: pcdPath, content }
	});
}
