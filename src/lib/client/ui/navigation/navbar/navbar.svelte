<script lang="ts">
	import AccentPicker from './accentPicker.svelte';
	import ThemeToggle from './themeToggle.svelte';
	import logo from '$assets/logo-firefox-circular-arrow.png';

	export let collapsed: boolean = false;
</script>

<nav
	class="fixed top-0 left-0 z-50 w-72 border-b border-r border-neutral-200 bg-neutral-50 transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-900"
	class:-translate-x-[calc(100%-24px)]={collapsed}
>
	<div class="flex items-center justify-between px-4 py-4">
		<!-- Left: Brand name with logo -->
		<div class="flex items-center gap-2 ml-4">
			<img src={logo} alt="Profilarr logo" class="h-5 w-5 translate-y-[2px]" />
			<div class="text-xl font-bold text-neutral-900 dark:text-neutral-100">profilarr</div>
		</div>

		<!-- Right: Accent picker and Theme toggle -->
		<div class="flex items-center gap-1">
			<AccentPicker />
			<ThemeToggle />
		</div>
	</div>
</nav>
