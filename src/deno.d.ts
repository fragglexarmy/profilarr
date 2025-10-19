/**
 * Deno global type declarations for SvelteKit project
 */

declare namespace Deno {
	export const env: {
		get(key: string): string | undefined;
	};

	export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;

	export function writeTextFile(
		path: string,
		data: string,
		options?: { append?: boolean }
	): Promise<void>;
}
