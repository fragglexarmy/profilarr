<script lang="ts">
	import { X } from 'lucide-svelte';

	export let open = false;
	export let header = 'Information';

	function handleClose() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	$: if (typeof window !== 'undefined') {
		if (open) {
			window.addEventListener('keydown', handleKeydown);
		} else {
			window.removeEventListener('keydown', handleKeydown);
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Modal -->
		<div
			class="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
		>
			<!-- Header -->
			<div
				class="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800"
			>
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{header}</h2>
				<button
					type="button"
					on:click={handleClose}
					class="rounded-lg p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Body -->
			<div class="overflow-auto px-6 py-4">
				<slot />
			</div>
		</div>
	</div>
{/if}
