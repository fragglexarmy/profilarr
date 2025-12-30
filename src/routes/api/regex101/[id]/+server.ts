import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$logger/logger';
import { regex101CacheQueries } from '$db/queries/regex101Cache.ts';

export interface Regex101UnitTest {
	description: string;
	testString: string;
	criteria: 'DOES_MATCH' | 'DOES_NOT_MATCH';
	actual?: boolean;
	passed?: boolean;
}

export interface Regex101Response {
	permalinkFragment: string;
	version: number;
	regex: string;
	flags: string;
	flavor: string;
	unitTests: Regex101UnitTest[];
}

/**
 * Run regex tests using PowerShell (.NET regex engine)
 */
async function runRegexTests(
	pattern: string,
	tests: Regex101UnitTest[]
): Promise<Regex101UnitTest[]> {
	if (tests.length === 0) return tests;

	try {
		const scriptPath = `${Deno.cwd()}/src/lib/server/regex/test.ps1`;
		const testsJson = JSON.stringify(tests.map(t => ({
			testString: t.testString,
			criteria: t.criteria
		})));

		const command = new Deno.Command('pwsh', {
			args: ['-NoProfile', '-NonInteractive', '-File', scriptPath, '-Pattern', pattern, '-TestsJson', testsJson],
			stdout: 'piped',
			stderr: 'piped'
		});

		const { code, stdout, stderr } = await command.output();

		if (code !== 0) {
			const errorText = new TextDecoder().decode(stderr);
			await logger.error('PowerShell regex test failed', {
				source: 'Regex101API',
				meta: { error: errorText, pattern }
			});
			return tests; // Return tests without pass/fail info
		}

		const outputText = new TextDecoder().decode(stdout).trim();
		await logger.debug('PowerShell output', {
			source: 'Regex101API',
			meta: { output: outputText }
		});
		const result = JSON.parse(outputText);

		if (!result.success) {
			await logger.error('PowerShell regex test error', {
				source: 'Regex101API',
				meta: { error: result.error }
			});
			return tests;
		}

		// Merge results back into tests
		return tests.map((test, idx) => ({
			...test,
			actual: result.results[idx]?.actual ?? undefined,
			passed: result.results[idx]?.passed ?? undefined
		}));
	} catch (err) {
		await logger.error('Failed to run regex tests', {
			source: 'Regex101API',
			meta: { error: String(err) }
		});
		return tests; // Return tests without pass/fail info on error
	}
}

export const GET: RequestHandler = async ({ params, fetch }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Missing regex101 ID');
	}

	// Check cache first
	const cached = regex101CacheQueries.get(id);
	if (cached) {
		await logger.debug('regex101 cache hit', {
			source: 'Regex101API',
			meta: { id }
		});
		return json(JSON.parse(cached.response));
	}

	await logger.debug('regex101 cache miss', {
		source: 'Regex101API',
		meta: { id }
	});

	// Handle ID with optional version (e.g., "ABC123" or "ABC123/1")
	const [regexId, version] = id.split('/');

	try {
		const url = version
			? `https://regex101.com/api/regex/${regexId}/${version}`
			: `https://regex101.com/api/regex/${regexId}`;

		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Profilarr/1.0'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Regex not found on regex101');
			}
			throw error(response.status, `Failed to fetch from regex101: ${response.statusText}`);
		}

		const data = await response.json();
		await logger.debug('regex101 API response', {
			source: 'Regex101API',
			meta: data
		});

		// Extract unit tests
		const unitTests: Regex101UnitTest[] = (data.unitTests || []).map((test: Record<string, unknown>) => ({
			description: test.description || '',
			testString: test.testString || '',
			criteria: (test.criteria as string) || 'DOES_MATCH'
		}));

		// Run tests through PowerShell to get pass/fail results
		const testedUnitTests = await runRegexTests(data.regex, unitTests);

		const result: Regex101Response = {
			permalinkFragment: data.permalinkFragment,
			version: data.version,
			regex: data.regex,
			flags: data.flags || '',
			flavor: data.flavor || 'pcre2',
			unitTests: testedUnitTests
		};

		// Cache the result
		regex101CacheQueries.set(id, JSON.stringify(result));

		return json(result);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, `Failed to fetch regex101 data: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
