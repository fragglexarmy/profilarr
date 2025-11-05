<script lang="ts">
	export let label: string;
	export let description: string = '';
	export let placeholder: string = '';
	export let value: string = '';
	export let textarea: boolean = false;
</script>

<div class="space-y-2">
	<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
		{label}
	</div>

	{#if description}
		<p class="text-xs text-neutral-600 dark:text-neutral-400">
			{description}
		</p>
	{/if}

	{#if textarea}
		<textarea
			bind:value
			{placeholder}
			rows="6"
			class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
		></textarea>
	{:else}
		<input
			type="text"
			bind:value
			{placeholder}
			class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
		/>
	{/if}
</div>
