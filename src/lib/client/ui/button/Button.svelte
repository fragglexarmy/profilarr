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
	// Responsive: auto-switch to xs on smaller screens (< 768px)
	export let responsive: boolean = false;
	// Hide text on mobile (show icon only)
	export let hideTextOnMobile: boolean = false;
	export let fullWidth: boolean = false;
	// Optional href - renders as anchor instead of button
	export let href: string | undefined = undefined;
	export let target: string | undefined = undefined;
	export let rel: string | undefined = undefined;
	// Alignment for content (center or between for dropdowns)
	export let justify: 'center' | 'between' = 'center';
	export let title: string = '';
	export let ariaLabel: string = '';
	export let tooltip: string = '';
	export let tooltipPosition: 'top' | 'bottom' = 'bottom';

	let isSmallScreen = false;
	let mediaQuery: MediaQueryList | null = null;

	onMount(() => {
		if (responsive && typeof window !== 'undefined') {
			mediaQuery = window.matchMedia('(max-width: 767px)');
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

	$: justifyClass = justify === 'between' ? 'justify-between' : 'justify-center';

	$: baseClasses = `inline-flex items-center ${justifyClass} font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`;

	const sizeClasses = {
		xs: 'gap-1 rounded-lg px-2 py-1 text-xs',
		sm: 'gap-1.5 rounded-xl px-3 py-1.5 text-sm md:py-2',
		md: 'gap-2 rounded-xl px-4 py-2.5'
	};

	const iconOnlySizeClasses = {
		xs: 'rounded-lg p-1.5 text-xs',
		sm: 'rounded-xl p-2 text-sm',
		md: 'rounded-xl p-2.5'
	};

	const variantClasses = {
		primary:
			'bg-accent-600 text-white hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600',
		secondary:
			'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-200 dark:hover:bg-neutral-700',
		danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
		ghost:
			'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-200 dark:hover:bg-neutral-700'
	};

	$: effectiveSize = responsive && isSmallScreen ? 'xs' : size;
	$: widthClass = fullWidth ? 'w-full' : '';
	$: baseTextColor =
		textColor || (variant === 'ghost' ? 'text-neutral-700 dark:text-neutral-300' : '');
	$: baseIconColor =
		iconColor || (variant === 'ghost' ? 'text-neutral-500 dark:text-neutral-400' : '');
	$: isIconOnly = icon && !text;
	$: activeSizeClasses = isIconOnly ? iconOnlySizeClasses : sizeClasses;
	$: classes = `${baseClasses} ${activeSizeClasses[effectiveSize]} ${variantClasses[variant]} ${widthClass}`;
	$: iconSize = effectiveSize === 'xs' ? 12 : effectiveSize === 'sm' ? 14 : 16;
	$: tooltipPosClass = tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
</script>

<div class="group relative inline-flex">
	{#if href}
		<a
			{href}
			{target}
			{rel}
			title={!tooltip && title ? title : undefined}
			aria-label={ariaLabel || tooltip || undefined}
			class={classes}
			on:click
			on:mouseenter
			on:mouseleave
		>
			{#if icon && iconPosition === 'left'}
				<svelte:component this={icon} size={iconSize} class={baseIconColor} />
			{/if}
			{#if text}
				<span class="{baseTextColor} {hideTextOnMobile ? 'hidden md:inline' : ''}">{text}</span>
			{/if}
			<slot />
			{#if icon && iconPosition === 'right'}
				<svelte:component this={icon} size={iconSize} class={baseIconColor} />
			{/if}
		</a>
	{:else}
		<button
			{type}
			{disabled}
			title={!tooltip && title ? title : undefined}
			aria-label={ariaLabel || tooltip || undefined}
			class={classes}
			on:click
			on:mouseenter
			on:mouseleave
		>
			{#if icon && iconPosition === 'left'}
				<svelte:component this={icon} size={iconSize} class={baseIconColor} />
			{/if}
			{#if text}
				<span class="{baseTextColor} {hideTextOnMobile ? 'hidden md:inline' : ''}">{text}</span>
			{/if}
			<slot />
			{#if icon && iconPosition === 'right'}
				<svelte:component this={icon} size={iconSize} class={baseIconColor} />
			{/if}
		</button>
	{/if}

	{#if tooltip}
		<div class="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 {tooltipPosClass} opacity-0 transition-opacity group-hover:opacity-100">
			<div class="whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow-lg dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-50">
				{tooltip}
			</div>
		</div>
	{/if}
</div>
