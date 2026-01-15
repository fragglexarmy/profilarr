<script lang="ts">
	import { navIconStore, type NavIconStyle } from '$stores/navIcons';
	import { Check } from 'lucide-svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';

	let useEmojis = $derived($navIconStore === 'emoji');

	function toggle() {
		navIconStore.toggle();
	}
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
			Interface
		</h2>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Customize the look and feel of the application
		</p>
	</div>

	<!-- Settings -->
	<div class="p-6">
		<div class="space-y-3">
			<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Navigation</h3>
			<div class="space-y-2">
				<div class="flex items-center gap-3">
					<IconCheckbox
						icon={Check}
						checked={useEmojis}
						onclick={toggle}
					/>
					<button
						type="button"
						class="flex-1 text-left"
						onclick={toggle}
					>
						<span class="text-sm font-medium text-neutral-900 dark:text-neutral-50">
							Use Emojis
						</span>
						<p class="text-xs text-neutral-500 dark:text-neutral-400">
							Show emojis instead of icons in the sidebar navigation
						</p>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
