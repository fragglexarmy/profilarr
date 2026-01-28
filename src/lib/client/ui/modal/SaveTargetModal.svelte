<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { X, User, GitBranch } from 'lucide-svelte';

	export let open = false;
	export let mode: 'save' | 'delete' = 'save';

	const dispatch = createEventDispatcher<{
		select: 'user' | 'base';
		cancel: void;
	}>();

	$: title = mode === 'save' ? 'Where to save?' : 'Where to delete from?';
	$: userLabel = mode === 'save' ? 'Personal Override' : 'Remove Personal Override';
	$: userDescription =
		mode === 'save'
			? "Save locally only. Changes won't sync upstream and stay on this machine."
			: 'Remove your local override. The base database version will apply.';
	$: baseLabel = mode === 'save' ? 'Contribute to Database' : 'Delete from Database';
	$: baseDescription =
		mode === 'save'
			? "Add to base operations. You'll need to commit and push manually."
			: "Create a delete operation. You'll need to commit and push manually.";

	function handleSelect(layer: 'user' | 'base') {
		dispatch('select', layer);
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
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Modal -->
		<div
			class="relative w-full max-w-md rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800"
			>
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
				<button
					type="button"
					on:click={handleCancel}
					class="rounded-lg p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Body -->
			<div class="space-y-3 p-6">
				<button
					type="button"
					on:click={() => handleSelect('user')}
					class="flex w-full items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-accent-600 dark:hover:bg-accent-950"
				>
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
					>
						<User size={20} />
					</div>
					<div>
						<div class="font-medium text-neutral-900 dark:text-neutral-100">{userLabel}</div>
						<div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
							{userDescription}
						</div>
					</div>
				</button>

				<button
					type="button"
					on:click={() => handleSelect('base')}
					class="flex w-full items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-accent-600 dark:hover:bg-accent-950"
				>
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
					>
						<GitBranch size={20} />
					</div>
					<div>
						<div class="font-medium text-neutral-900 dark:text-neutral-100">{baseLabel}</div>
						<div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
							{baseDescription}
						</div>
					</div>
				</button>
			</div>
		</div>
	</div>
{/if}
