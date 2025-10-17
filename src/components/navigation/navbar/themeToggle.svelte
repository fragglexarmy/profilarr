<script lang="ts">
	import { themeStore } from '$stores/theme.ts';
	import { Moon, Sun } from 'lucide-svelte';

	$: isDark = $themeStore === 'dark';
</script>

<button
	on:click={() => themeStore.toggle()}
	class="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
	aria-label="Toggle theme"
>
	<!-- Sun icon (visible in dark mode) -->
	<div
		class="absolute transition-all duration-300 {isDark
			? 'rotate-0 scale-100 opacity-100'
			: 'rotate-180 scale-75 opacity-0'}"
	>
		<Sun class="h-[18px] w-[18px] text-neutral-700 dark:text-neutral-300" />
	</div>

	<!-- Moon icon (visible in light mode) -->
	<div
		class="absolute transition-all duration-300 {isDark
			? '-rotate-180 scale-75 opacity-0'
			: 'rotate-0 scale-100 opacity-100'}"
	>
		<Moon class="h-[18px] w-[18px] text-neutral-700 dark:text-neutral-300" />
	</div>
</button>
