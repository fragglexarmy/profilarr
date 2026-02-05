<script lang="ts">
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ViewToggle from '$ui/actions/ViewToggle.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';
	import DropdownSelect from '$ui/dropdown/DropdownSelect.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import Button from '$ui/button/Button.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Score from '$ui/arr/Score.svelte';
	import CustomFormatBadge from '$ui/arr/CustomFormatBadge.svelte';
	import FormInput from '$ui/form/FormInput.svelte';
	import Input from '$ui/form/Input.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import Select from '$ui/form/Select.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import Autocomplete from '$ui/form/Autocomplete.svelte';
	import SearchDropdown from '$ui/form/SearchDropdown.svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import RangeScale from '$ui/form/RangeScale.svelte';
	import type { Marker } from '$ui/form/RangeScale.svelte';
	import KeyValueList from '$ui/form/KeyValueList.svelte';
	import CodeBlock from '$ui/meta/CodeBlock.svelte';
	import JsonView from '$ui/meta/JsonView.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import Toggle from '$ui/toggle/Toggle.svelte';
	import Table from '$ui/table/Table.svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import ReorderableList from '$ui/table/ReorderableList.svelte';
	import TableActionButton from '$ui/table/TableActionButton.svelte';
	import { createSearchStore } from '$lib/client/stores/search';
	import ComponentCard from './ComponentCard.svelte';
	import { Plus, Info, Trash2, FileText, Filter, Check, Star, Settings } from 'lucide-svelte';
	import type { ViewMode } from '$lib/client/stores/dataPage';

	const search = createSearchStore();
	const debouncedQuery = search.debouncedQuery;

	// Demo state
	const demoSearch = createSearchStore();
	let demoView: ViewMode = 'table';
	let demoDropdownOpen = false;
	let demoFormText = '';
	let demoFormPassword = '';
	let demoFormTextarea = '';
	let demoInputValue = '';
	let demoNumber: number | undefined = 50;
	let demoNumberCompact: number | undefined = 10;
	let demoTags = ['radarr', 'sonarr', '1080p'];
	const demoAutoOptions = [
		{ value: 'radarr', label: 'Radarr' },
		{ value: 'sonarr', label: 'Sonarr' },
		{ value: 'whisparr', label: 'Whisparr' },
		{ value: 'prowlarr', label: 'Prowlarr' },
		{ value: 'lidarr', label: 'Lidarr' },
		{ value: 'readarr', label: 'Readarr' }
	];
	let demoAutoSelected: Array<{ value: string; label: string }> = [];
	let demoAutoMulti: Array<{ value: string; label: string }> = [{ value: 'radarr', label: 'Radarr' }];
	let demoSearchDropdownValue: string | null = null;
	let demoModalOpen = false;
	let demoModalDanger = false;
	let demoInfoModalOpen = false;
	let demoKV: Record<string, string> = { 'API_KEY': 'abc123', 'BASE_URL': 'https://example.com' };
	let demoKVVersion: Record<string, string> = { 'minimum': '2.0.0', 'current': '3.1.0' };
	let demoRangeMarkers: Marker[] = [
		{ id: 'min', label: 'Min', color: 'blue', value: 20 },
		{ id: 'preferred', label: 'Preferred', color: 'accent', value: 50 },
		{ id: 'max', label: 'Max', color: 'red', value: 80 }
	];
	let demoRangeSingle: Marker[] = [
		{ id: 'threshold', label: 'Threshold', color: 'green', value: 60 }
	];
	let demoMarkdown = '**Bold** and *italic* text.\n\n- List item\n- Another item\n\n`inline code`';
	let demoMarkdownSingle = 'A single-line **markdown** input';
	let checkedAccent = true;
	let checkedBlue = true;
	let checkedGreen = true;
	let checkedRed = true;
	let checkedNeutral = true;
	let checkedOutline = true;
	let unchecked = false;
	let checkedSquare = true;
	let checkedCircle = true;
	let demoSelectFormValue = 'radarr';
	const demoSelectFormOptions = [
		{ value: 'radarr', label: 'Radarr' },
		{ value: 'sonarr', label: 'Sonarr' },
		{ value: 'whisparr', label: 'Whisparr' },
		{ value: 'prowlarr', label: 'Prowlarr' }
	];
	let demoSelectValue = 'radarr';
	const demoSelectOptions = [
		{ value: 'radarr', label: 'Radarr' },
		{ value: 'sonarr', label: 'Sonarr' },
		{ value: 'whisparr', label: 'Whisparr' }
	];
	const demoTableData = [
		{ id: 1, name: 'HD-1080p', score: 150, status: 'Active' },
		{ id: 2, name: 'Ultra-HD', score: 200, status: 'Active' },
		{ id: 3, name: 'SD', score: -50, status: 'Disabled' }
	];
	const demoTableColumns = [
		{ key: 'name', header: 'Name', sortable: true },
		{ key: 'score', header: 'Score', sortable: true, align: 'right' as const },
		{ key: 'status', header: 'Status' }
	];
	let demoReorderItems = [
		{ id: 'a', label: 'First item' },
		{ id: 'b', label: 'Second item' },
		{ id: 'c', label: 'Third item' }
	];
	let demoToggleAccent = true;
	let demoToggleGreen = true;
	let demoToggleRed = false;
	let demoToggleAmber = false;

	interface Section {
		id: string;
		name: string;
		category: string;
	}

	const sections: Section[] = [
		{ id: 'actions', name: 'Actions', category: 'actions' },
		{ id: 'arr', name: 'Arr', category: 'arr' },
		{ id: 'badge', name: 'Badge', category: 'badge' },
		{ id: 'button', name: 'Button', category: 'button' },
		{ id: 'card', name: 'Card', category: 'card' },
		{ id: 'dropdown', name: 'Dropdown', category: 'dropdown' },
		{ id: 'form-input', name: 'FormInput', category: 'form' },
		{ id: 'input', name: 'Input', category: 'form' },
		{ id: 'number-input', name: 'NumberInput', category: 'form' },
		{ id: 'select', name: 'Select', category: 'form' },
		{ id: 'icon-checkbox', name: 'IconCheckbox', category: 'form' },
		{ id: 'tag-input', name: 'TagInput', category: 'form' },
		{ id: 'autocomplete', name: 'Autocomplete', category: 'form' },
		{ id: 'search-dropdown', name: 'SearchDropdown', category: 'form' },
		{ id: 'markdown-input', name: 'MarkdownInput', category: 'form' },
		{ id: 'range-scale', name: 'RangeScale', category: 'form' },
		{ id: 'key-value-list', name: 'KeyValueList', category: 'form' },
		{ id: 'meta', name: 'Meta', category: 'meta' },
		{ id: 'modal', name: 'Modal', category: 'modal' },
		{ id: 'navigation', name: 'Navigation', category: 'navigation' },
		{ id: 'table', name: 'Table', category: 'table' },
		{ id: 'toggle', name: 'Toggle', category: 'toggle' }
	];

	$: filtered = filterSections(sections, $debouncedQuery);

	function filterSections(items: Section[], query: string): Section[] {
		if (!query) return items;
		const q = query.toLowerCase();
		return items.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				s.category.toLowerCase().includes(q)
		);
	}

	function isVisible(id: string): boolean {
		return filtered.some((s) => s.id === id);
	}
