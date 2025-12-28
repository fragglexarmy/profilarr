<script lang="ts">
	export let position: 'left' | 'right' | 'middle' = 'left';
	export let minWidth: string = '12rem'; // Allow customization

	// Compute position classes
	$: positionClass = {
		left: 'left-0',
		right: 'right-0',
		middle: 'left-1/2 -translate-x-1/2'
	}[position];
</script>

<!-- Dropdown content - can be used standalone or within a trigger wrapper -->
<!-- Invisible hover bridge to keep dropdown open when moving mouse down -->
<div class="absolute top-full z-40 h-3 w-full"></div>

<div
	class="absolute top-full z-50 mt-3 rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 {positionClass}"
	style="min-width: {minWidth}"
>
	<slot />
</div>
