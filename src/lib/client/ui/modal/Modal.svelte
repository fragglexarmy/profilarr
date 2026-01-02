<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { X, Check } from 'lucide-svelte';

	// Props
	export let open = false;
	export let header = 'Confirm';
	export let bodyMessage = 'Are you sure?';
	export let confirmText = 'Confirm';
	export let cancelText = 'Cancel';
	export let confirmDanger = false; // If true, confirm button is styled as danger (red)
	export let size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';

	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl',
		'2xl': 'max-w-6xl'
	};

	const dispatch = createEventDispatcher();

	function handleConfirm() {
		dispatch('confirm');
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			handleCancel();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Modal -->
		<div
			class="relative w-full {sizeClasses[size]} rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
		>
			<!-- Header -->
			<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{header}</h2>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<slot name="body">
					<p class="text-sm text-neutral-600 dark:text-neutral-400">{bodyMessage}</p>
				</slot>
			</div>

			<!-- Footer -->
			<div
				class="flex justify-between border-t border-neutral-200 px-6 py-4 dark:border-neutral-800"
			>
				<button
					type="button"
					on:click={handleCancel}
					class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					<X size={16} />
					{cancelText}
				</button>
				<button
					type="button"
					on:click={handleConfirm}
					class={confirmDanger
						? 'flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:hover:bg-red-600'
						: 'flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600'}
				>
					<Check size={16} />
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
