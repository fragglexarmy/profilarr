/**
 * Deno global type declarations for SvelteKit project
 */

/** App version injected at build time */
declare const __APP_VERSION__: string;

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

	export interface HttpClient {
		close(): void;
	}

	export interface CreateHttpClientOptions {
		poolMaxIdlePerHost?: number;
		poolIdleTimeout?: number;
	}

	export function createHttpClient(options?: CreateHttpClientOptions): HttpClient;

	export interface DirEntry {
		name: string;
		isFile: boolean;
		isDirectory: boolean;
		isSymlink: boolean;
	}

	export function readDir(path: string): AsyncIterable<DirEntry>;
}
