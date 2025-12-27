/**
 * Main orchestrator for processing upgrade configs
 * Coordinates fetching, filtering, selection, and searching
 */

import { RadarrClient } from '$lib/server/utils/arr/clients/radarr.ts';
import type { ArrInstance } from '$lib/server/db/queries/arrInstances.ts';
import type { UpgradeConfig, FilterConfig } from '$lib/shared/filters.ts';
import { evaluateGroup } from '$lib/shared/filters.ts';
import { getSelector } from '$lib/shared/selectors.ts';
import type { UpgradeItem, UpgradeJobLog } from './types.ts';
import { normalizeRadarrItems } from './normalize.ts';
import { filterByCooldown, getTodayTagLabel, applySearchTagToMovies } from './cooldown.ts';
import { logUpgradeRun, logUpgradeStart, logUpgradeError, logUpgradeSkipped } from './logger.ts';

/**
 * Get the next filter to run based on the config's mode
 */
function getNextFilter(config: UpgradeConfig): FilterConfig | null {
	const enabledFilters = config.filters.filter((f) => f.enabled);

	if (enabledFilters.length === 0) {
		return null;
	}

	if (config.filterMode === 'random') {
		const randomIndex = Math.floor(Math.random() * enabledFilters.length);
		return enabledFilters[randomIndex];
	}

	// Round robin
	const index = config.currentFilterIndex % enabledFilters.length;
	return enabledFilters[index];
}

/**
 * Create an empty/skipped job log
 */
function createSkippedLog(
	config: UpgradeConfig,
	instance: ArrInstance,
	reason: string
): UpgradeJobLog {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		configId: config.id ?? 0,
		instanceId: instance.id,
		instanceName: instance.name,
		startedAt: now,
		completedAt: now,
		status: 'skipped',
		config: {
			schedule: config.schedule,
			filterMode: config.filterMode,
			selectedFilter: '',
			dryRun: config.dryRun
		},
		library: {
			totalItems: 0,
			fetchedFromCache: false,
			fetchDurationMs: 0
		},
		filter: {
			name: '',
			rules: { type: 'group', match: 'all', children: [] },
			matchedCount: 0,
			afterCooldown: 0
		},
		selection: {
			method: '',
			requestedCount: 0,
			actualCount: 0,
			items: []
		},
		results: {
			searchesTriggered: 0,
			successful: 0,
			failed: 0,
			errors: [reason]
		}
	};
}

/**
 * Process a single upgrade config for an arr instance
 */
export async function processUpgradeConfig(
	config: UpgradeConfig,
	instance: ArrInstance
): Promise<UpgradeJobLog> {
	const startedAt = new Date();
	const logId = crypto.randomUUID();

	// Get the filter to run
	const filter = getNextFilter(config);

	if (!filter) {
		const log = createSkippedLog(config, instance, 'No enabled filters');
		await logUpgradeSkipped(instance.id, instance.name, 'No enabled filters');
		return log;
	}

	await logUpgradeStart(instance.id, instance.name, filter.name);

	// Create client
	const client = new RadarrClient(instance.url, instance.api_key);

	try {
		// Step 1: Fetch library data
		const fetchStart = Date.now();
		const [movies, profiles] = await Promise.all([
			client.getMovies(),
			client.getQualityProfiles()
		]);

		// Get movie files for movies with files
		const movieIdsWithFiles = movies.filter((m) => m.hasFile).map((m) => m.id);
		const movieFiles = await client.getMovieFiles(movieIdsWithFiles);

		const fetchDurationMs = Date.now() - fetchStart;

		// Create lookup maps
		const movieFileMap = new Map(movieFiles.map((mf) => [mf.movieId, mf]));
		const profileMap = new Map(profiles.map((p) => [p.id, p]));

		// Step 2: Normalize items
		const normalizedItems = normalizeRadarrItems(
			movies,
			movieFileMap,
			profileMap,
			filter.cutoff
		);

		// Step 3: Apply filter rules
		const matchedItems = normalizedItems.filter((item) =>
			evaluateGroup(item as unknown as Record<string, unknown>, filter.group)
		);

		// Step 4: Filter by cooldown
		const tags = await client.getTags();
		const afterCooldown = filterByCooldown(matchedItems, tags, filter.searchCooldown);

		// Step 5: Apply selector
		const selector = getSelector(filter.selector);
		const selectedItems: UpgradeItem[] = selector
			? selector.select(afterCooldown, filter.count)
			: afterCooldown.slice(0, filter.count);

		// Build selection info
		const selectionItems = selectedItems.map((item) => ({
			id: item.id,
			title: item.title
		}));

		// Step 6: Trigger search if we have items (skip if dry run)
		let searchesTriggered = 0;
		let successful = 0;
		let failed = 0;
		const errors: string[] = [];
		const isDryRun = config.dryRun;

		if (selectedItems.length > 0) {
			if (isDryRun) {
				// Dry run - log what would happen without actually doing it
				searchesTriggered = selectedItems.length;
				successful = selectedItems.length;
				errors.push('[DRY RUN] Search and tagging skipped');
			} else {
				try {
					const movieIds = selectedItems.map((item) => item.id);
					await client.searchMovies(movieIds);
					searchesTriggered = movieIds.length;

					// Step 7: Apply search tag
					const tagLabel = getTodayTagLabel();
					const searchTag = await client.getOrCreateTag(tagLabel);
					const tagResult = await applySearchTagToMovies(
						client,
						selectedItems.map((item) => item._raw),
						searchTag.id
					);

					successful = tagResult.success;
					failed = tagResult.failed;
					errors.push(...tagResult.errors);
				} catch (error) {
					failed = selectedItems.length;
					errors.push(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
				}
			}
		}

		// Build the log
		const completedAt = new Date();
		const log: UpgradeJobLog = {
			id: logId,
			configId: config.id ?? 0,
			instanceId: instance.id,
			instanceName: instance.name,
			startedAt: startedAt.toISOString(),
			completedAt: completedAt.toISOString(),
			status: failed > 0 && successful === 0 ? 'failed' : failed > 0 ? 'partial' : 'success',
			config: {
				schedule: config.schedule,
				filterMode: config.filterMode,
				selectedFilter: filter.name,
				dryRun: isDryRun
			},
			library: {
				totalItems: movies.length,
				fetchedFromCache: false, // TODO: implement caching
				fetchDurationMs
			},
			filter: {
				name: filter.name,
				rules: filter.group,
				matchedCount: matchedItems.length,
				afterCooldown: afterCooldown.length
			},
			selection: {
				method: filter.selector,
				requestedCount: filter.count,
				actualCount: selectedItems.length,
				items: selectionItems
			},
			results: {
				searchesTriggered,
				successful,
				failed,
				errors
			}
		};

		await logUpgradeRun(log);
		return log;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		await logUpgradeError(instance.id, instance.name, errorMessage);

		const log = createSkippedLog(config, instance, errorMessage);
		log.id = logId;
		log.startedAt = startedAt.toISOString();
		log.completedAt = new Date().toISOString();
		log.status = 'failed';
		log.config.selectedFilter = filter?.name ?? '';

		return log;
	} finally {
		client.close();
	}
}
