/**
 * Application configuration singleton
 */

class Config {
	private basePath: string;

	constructor() {
		// Default base path logic:
		// 1. Check environment variable
		// 2. Fall back to /app (Docker default)
		this.basePath = Deno.env.get('APP_BASE_PATH') || '/app';
	}

	/**
	 * Initialize the configuration (create directories)
	 * Must be called before using the config
	 */
	async init(): Promise<void> {
		await Deno.mkdir(this.paths.logs, { recursive: true });
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
		}
	};
}

export const config = new Config();
