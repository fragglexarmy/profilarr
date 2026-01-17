<script lang="ts">
	import { FileText, Folder, Tag, Clock } from 'lucide-svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';

	export let open = false;
</script>

<InfoModal bind:open header="How Rename Works">
	<div class="space-y-6">
				<!-- Overview -->
				<div>
					<h3 class="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">Overview</h3>
					<p class="text-sm text-neutral-600 dark:text-neutral-400">
						The rename feature scans your library and renames files that don't match your
						Radarr/Sonarr naming format. This helps keep your library organized and consistent
						without manual intervention.
					</p>
				</div>

				<!-- Process Steps -->
				<div>
					<h3 class="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">Process</h3>
					<div class="space-y-3">
						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								1
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Fetch Library</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									Gets all movies/series from your arr instance
								</div>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								2
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Filter Items</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									Excludes items with the ignore tag (if configured)
								</div>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								3
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Check Naming</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									Compares current file names against your naming format
								</div>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								4
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Rename Files</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									Triggers rename commands for files that need updating
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Settings Explained -->
				<div>
					<h3 class="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">Settings</h3>
					<div class="space-y-4">
						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"
							>
								<FileText size={16} class="text-amber-600 dark:text-amber-400" />
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Dry Run</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									When enabled, shows what would be renamed without making changes. Use this to
									preview before committing.
								</div>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30"
							>
								<Folder size={16} class="text-purple-600 dark:text-purple-400" />
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Rename Folders</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									Also rename movie/series folders to match the naming format. Requires a metadata
									refresh after completion.
								</div>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30"
							>
								<Tag size={16} class="text-green-600 dark:text-green-400" />
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Ignore Tag</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									Items with this tag in your arr will be skipped. Useful for items you want to keep
									with custom names.
								</div>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
							>
								<Clock size={16} class="text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">Schedule</div>
								<div class="text-sm text-neutral-600 dark:text-neutral-400">
									How often to check for files needing rename. Daily is usually sufficient for most
									libraries.
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
</InfoModal>
