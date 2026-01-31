<script lang="ts">
	import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-svelte';
	import type { AlertType } from './store';
	import { alertStore } from './store';
	import { fade } from 'svelte/transition';

	export let id: string;
	export let type: AlertType;
	export let message: string;

	const icons = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};

	const styles = {
		success: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200',
		error: 'border-red-200/80 bg-red-50/90 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200',
		warning: 'border-amber-200/80 bg-amber-50/90 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200',
		info: 'border-sky-200/80 bg-sky-50/90 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/60 dark:text-sky-200'
	};

	const Icon = icons[type];

	function dismiss() {
		alertStore.remove(id);
	}
</script>

<div
	in:fade={{ duration: 120 }}
	out:fade={{ duration: 120 }}
	role="button"
	tabindex="0"
	on:click={dismiss}
	on:keydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			dismiss();
		}
	}}
	class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur {styles[type]}"
>
	<Icon size={14} />
	<span class="min-w-0 flex-1 truncate">{message}</span>
</div>
