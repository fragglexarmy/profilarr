/**
 * Application configuration singleton
 */

class Config {
	private basePath: string;
	public readonly timezone: string;

	constructor() {
		// Default base path logic:
		// 1. Check environment variable
		// 2. Fall back to /app (Docker default)
		this.basePath = Deno.env.get('APP_BASE_PATH') || '/app';

		// Timezone configuration:
		// 1. Check TZ environment variable
		// 2. Fall back to system timezone
		this.timezone = Deno.env.get('TZ') || Intl.DateTimeFormat().resolvedOptions().timeZone;
	}

	/**
	 * Initialize the configuration (create directories)
	 * Must be called before using the config
	 */
	async init(): Promise<void> {
		await Deno.mkdir(this.paths.logs, { recursive: true });
		await Deno.mkdir(this.paths.data, { recursive: true });
		await Deno.mkdir(this.paths.backups, { recursive: true });
	}

	/**
	 * Set the base path for the application
	 */
	setBasePath(path: string): void {
		this.basePath = path;
	}

	/**
	 * Application paths (relative to base)
	 */
	readonly paths = {
		get base(): string {
			return config.basePath;
		},
		get logs(): string {
			return `${config.basePath}/logs`;
		},
		get logFile(): string {
			return `${config.basePath}/logs/app.log`;
		},
		get data(): string {
			return `${config.basePath}/data`;
		},
		get database(): string {
			return `${config.basePath}/data/profilarr.db`;
		},
		get backups(): string {
			return `${config.basePath}/backups`;
		}
	};
}

export const config = new Config();
