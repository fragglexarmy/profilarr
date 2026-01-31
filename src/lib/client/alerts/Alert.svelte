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

	const labels = {
		success: 'Success',
		error: 'Error',
		warning: 'Warning',
		info: 'Info'
	};

	const styles = {
		success: {
			container:
				'border border-emerald-200/80 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-100',
			accent: '',
			icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
			label: 'text-emerald-700 dark:text-emerald-300'
		},
		error: {
			container:
				'border border-red-200/80 bg-red-50/90 text-red-950 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100',
			accent: '',
			icon: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200',
			label: 'text-red-700 dark:text-red-300'
		},
		warning: {
			container:
				'border border-amber-200/80 bg-amber-50/90 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100',
			accent: '',
			icon: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
			label: 'text-amber-700 dark:text-amber-300'
		},
		info: {
			container:
				'border border-sky-200/80 bg-sky-50/90 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-100',
			accent: '',
			icon: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200',
			label: 'text-sky-700 dark:text-sky-300'
		}
	};

	const Icon = icons[type];

	function dismiss() {
		alertStore.remove(id);
	}
</script>

<div
	in:fly={{ y: -20, duration: 260 }}
	out:fade={{ duration: 180 }}
	role="button"
	tabindex="0"
	on:click={dismiss}
	on:keydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			dismiss();
		}
	}}
	class="relative cursor-pointer overflow-hidden rounded-xl px-4 py-3 shadow-xl shadow-black/5 backdrop-blur {styles[type].container}"
>
	<div class="flex items-start gap-3 pl-2">
		<div
			class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg {styles[type].icon}"
		>
			<Icon size={18} />
		</div>
		<div class="flex-1">
			<p class="text-xs font-semibold uppercase tracking-wide {styles[type].label}">
				{labels[type]}
			</p>
			<p class="mt-0.5 text-sm font-medium leading-5">{message}</p>
		</div>
	</div>
</div>
