<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ComponentType } from 'svelte';

	export let text: string = '';
	export let variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'ghost';
	export let size: 'xs' | 'sm' | 'md' = 'sm';
	export let disabled: boolean = false;
	export let icon: ComponentType | null = null;
	export let iconColor: string = '';
	export let textColor: string = '';
	export let iconPosition: 'left' | 'right' = 'left';
	export let type: 'button' | 'submit' = 'button';
	// Responsive: auto-switch to xs on smaller screens (< 1280px)
	export let responsive: boolean = false;
	export let fullWidth: boolean = false;
	// Optional href - renders as anchor instead of button
	export let href: string | undefined = undefined;

	let isSmallScreen = false;
	let mediaQuery: MediaQueryList | null = null;

	onMount(() => {
		if (responsive && typeof window !== 'undefined') {
			mediaQuery = window.matchMedia('(max-width: 1279px)');
			isSmallScreen = mediaQuery.matches;
			mediaQuery.addEventListener('change', handleMediaChange);
		}
	});

	onDestroy(() => {
		if (mediaQuery) {
			mediaQuery.removeEventListener('change', handleMediaChange);
		}
	});

	function handleMediaChange(e: MediaQueryListEvent) {
		isSmallScreen = e.matches;
	}

	const baseClasses =
		'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

	const sizeClasses = {
		xs: 'gap-1 rounded px-2 py-1 text-xs',
		sm: 'gap-1.5 rounded-lg px-3 py-2',
		md: 'gap-2 rounded-lg px-4 py-2.5'
	};

	const variantClasses = {
		primary:
			'bg-accent-600 text-white hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600',
		secondary:
			'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
		danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
		ghost:
			'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
	};

	$: effectiveSize = responsive && isSmallScreen ? 'xs' : size;
	$: widthClass = fullWidth ? 'w-full' : '';
	$: baseTextColor =
		textColor || (variant === 'ghost' ? 'text-neutral-700 dark:text-neutral-300' : '');
	$: baseIconColor =
		iconColor || (variant === 'ghost' ? 'text-neutral-500 dark:text-neutral-400' : '');
	$: classes = `${baseClasses} ${sizeClasses[effectiveSize]} ${variantClasses[variant]} ${widthClass}`;
</script>

{#if href}
	<a {href} class={classes} on:click on:mouseenter on:mouseleave>
		{#if icon && iconPosition === 'left'}
			<svelte:component this={icon} size={effectiveSize === 'xs' ? 12 : effectiveSize === 'sm' ? 14 : 16} class={baseIconColor} />
		{/if}
		{#if text}
			<span class={baseTextColor}>{text}</span>
		{/if}
		<slot />
		{#if icon && iconPosition === 'right'}
			<svelte:component this={icon} size={effectiveSize === 'xs' ? 12 : effectiveSize === 'sm' ? 14 : 16} class={baseIconColor} />
		{/if}
	</a>
{:else}
	<button {type} {disabled} class={classes} on:click on:mouseenter on:mouseleave>
		{#if icon && iconPosition === 'left'}
			<svelte:component this={icon} size={effectiveSize === 'xs' ? 12 : effectiveSize === 'sm' ? 14 : 16} class={baseIconColor} />
		{/if}
		{#if text}
			<span class={baseTextColor}>{text}</span>
		{/if}
		<slot />
		{#if icon && iconPosition === 'right'}
			<svelte:component this={icon} size={effectiveSize === 'xs' ? 12 : effectiveSize === 'sm' ? 14 : 16} class={baseIconColor} />
		{/if}
	</button>
{/if}
