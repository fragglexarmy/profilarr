// Version is injected at build time from package.json
declare const __APP_VERSION__: string;

export const VERSION = __APP_VERSION__;
export const BUILD_TYPE = import.meta.env.MODE === 'development' ? 'dev' : 'stable';

export function getBuildLabel(): string {
	// Check for custom build type from environment
	const customBuildType = import.meta.env.VITE_BUILD_TYPE as string | undefined;

	if (customBuildType) {
		switch (customBuildType) {
			case 'beta':
				return 'Beta';
			case 'docker':
				return 'Docker';
			case 'dev':
				return 'Develop';
			case 'stable':
			default:
				return 'Stable';
		}
	}

	// Fallback based on Vite mode
	return import.meta.env.MODE === 'development' ? 'Developer Build' : 'Stable';
}

export function getFullVersionString(): string {
	return `Profilarr ${getBuildLabel()} v${VERSION}`;
}
