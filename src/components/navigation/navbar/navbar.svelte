<script lang="ts">
	import ThemeToggle from './themeToggle.svelte';
	import logo from '$static/logo.svg';
</script>

<nav class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
	<div class="flex items-center justify-between px-4 py-4">
		<!-- Left: Brand name with logo -->
		<div class="flex items-center gap-2">
			<img src={logo} alt="Profilarr logo" class="h-5 w-5 translate-y-[3px]" />
			<div class="text-xl font-bold text-neutral-900 dark:text-neutral-100">profilarr</div>
		</div>

		<!-- Right: Theme toggle -->
		<ThemeToggle />
	</div>
</nav>
