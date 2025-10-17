/**
 * Startup banner and logging
 */

import { logger } from './logger.ts';

const BANNER = String.raw`
                     _____.__.__
_____________  _____/ ____\__|  | _____ ______________
\____ \_  __ \/  _ \   __\|  |  | \__  \\_  __ \_  __ \
|  |_> >  | \(  <_> )  |  |  |  |__/ __ \|  | \/|  | \/
|   __/|__|   \____/|__|  |__|____(____  /__|   |__|
|__|                                   \/
`;

export async function logStartup(): Promise<void> {
	// Print banner (not logged to file, just console)
	console.log(BANNER);

	// Log startup info
	await logger.info('Server started');

	// Log environment
	const env = Deno.env.get('NODE_ENV') || Deno.env.get('DENO_ENV') || 'development';
	await logger.info(`Environment: ${env}`);
}
