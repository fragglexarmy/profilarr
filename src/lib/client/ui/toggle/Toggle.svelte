<script lang="ts">
	export let checked: boolean = false;
	export let color: 'accent' | 'amber' | 'green' | 'red' = 'accent';
	export let disabled: boolean = false;

	const colors = {
		accent: 'bg-accent-500',
		amber: 'bg-amber-500',
		green: 'bg-green-500',
		red: 'bg-red-500'
	};

	$: colorClass = colors[color];
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	{disabled}
	on:click={() => !disabled && (checked = !checked)}
	class="relative h-5 w-12 flex-shrink-0 cursor-pointer rounded-full p-[3px] transition-colors duration-300 ease-out
		{checked ? colorClass : 'bg-neutral-300 dark:bg-neutral-600'}
		{disabled ? 'cursor-not-allowed opacity-50' : ''}"
>
	<span
		class="block h-[14px] w-6 rounded-full bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
			{checked ? 'translate-x-[18px]' : 'translate-x-0'}"
	></span>
</button>
