<script lang="ts">
	import { getBuildLabel, VERSION } from '$server/version';
	import { Package } from 'lucide-svelte';

	const buildLabel = getBuildLabel();
</script>

<div class="p-4">
	<div
		class="flex items-center gap-2.5 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 "
	>
		<div
			class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-neutral-200 dark:bg-neutral-700"
		>
			<Package class="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
		</div>

		<div class="flex-1">
			<div class="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-50">profilarr</div>
			<div class="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">
				{buildLabel} · v{VERSION}
			</div>
		</div>
	</div>
</div>
