<script lang="ts">
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
	import type { AlertType } from './store';
	import { alertStore } from './store';
	import { fade, fly } from 'svelte/transition';

	export let id: string;
	export let type: AlertType;
	export let message: string;

	// Icon mapping
	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};

	// Style mapping
	const styles = {
		success:
			'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200',
		error:
			'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
		warning:
			'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200',
		info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200'
	};

	// Icon color mapping
	const iconColors = {
		success: 'text-green-600 dark:text-green-400',
		error: 'text-red-600 dark:text-red-400',
		warning: 'text-yellow-600 dark:text-yellow-400',
		info: 'text-blue-600 dark:text-blue-400'
	};

	const Icon = icons[type];

	function dismiss() {
		alertStore.remove(id);
	}
</script>

<div
	in:fly={{ y: -20, duration: 300 }}
	out:fade={{ duration: 200 }}
	class="flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg {styles[type]}"
>
	<Icon size={20} class="mt-0.5 flex-shrink-0 {iconColors[type]}" />
	<p class="flex-1 text-sm font-medium">{message}</p>
	<button
		on:click={dismiss}
		class="flex-shrink-0 opacity-50 transition-opacity hover:opacity-100"
		aria-label="Dismiss"
	>
		<X size={16} />
	</button>
</div>
