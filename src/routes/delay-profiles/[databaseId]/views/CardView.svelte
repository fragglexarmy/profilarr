<script lang="ts">
	import type { DelayProfilesRow } from '$shared/pcd/display.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Clock, Zap, Shield } from 'lucide-svelte';

	export let profiles: DelayProfilesRow[];

	function handleCardClick(profile: DelayProfilesRow) {
		const databaseId = $page.params.databaseId;
		goto(`/delay-profiles/${databaseId}/${profile.id}`);
	}

	function formatProtocol(protocol: string): string {
		switch (protocol) {
			case 'prefer_usenet':
				return 'Prefer Usenet';
			case 'prefer_torrent':
				return 'Prefer Torrent';
			case 'only_usenet':
				return 'Only Usenet';
			case 'only_torrent':
				return 'Only Torrent';
			default:
				return protocol;
		}
	}

	function formatDelay(minutes: number | null): string {
		if (minutes === null) return '-';
		if (minutes === 0) return 'No delay';
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	function getProtocolColor(protocol: string): string {
		if (protocol.includes('usenet')) {
			return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200';
		}
		return 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200';
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each profiles as profile}
		<button
			on:click={() => handleCardClick(profile)}
			class="group relative flex cursor-pointer flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<!-- Header with name -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{profile.name}</h3>
			</div>

			<!-- Protocol badge -->
			<div>
				<span
					class="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium {getProtocolColor(
						profile.preferred_protocol
					)}"
				>
					<Zap size={12} />
					{formatProtocol(profile.preferred_protocol)}
				</span>
			</div>

			<!-- Delays -->
			<div class="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
				{#if profile.usenet_delay !== null}
					<div class="flex items-center gap-1">
						<Clock size={12} />
						<span
							>Usenet: <span
								class="rounded bg-neutral-100 px-1 font-mono text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
								>{formatDelay(profile.usenet_delay)}</span
							></span
						>
					</div>
				{/if}
				{#if profile.torrent_delay !== null}
					<div class="flex items-center gap-1">
						<Clock size={12} />
						<span
							>Torrent: <span
								class="rounded bg-neutral-100 px-1 font-mono text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
								>{formatDelay(profile.torrent_delay)}</span
							></span
						>
					</div>
				{/if}
			</div>

			<!-- Bypass conditions -->
			{#if profile.bypass_if_highest_quality || profile.bypass_if_above_custom_format_score}
				<div
					class="flex items-center gap-2 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800"
				>
					<Shield size={12} class="text-neutral-400" />
					<div class="flex flex-wrap gap-1">
						{#if profile.bypass_if_highest_quality}
							<span
								class="rounded bg-green-100 px-1.5 py-0.5 font-mono text-[10px] text-green-800 dark:bg-green-900 dark:text-green-200"
							>
								Highest Quality
							</span>
						{/if}
						{#if profile.bypass_if_above_custom_format_score && profile.minimum_custom_format_score !== null}
							<span
								class="rounded bg-green-100 px-1.5 py-0.5 font-mono text-[10px] text-green-800 dark:bg-green-900 dark:text-green-200"
							>
								CF ≥ {profile.minimum_custom_format_score}
							</span>
						{/if}
					</div>
				</div>
			{/if}
		</button>
	{/each}
</div>
