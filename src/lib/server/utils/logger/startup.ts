/**
 * Startup banner and logging
 */

import { config } from '$config';
import { appInfoQueries } from '$db/queries/appInfo.ts';

const BANNER = String.raw`
                     _____.__.__
_____________  _____/ ____\__|  | _____ ______________
\____ \_  __ \/  _ \   __\|  |  | \__  \\_  __ \_  __ \
|  |_> >  | \(  <_> )  |  |  |  |__/ __ \|  | \/|  | \/
|   __/|__|   \____/|__|  |__|____(____  /__|   |__|
|__|                                   \/
`;

export function printBanner(): void {
	const version = appInfoQueries.getVersion();
	const url = config.serverUrl;

	console.log(BANNER);
	console.log(`  v${version}  |  ${url}`);
	console.log();
}

export interface ServerInfo {
	version: string;
	env: string;
	timezone: string;
	basePath: string;
	hostname: string;
}

export function getServerInfo(): ServerInfo {
	return {
		version: appInfoQueries.getVersion(),
		env: Deno.env.get('DENO_ENV') || 'production',
		timezone: config.timezone,
		basePath: config.paths.base,
		hostname: typeof Deno !== 'undefined' ? Deno.hostname() : 'unknown'
	};
}
