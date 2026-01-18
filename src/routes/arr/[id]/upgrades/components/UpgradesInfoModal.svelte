<script lang="ts">
	import InfoModal from '$ui/modal/InfoModal.svelte';

	export let open: boolean = false;
</script>

<InfoModal bind:open header="How Upgrades Work">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Why is this needed?</div>
			<div class="mt-1 space-y-2">
				<p>
					*arr apps only upgrade via RSS feeds, which are incremental and only show what's new. RSS
					doesn't search for the best available release — it just grabs whatever comes through.
				</p>
				<p>
					This module lets you define exactly what to upgrade, when, and how — all within Profilarr.
				</p>
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Core Settings</div>
			<div class="mt-1">
				Configure the basic behavior: set how often it runs and choose how to cycle through your
				filters (round robin or random shuffle).
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Filters</div>
			<div class="mt-1">
				Define which items to consider for upgrades. Create multiple named filters with different
				criteria (e.g., "Marvel Movies", "2024 Releases", "Low Quality"). Each filter can have
				complex rules with AND/OR logic and nested groups.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Filter Mode</div>
			<div class="mt-1 space-y-1">
				<p><strong>Round Robin:</strong> Cycle through filters in order, one per run.</p>
				<p>
					<strong>Random Shuffle:</strong> Randomly shuffle filters, use each once before repeating.
				</p>
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Selection</div>
			<div class="mt-1">
				Each filter has its own selection settings. Choose how to pick items for upgrade (e.g.,
				random) and how many items to process per run. This prevents overwhelming your indexers with
				too many searches at once.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">How it runs</div>
			<div class="mt-1">
				On each scheduled run: pick a filter (based on mode) → apply filter rules to your library →
				select items (based on selection method) → trigger searches in your *arr app.
			</div>
		</div>
	</div>
</InfoModal>
