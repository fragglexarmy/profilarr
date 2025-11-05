<script lang="ts">
	import { ChevronDown, Info } from 'lucide-svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let showInfoModal = false;

	const typeOptions = [
		{ value: 'simple', label: 'Preferred' },
		{ value: 'must', label: 'Must Include' },
		{ value: 'only', label: 'Must Only Be' },
		{ value: 'not', label: 'Does Not Include' }
	];

	// Initialize with existing language or defaults
	let selectedType: 'must' | 'only' | 'not' | 'simple' = data.languages[0]?.type || 'simple';
	let selectedLanguageId: number | null = data.languages[0]?.id || null;
	let searchQuery = data.languages[0]?.name || '';
	let showTypeDropdown = false;
	let showLanguageDropdown = false;

	$: selectedLanguage = data.availableLanguages.find(l => l.id === selectedLanguageId);

	$: filteredLanguages = data.availableLanguages.filter(lang =>
		lang.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	$: isValidLanguage = searchQuery === '' || selectedLanguageId !== null;
	$: showValidationError = searchQuery !== '' && !isValidLanguage;

	function selectType(type: 'must' | 'only' | 'not' | 'simple') {
		selectedType = type;
		showTypeDropdown = false;
	}

	function selectLanguage(language: { id: number; name: string }) {
		selectedLanguageId = language.id;
		searchQuery = language.name;
		showLanguageDropdown = false;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		showLanguageDropdown = true;

		const exactMatch = data.availableLanguages.find(
			l => l.name.toLowerCase() === searchQuery.toLowerCase()
		);
		if (!exactMatch) {
			selectedLanguageId = null;
		} else {
			selectedLanguageId = exactMatch.id;
		}
	}

	function handleFocus() {
		showLanguageDropdown = true;
	}

	function handleBlur() {
		setTimeout(() => {
			showLanguageDropdown = false;
			if (selectedLanguageId) {
				searchQuery = selectedLanguage?.name || '';
			}
		}, 200);
	}
</script>

<svelte:head>
	<title>Languages - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-3">
	<div class="flex items-start justify-between">
		<div>
			<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
				Language
			</div>
			<p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
				Configure the language preference for this profile
			</p>
		</div>
		<button
			type="button"
			on:click={() => showInfoModal = true}
			class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			<Info size={14} />
			Info
		</button>
	</div>

	<div class="flex gap-2">
		<!-- Type Dropdown -->
		<div class="relative w-48">
			<button
				type="button"
				on:click={() => (showTypeDropdown = !showTypeDropdown)}
				on:blur={() => setTimeout(() => (showTypeDropdown = false), 200)}
				class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
			>
				<span>{typeOptions.find(t => t.value === selectedType)?.label}</span>
				<ChevronDown size={14} />
			</button>

			{#if showTypeDropdown}
				<div
					class="absolute top-full z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
				>
					{#each typeOptions as option}
						<button
							type="button"
							on:click={() => selectType(option.value)}
							class="w-full px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
						>
							{option.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Language Autocomplete -->
		<div class="relative flex-1">
			<input
				type="text"
				bind:value={searchQuery}
				on:input={handleInput}
				on:focus={handleFocus}
				on:blur={handleBlur}
				placeholder="Search for a language..."
				class="block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none focus:ring-1 dark:text-neutral-50 dark:placeholder-neutral-500 {showValidationError
					? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-950 dark:focus:border-red-500'
					: 'border-neutral-300 bg-white focus:border-blue-500 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800'}"
			/>

			{#if showValidationError}
				<p class="mt-1 text-xs text-red-600 dark:text-red-400">
					"{searchQuery}" is not a valid language. Please select from the dropdown.
				</p>
			{/if}

			{#if showLanguageDropdown && filteredLanguages.length > 0}
				<div
					class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
				>
					{#each filteredLanguages as language}
						<button
							type="button"
							on:mousedown={() => selectLanguage(language)}
							class="w-full px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
						>
							{language.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

</div>

<InfoModal bind:open={showInfoModal} header="Language Options">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
				<span>Preferred</span>
				<span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Radarr Only</span>
			</div>
			<div class="mt-1">Uses Radarr's built-in language preference setting</div>
		</div>
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Must Include</div>
			<div class="mt-1">Release must include the specified language</div>
		</div>
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Must Only Be</div>
			<div class="mt-1">Release must only contain the specified language</div>
		</div>
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Does Not Include</div>
			<div class="mt-1">Release must not include the specified language</div>
		</div>
	</div>
</InfoModal>