</script>

<svelte:head>
	<title>Components | Dev</title>
</svelte:head>

<div class="space-y-6 px-4 pt-8 pb-8 md:px-8 md:pt-12">
	<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Component Library</h1>

	<ActionsBar>
		<SearchAction searchStore={search} placeholder="Search components..." responsive />
	</ActionsBar>

	{#if filtered.length === 0}
		<div class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
			<p class="text-neutral-500 dark:text-neutral-400">No components match your search.</p>
		</div>
	{/if}

	<!-- Actions -->
	{#if isVisible('actions')}
		<ComponentCard
			name="Actions"
			paths={['actions/ActionsBar', 'actions/ActionButton', 'actions/SearchAction', 'actions/ViewToggle']}
			description="ActionsBar groups action items with collapsed borders and auto-rounding. ActionButton provides icon buttons with optional hover dropdowns. SearchAction is a search input with responsive mobile modal. ViewToggle switches between card/table views."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Full bar (search + buttons + view toggle)</p>
				<ActionsBar>
					<SearchAction searchStore={demoSearch} placeholder="Search..." responsive />
					<ActionButton icon={Plus} title="Add" />
					<ActionButton icon={Filter} hasDropdown={true} dropdownPosition="right">
						<svelte:fragment slot="dropdown">
							<Dropdown position="right">
								<DropdownItem icon={FileText} label="Option A" />
								<DropdownItem icon={FileText} label="Option B" />
							</Dropdown>
						</svelte:fragment>
					</ActionButton>
					<ActionButton icon={Info} title="Info" />
					<ViewToggle bind:value={demoView} />
				</ActionsBar>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Search only (single item rounding)</p>
				<ActionsBar>
					<SearchAction searchStore={demoSearch} placeholder="Search items..." responsive />
				</ActionsBar>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Buttons only</p>
				<ActionsBar className="md:justify-start">
					<ActionButton icon={Plus} title="Add" />
					<ActionButton icon={Trash2} variant="danger" title="Delete" />
					<ActionButton icon={Info} title="Info" />
				</ActionsBar>
			</div>
		</ComponentCard>
	{/if}

	<!-- Arr -->
	{#if isVisible('arr')}
		<ComponentCard
			name="Arr"
			paths={['arr/Score', 'arr/CustomFormatBadge']}
			description="Score displays a numeric value with sign and color coding (positive green, negative red, zero neutral). CustomFormatBadge shows a CF name with its score as a pill."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Score variants</p>
				<div class="flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-2">
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Positive:</span>
						<Score score={150} />
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Negative:</span>
						<Score score={-50} />
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Zero:</span>
						<Score score={0} />
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Null:</span>
						<Score score={null} />
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Uncolored:</span>
						<Score score={75} colored={false} />
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Small:</span>
						<Score score={42} size="sm" />
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Custom Format Badges</p>
				<div class="flex flex-wrap items-center gap-2">
					<CustomFormatBadge name="Remux" score={150} />
					<CustomFormatBadge name="BR-DISK" score={-10000} />
					<CustomFormatBadge name="x264" score={0} />
					<CustomFormatBadge name="DV HDR10+" score={50} />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Badge -->
	{#if isVisible('badge')}
		<ComponentCard
			name="Badge"
			paths={['badge/Badge']}
			description="Status/label pill with six color variants, two sizes, optional icon, and mono font option."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Variants</p>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="accent">Accent</Badge>
					<Badge variant="neutral">Neutral</Badge>
					<Badge variant="success">Success</Badge>
					<Badge variant="warning">Warning</Badge>
					<Badge variant="danger">Danger</Badge>
					<Badge variant="info">Info</Badge>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Sizes</p>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="accent" size="sm">Small</Badge>
					<Badge variant="accent" size="md">Medium</Badge>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Mono + icon</p>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="neutral" mono>v2.0.0</Badge>
					<Badge variant="success" icon={Info}>With icon</Badge>
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Button -->
	{#if isVisible('button')}
		<ComponentCard
			name="Button"
			paths={['button/Button']}
			description="Multi-variant button with primary, secondary, danger, and ghost styles. Supports three sizes, icons (left/right), responsive sizing, full-width, hide-text-on-mobile, and renders as an anchor when href is provided."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Variants</p>
				<div class="flex flex-wrap items-center gap-2">
					<Button text="Primary" variant="primary" />
					<Button text="Secondary" variant="secondary" />
					<Button text="Danger" variant="danger" />
					<Button text="Ghost" variant="ghost" />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Sizes</p>
				<div class="flex flex-wrap items-center gap-2">
					<Button text="Extra Small" variant="primary" size="xs" />
					<Button text="Small" variant="primary" size="sm" />
					<Button text="Medium" variant="primary" size="md" />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">With icons</p>
				<div class="flex flex-wrap items-center gap-2">
					<Button text="Add" variant="primary" icon={Plus} />
					<Button text="Delete" variant="danger" icon={Trash2} />
					<Button text="Info" variant="ghost" icon={Info} />
					<Button text="Next" variant="secondary" icon={Filter} iconPosition="right" />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Disabled</p>
				<div class="flex flex-wrap items-center gap-2">
					<Button text="Primary" variant="primary" disabled />
					<Button text="Secondary" variant="secondary" disabled />
					<Button text="Danger" variant="danger" disabled />
					<Button text="Ghost" variant="ghost" disabled />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Card -->
	{#if isVisible('card')}
		<ComponentCard
			name="StickyCard"
			paths={['card/StickyCard']}
			description="Sticky header/footer bar with left/right slots. Sticks to top or bottom on scroll. Three variants: default (solid bg + border), blur (frosted glass), and transparent (no bg). Uses IntersectionObserver to detect stuck state."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Default (top)</p>
				<div class="relative h-48 overflow-y-auto overflow-x-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
					<StickyCard position="top" variant="default">
						<svelte:fragment slot="left">
							<h1 class="text-neutral-900 dark:text-neutral-100">Page Title</h1>
							<p class="text-neutral-500 dark:text-neutral-400">Subtitle text</p>
						</svelte:fragment>
						<svelte:fragment slot="right">
							<Button text="Save" variant="primary" size="xs" />
							<Button text="Cancel" variant="ghost" size="xs" />
						</svelte:fragment>
					</StickyCard>
					<div class="p-4 pt-20">
						<div class="space-y-2">
							{#each Array(15) as _}<p class="text-sm text-neutral-400">Scroll content...</p>{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Blur variant</p>
				<div class="relative h-48 overflow-y-auto overflow-x-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
					<StickyCard position="top" variant="blur">
						<svelte:fragment slot="left">
							<h1 class="text-neutral-900 dark:text-neutral-100">Blur Header</h1>
						</svelte:fragment>
						<svelte:fragment slot="right">
							<Button text="Action" variant="primary" size="xs" />
						</svelte:fragment>
					</StickyCard>
					<div class="p-4 pt-20">
						<div class="space-y-2">
							{#each Array(15) as _}<p class="text-sm text-neutral-400">Scroll content...</p>{/each}
						</div>
					</div>
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Dropdown -->
	{#if isVisible('dropdown')}
		<ComponentCard
			name="Dropdown"
			paths={['dropdown/Dropdown', 'dropdown/DropdownItem', 'dropdown/DropdownSelect', 'dropdown/CustomGroupManager']}
			description="Dropdown is a positioned menu container. DropdownItem is a selectable row with optional icon, danger, and selected states. DropdownSelect composes Button + Dropdown into a select widget. CustomGroupManager is a specialized tag grouping form."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Dropdown + DropdownItem (hover to open)</p>
				<ActionsBar className="md:justify-start">
					<ActionButton icon={Filter} hasDropdown={true} dropdownPosition="left">
						<svelte:fragment slot="dropdown">
							<Dropdown position="left">
								<DropdownItem icon={FileText} label="Normal item" />
								<DropdownItem icon={Info} label="Selected item" selected />
								<DropdownItem icon={Trash2} label="Danger item" danger />
								<DropdownItem icon={Plus} label="Disabled item" disabled />
							</Dropdown>
						</svelte:fragment>
					</ActionButton>
				</ActionsBar>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">DropdownSelect</p>
				<div class="flex flex-wrap items-center gap-4">
					<DropdownSelect
						label="Arr type"
						bind:value={demoSelectValue}
						options={demoSelectOptions}
						position="left"
					/>
					<DropdownSelect
						bind:value={demoSelectValue}
						options={demoSelectOptions}
						position="left"
						compact
					/>
					<DropdownSelect
						bind:value={demoSelectValue}
						options={demoSelectOptions}
						position="left"
						disabled
					/>
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- FormInput -->
	{#if isVisible('form-input')}
		<ComponentCard
			name="FormInput"
			paths={['form/FormInput']}
			description="Labeled field wrapper supporting text, textarea, password (with visibility toggle), readonly, required, and mono font. Used as the standard form field throughout the app."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Text + textarea</p>
				<div class="grid gap-3 md:grid-cols-2">
					<FormInput label="Text" placeholder="Enter text..." bind:value={demoFormText} />
					<FormInput label="Textarea" textarea placeholder="Multi-line input..." bind:value={demoFormTextarea} />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Password (toggle visibility)</p>
				<div class="max-w-sm">
					<FormInput label="Password" private_ placeholder="Enter password..." bind:value={demoFormPassword} />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Readonly + required + mono</p>
				<div class="grid gap-3 md:grid-cols-3">
					<FormInput label="Readonly" value="Cannot edit" readonly />
					<FormInput label="Required" placeholder="Required field" required />
					<FormInput label="Mono" value="font-mono text" mono />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Input -->
	{#if isVisible('input')}
		<ComponentCard
			name="Input"
			paths={['form/Input']}
			description="Compact inline text input with optional error state, disabled state, compact sizing, and responsive auto-compact on small screens. Used for inline editing in tables and tight layouts."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Default + compact</p>
				<div class="flex flex-wrap items-center gap-3">
					<Input bind:value={demoInputValue} placeholder="Default" width="w-40" />
					<Input bind:value={demoInputValue} placeholder="Compact" compact width="w-32" />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Error + disabled</p>
				<div class="flex flex-wrap items-center gap-3">
					<Input value="Bad value" error width="w-40" />
					<Input placeholder="Disabled" disabled width="w-40" />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- NumberInput -->
	{#if isVisible('number-input')}
		<ComponentCard
			name="NumberInput"
			paths={['form/NumberInput']}
			description="Numeric input with custom increment/decrement stepper buttons. Supports min/max/step constraints, compact sizing, responsive auto-compact, mono/sans font, and disabled state. Hides steppers on mobile when responsive."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Default + compact</p>
				<div class="flex flex-wrap items-center gap-3">
					<div class="w-32">
						<NumberInput name="demo-num" bind:value={demoNumber} min={0} max={100} placeholder="0–100" />
					</div>
					<div class="w-24">
						<NumberInput name="demo-num-compact" bind:value={demoNumberCompact} min={0} max={99} compact placeholder="0–99" />
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Mono font + disabled</p>
				<div class="flex flex-wrap items-center gap-3">
					<div class="w-32">
						<NumberInput name="demo-num-mono" value={42} font="mono" />
					</div>
					<div class="w-32">
						<NumberInput name="demo-num-disabled" value={0} disabled />
					</div>
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Select -->
	{#if isVisible('select')}
		<ComponentCard
			name="Select"
			paths={['form/Select']}
			description="Custom dropdown select with keyboard navigation (arrow keys, Enter, Escape). Highlights the hovered/keyed option with accent color. Supports placeholder, mono font, and custom width."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Default + mono</p>
				<div class="flex flex-wrap items-start gap-4">
					<div class="w-48">
						<Select bind:value={demoSelectFormValue} options={demoSelectFormOptions} placeholder="Choose arr..." />
					</div>
					<div class="w-48">
						<Select bind:value={demoSelectFormValue} options={demoSelectFormOptions} mono />
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">No selection (placeholder)</p>
				<div class="w-48">
					<Select value="" options={demoSelectFormOptions} placeholder="Pick one..." />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- IconCheckbox -->
	{#if isVisible('icon-checkbox')}
		<ComponentCard
			name="IconCheckbox"
			paths={['form/IconCheckbox']}
			description="Icon-based checkbox toggle with five named colors (accent, blue, green, red, neutral) plus hex color support. Two variants (filled/outline), three shapes (rounded, square, circle). Used for toggling custom formats, conditions, etc."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Colors (filled)</p>
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} color="accent" bind:checked={checkedAccent} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Accent</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} color="blue" bind:checked={checkedBlue} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Blue</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} color="green" bind:checked={checkedGreen} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Green</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} color="red" bind:checked={checkedRed} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Red</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} color="neutral" bind:checked={checkedNeutral} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Neutral</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Star} color="#FFC230" checked />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Hex</span>
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Outline variant</p>
				<div class="flex flex-wrap items-center gap-3">
					<IconCheckbox icon={Check} color="accent" variant="outline" bind:checked={checkedOutline} />
					<IconCheckbox icon={Check} color="green" variant="outline" checked />
					<IconCheckbox icon={Check} color="red" variant="outline" checked />
					<IconCheckbox icon={Check} color="blue" variant="outline" checked />
					<IconCheckbox icon={Check} color="neutral" variant="outline" checked />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Shapes + unchecked + disabled</p>
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} shape="rounded" bind:checked={checkedSquare} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Rounded</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} shape="square" bind:checked={checkedSquare} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Square</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} shape="circle" bind:checked={checkedCircle} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Circle</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} bind:checked={unchecked} />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Unchecked</span>
					</div>
					<div class="flex items-center gap-1.5">
						<IconCheckbox icon={Check} checked disabled />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Disabled</span>
					</div>
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- TagInput -->
	{#if isVisible('tag-input')}
		<ComponentCard
			name="TagInput"
			paths={['form/TagInput']}
			description="Tag entry field with accent Badge chips. Type and press Enter to add, click X or Backspace to remove. Duplicate detection with alert toast. Tags render as Badge components inside a styled input container."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Interactive (try adding/removing)</p>
				<div class="max-w-lg">
					<TagInput bind:tags={demoTags} placeholder="Add a tag..." />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Autocomplete -->
	{#if isVisible('autocomplete')}
		<ComponentCard
			name="Autocomplete"
			paths={['form/Autocomplete']}
			description="Multi-select searchable dropdown built on Button + Dropdown + DropdownItem. Click to open, type to filter, keyboard navigate. Supports max selection limit, mono font, and custom item slots."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Single select</p>
				<div class="w-48">
					<Autocomplete options={demoAutoOptions} bind:selected={demoAutoSelected} max={1} placeholder="Choose one..." />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Multi select (max 3)</p>
				<div class="w-64">
					<Autocomplete options={demoAutoOptions} bind:selected={demoAutoMulti} max={3} placeholder="Pick up to 3..." />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- SearchDropdown -->
	{#if isVisible('search-dropdown')}
		<ComponentCard
			name="SearchDropdown"
			paths={['form/SearchDropdown']}
			description="Single-select searchable input that filters a dropdown list as you type. Shows a clear button when a value is selected. Focus ring uses accent color. Supports disabled state and custom item slot."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Default + disabled</p>
				<div class="flex flex-wrap items-start gap-4">
					<div class="w-56">
						<SearchDropdown
							options={demoAutoOptions}
							bind:value={demoSearchDropdownValue}
							placeholder="Search arrs..."
							on:change={(e) => (demoSearchDropdownValue = e.detail)}
						/>
					</div>
					<div class="w-56">
						<SearchDropdown
							options={demoAutoOptions}
							placeholder="Disabled"
							disabled
						/>
					</div>
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- MarkdownInput -->
	{#if isVisible('markdown-input')}
		<ComponentCard
			name="MarkdownInput"
			paths={['form/MarkdownInput']}
			description="Markdown-enabled textarea or single-line input with formatting toolbar (bold, italic, code, link, lists) and live preview toggle. Supports Ctrl+B/I shortcuts, label, description, required, and disabled states."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Multiline with toolbar</p>
				<MarkdownInput
					label="Description"
					description="Supports **markdown** formatting"
					placeholder="Write something..."
					bind:value={demoMarkdown}
					rows={4}
				/>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Single-line</p>
				<MarkdownInput
					label="Title"
					placeholder="Single-line markdown..."
					bind:value={demoMarkdownSingle}
					multiline={false}
				/>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Disabled</p>
				<MarkdownInput
					label="Locked"
					value="Cannot edit this"
					disabled
					rows={2}
				/>
			</div>
		</ComponentCard>
	{/if}

	<!-- RangeScale -->
	{#if isVisible('range-scale')}
		<ComponentCard
			name="RangeScale"
			paths={['form/RangeScale']}
			description="Draggable range slider with multiple color-coded markers and badge labels. Supports 7 marker colors (accent, blue, green, orange, red, purple, neutral), horizontal/vertical orientation, step snapping, min separation between markers, unit suffixes, and unlimited value display."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Multiple markers (drag to adjust)</p>
				<div class="px-4 py-8">
					<RangeScale min={0} max={100} step={5} bind:markers={demoRangeMarkers} unit="%" />
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Single marker</p>
				<div class="px-4 py-8">
					<RangeScale min={0} max={100} step={1} bind:markers={demoRangeSingle} />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- KeyValueList -->
	{#if isVisible('key-value-list')}
		<ComponentCard
			name="KeyValueList"
			paths={['form/KeyValueList']}
			description="Dynamic key-value pair editor with add/remove. Supports text and version value types (version uses NumberInput steppers for major.minor.patch). Responsive layout: stacked cards on mobile, grid on desktop. Supports locked first entry, custom labels, and add-disabled state."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Text mode</p>
				<KeyValueList
					bind:value={demoKV}
					label="Environment Variables"
					description="Add key-value pairs"
					keyPlaceholder="Variable name"
					valuePlaceholder="Value"
				/>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Version mode</p>
				<KeyValueList
					bind:value={demoKVVersion}
					label="Version Constraints"
					valueType="version"
					keyPlaceholder="Constraint name"
				/>
			</div>
		</ComponentCard>
	{/if}

	<!-- Meta -->
	{#if isVisible('meta')}
		<ComponentCard
			name="Meta"
			paths={['meta/CodeBlock', 'meta/JsonView']}
			description="CodeBlock renders syntax-highlighted code (SQL, JSON, plaintext) via highlight.js with an optional label and icon slot. JsonView renders a JSON object with highlight.js and auto-extracts SQL queries into separate highlighted blocks."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">CodeBlock (SQL)</p>
				<CodeBlock code="SELECT * FROM profiles\nWHERE name = 'HD-1080p'\nORDER BY id;" language="sql" label="Query" />
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">CodeBlock (JSON)</p>
				<CodeBlock code={'{\n  "name": "HD-1080p",\n  "cutoff": 7,\n  "items": [4, 7, 3]\n}'} language="json" />
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">JsonView (with queries)</p>
				<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
					<JsonView data={{ name: 'HD-1080p', cutoff: 7, upgradesAllowed: true, queries: ["INSERT INTO profiles (name) VALUES ('HD-1080p');", "UPDATE profiles SET cutoff = 7 WHERE name = 'HD-1080p';"] }} />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Modal -->
	{#if isVisible('modal')}
		<ComponentCard
			name="Modal"
			paths={['modal/Modal', 'modal/InfoModal', 'modal/DirtyModal']}
			description="Modal is the base confirm/cancel dialog with header, body slot, footer buttons, size/height options, loading state, and danger variant. InfoModal is a read-only modal with close button and body slot. DirtyModal is a pre-configured Modal for unsaved changes warnings (no unique styling)."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Modal (confirm/cancel)</p>
				<div class="flex flex-wrap items-center gap-2">
					<Button text="Open Modal" variant="primary" size="sm" on:click={() => (demoModalOpen = true)} />
					<Button text="Open Danger Modal" variant="danger" size="sm" on:click={() => { demoModalDanger = true; demoModalOpen = true; }} />
				</div>
				<Modal
					bind:open={demoModalOpen}
					header={demoModalDanger ? 'Delete Profile' : 'Confirm Action'}
					bodyMessage={demoModalDanger ? 'This will permanently delete the profile. This cannot be undone.' : 'Are you sure you want to proceed with this action?'}
					confirmText={demoModalDanger ? 'Delete' : 'Confirm'}
					confirmDanger={demoModalDanger}
					on:confirm={() => { demoModalOpen = false; demoModalDanger = false; }}
					on:cancel={() => { demoModalOpen = false; demoModalDanger = false; }}
				/>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">InfoModal (read-only)</p>
				<Button text="Open Info Modal" variant="secondary" size="sm" on:click={() => (demoInfoModalOpen = true)} />
				<InfoModal bind:open={demoInfoModalOpen} header="About Profiles">
					<div class="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
						<p>Profiles define quality preferences for your media library.</p>
						<p>Each profile can have custom formats, quality cutoffs, and upgrade rules.</p>
					</div>
				</InfoModal>
			</div>
		</ComponentCard>
	{/if}

	<!-- Navigation -->
	{#if isVisible('navigation')}
		<ComponentCard
			name="Tabs"
			paths={['navigation/tabs/Tabs']}
			description="Responsive tab bar with active state underline, optional icons, breadcrumb, and back button. On mobile (when responsive), collapses to a dropdown select. Navbar, pageNav, bottomNav, accentPicker, themeToggle are app chrome — visible in the live layout already."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">With icons + breadcrumb</p>
				<Tabs tabs={[
					{ label: 'Overview', href: '#tab-overview', active: true, icon: Info },
					{ label: 'Settings', href: '#tab-settings', active: false, icon: Settings },
					{ label: 'Logs', href: '#tab-logs', active: false, icon: FileText }
				]} breadcrumb={{ parent: { label: 'Dev', href: '/dev' }, current: 'Components' }} />
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Plain tabs</p>
				<Tabs tabs={[
					{ label: 'General', href: '#tab-general', active: true },
					{ label: 'Advanced', href: '#tab-advanced', active: false },
					{ label: 'Danger Zone', href: '#tab-danger', active: false }
				]} />
			</div>
		</ComponentCard>
	{/if}

	<!-- Table -->
	{#if isVisible('table')}
		<ComponentCard
			name="Table"
			paths={['table/Table', 'table/ExpandableTable', 'table/ReorderableList', 'table/TableActionButton']}
			description="Table is a generic sortable data table with responsive mobile card layout. ExpandableTable adds expandable rows with chevron toggles. ReorderableList provides drag-and-drop ordering. TableActionButton is a compact icon button for table row actions."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Table (sortable, click headers)</p>
				<Table
					columns={demoTableColumns}
					data={demoTableData}
					compact
				>
					<svelte:fragment slot="actions" let:row>
						<TableActionButton icon={Trash2} title="Delete" variant="danger" />
					</svelte:fragment>
				</Table>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">ExpandableTable (click rows to expand)</p>
				<ExpandableTable
					columns={demoTableColumns}
					data={demoTableData}
					getRowId={(row) => row.id}
					compact
				>
					<svelte:fragment slot="expanded" let:row>
						<p class="text-sm text-neutral-500 dark:text-neutral-400">Details for {row.name} — score: {row.score}, status: {row.status}</p>
					</svelte:fragment>
				</ExpandableTable>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">ReorderableList (drag to reorder)</p>
				<ReorderableList
					items={demoReorderItems}
					getKey={(item) => item.id}
					onReorder={(items) => (demoReorderItems = items)}
				>
					<svelte:fragment let:item let:index>
						<div class="flex items-center gap-3">
							<span class="text-xs font-mono text-neutral-400">{index + 1}</span>
							<span class="text-sm text-neutral-700 dark:text-neutral-300">{item.label}</span>
						</div>
					</svelte:fragment>
				</ReorderableList>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">TableActionButton variants</p>
				<div class="flex items-center gap-2">
					<TableActionButton icon={Info} title="Info" variant="neutral" />
					<TableActionButton icon={Trash2} title="Delete" variant="danger" />
					<TableActionButton icon={Settings} title="Settings" variant="accent" />
					<TableActionButton icon={Info} title="Small" variant="neutral" size="sm" />
					<TableActionButton icon={Info} title="Disabled" variant="neutral" disabled />
				</div>
			</div>
		</ComponentCard>
	{/if}

	<!-- Toggle -->
	{#if isVisible('toggle')}
		<ComponentCard
			name="Toggle"
			paths={['toggle/Toggle']}
			description="Two-segment switch with X/Check icons. Four color variants (accent, amber, green, red) for the active state, neutral inactive state. Supports disabled state and dispatches change events."
		>
			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Colors</p>
				<div class="flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-2">
						<Toggle color="accent" bind:checked={demoToggleAccent} label="Accent" />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Accent</span>
					</div>
					<div class="flex items-center gap-2">
						<Toggle color="green" bind:checked={demoToggleGreen} label="Green" />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Green</span>
					</div>
					<div class="flex items-center gap-2">
						<Toggle color="red" bind:checked={demoToggleRed} label="Red" />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Red</span>
					</div>
					<div class="flex items-center gap-2">
						<Toggle color="amber" bind:checked={demoToggleAmber} label="Amber" />
						<span class="text-xs text-neutral-500 dark:text-neutral-400">Amber</span>
					</div>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400">Disabled</p>
				<div class="flex flex-wrap items-center gap-4">
					<Toggle color="accent" checked disabled label="Disabled on" />
					<Toggle color="accent" checked={false} disabled label="Disabled off" />
				</div>
			</div>
		</ComponentCard>
	{/if}
</div>
