<script lang="ts">
	export let value: string = '';
	export let placeholder: string = '';
	export let type: 'text' | 'number' | 'email' | 'password' = 'text';
	export let disabled: boolean = false;
	export let width: string = 'w-28';
</script>

<input
	{type}
	bind:value
	{placeholder}
	{disabled}
	class="{width} rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 {disabled ? 'cursor-not-allowed opacity-50' : ''}"
/>
