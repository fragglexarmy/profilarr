# Contributing to Profilarr

## About

Profilarr is a configuration management tool for Radarr and Sonarr.

Setting up media automation properly means creating dozens of custom formats to
identify things like 4K releases, preferred encoders, and quality thresholds.
Then you need to orchestrate all those formats into quality profiles that
actually work together. Most people spend hours piecing this together from forum
posts and guides.

Profilarr lets users pull from shared configuration databases instead of
building everything from scratch. You link a database, connect your arr
instances, and sync. It compiles the configurations, pushes them to your apps,
preserves any local modifications you've made, and tracks everything with git so
you can see what changed.

### Users and Developers

Profilarr serves two audiences. End users link external databases and sync
configurations to their Arr instances. Developers create and maintain those
databases.

The editing interface serves both. End users can make custom tweaks to profiles
or formats after syncing—these local modifications persist across future syncs.
Developers use the same editors to build databases from scratch, test their
configurations, and iterate on profiles before publishing.

## Stack

SvelteKit with Svelte 5 running on Deno. We don't use runes—event handlers use
`onclick` syntax, but no `$state`, `$derived`, or other rune primitives.
Tailwind CSS 4 for styling. Lucide and Simple Icons for iconography.

Both `deno.json` and `package.json` exist in the project:

- **deno.json** defines import maps (path aliases like `$lib/`, `$stores/`),
  Deno-specific imports from JSR (`jsr:@std/yaml`), and all runnable tasks
  (`deno task dev`, `deno task build`, etc.)

- **package.json** provides npm dependencies that Vite and SvelteKit need during
  the build process. The `@deno/vite-plugin` and `sveltekit-adapter-deno`
  packages bridge these two ecosystems.

When you run `deno task dev`, Deno resolves imports through `deno.json` while
Vite pulls dependencies from `node_modules`. Both files are required—`deno.json`
for runtime resolution and tasks, `package.json` for the Vite build toolchain.

### Frontend

The UI lets users:

- **Link databases** — Connect external GitHub repositories containing
  Profilarr-compliant configurations. Supports public and private repos with
  auth tokens.

- **Connect Arr instances** — Add Radarr, Sonarr, Lidarr, or Chaptarr instances
  by URL and API key.

- **Manage entities** — Create and edit quality profiles, custom formats, delay
  profiles, media management settings, and regular expressions. Each entity type
  has its own editor with testing capabilities.

- **Configure sync** — Set up how and when configurations push to each Arr
  instance. Strategies include manual, scheduled (cron), on-pull, and on-change.
  Dependencies like custom formats auto-sync with their parent profiles.

- **Browse libraries** — View downloaded media with filtering, sorting, and bulk
  profile reassignment (Radarr only currently).

- **Manage upgrades** — Configure automatic quality upgrades with filters,
  schedules, and dry-run testing.

- **Settings** — Notifications (Discord/Slack/Email), backups, logging, theming,
  and background job management.

#### Routes, Not Modals

Prefer routes over modals. Modals should only be used for things requiring
immediate attention—confirmations like "you have unsaved changes" or "are you
sure you want to delete this?" They can also display supplementary information
about a page that wouldn't fit in the layout otherwise.

In rare cases, modals can be used for one-time forms. Use this sparingly and
only when a route would be excessively nested. The only place we do this is for
adding test entities and releases to those entities. Without modals there, we'd
be 5-6 routes deep and the breadcrumbs become confusing.

Examples:

- `src/routes/databases/+page.svelte` — Confirmation modal for unlinking a
  database. Warns about data loss before proceeding.
- `src/routes/arr/+page.svelte` — Confirmation modal for deleting an Arr
  instance.
- `src/routes/settings/backups/+page.svelte` — Confirmation modals for both
  deleting and restoring backups.
- `src/routes/arr/[id]/upgrades/components/UpgradesInfoModal.svelte` — Info
  modal explaining how the upgrades module works. Too much content for the page
  itself.
- `src/routes/quality-profiles/entity-testing/[databaseId]/components/AddEntityModal.svelte`
  — One-time form exception. Searches TMDB and adds test entities. A route here
  would be 5+ levels deep.
- `src/routes/quality-profiles/entity-testing/[databaseId]/components/ReleaseModal.svelte`
  — One-time form exception. Adds test releases to entities.

#### Alerts

Users need feedback when they take an action. Use the alert system in
`src/lib/client/alerts/` to show success, error, warning, or info messages.
Import `alertStore` and call `alertStore.add(type, message)`.

Examples:

- `src/routes/arr/components/InstanceForm.svelte` — Shows success/error after
  testing connection, creating, or updating an Arr instance.
- `src/routes/databases/components/InstanceForm.svelte` — Shows success/error
  when linking, updating, or unlinking databases.
- `src/routes/settings/general/components/TMDBSettings.svelte` — Shows
  success/error after testing TMDB API connection.
- `src/routes/settings/jobs/components/JobCard.svelte` — Shows success/error
  when triggering or toggling background jobs.
- `src/routes/quality-profiles/entity-testing/[databaseId]/+page.svelte` — Shows
  a persistent warning (duration: 0) when the parser service is unavailable.

#### Dirty Tracking

The dirty store (`src/lib/client/stores/dirty.ts`) tracks whether a form has
unsaved changes by comparing current state against an original snapshot. This
serves two purposes: disabling save buttons when nothing has changed (avoiding
unnecessary requests and file writes), and warning users before they navigate
away from unsaved work via `DirtyModal.svelte`.

How it works:

1. **Initialize** — Call `initEdit(serverData)` for existing records or
   `initCreate(defaults)` for new ones. This captures the original snapshot.
2. **Update** — Call `update(field, value)` when a field changes. The store
   compares current state against the snapshot using deep equality.
3. **Check** — Subscribe to `$isDirty` to enable/disable save buttons or show
   warnings.
4. **Reset** — Call `initEdit(newServerData)` after a successful save to capture
   the new baseline.

Examples:

- `src/routes/quality-profiles/[databaseId]/[id]/languages/+page.svelte` —
  Tracks language selection changes. Save button disabled until dirty.
- `src/routes/quality-profiles/[databaseId]/[id]/qualities/+page.svelte` —
  Tracks drag-and-drop reordering of quality tiers. Shows a sticky save bar only
  when dirty.
- `src/routes/custom-formats/[databaseId]/components/GeneralForm.svelte` —
  Handles both create and edit modes. Uses `initCreate()` for new formats,
  `initEdit()` for existing ones.
- `src/routes/arr/[id]/sync/+page.svelte` — Aggregates dirty state from three
  child components (QualityProfiles, DelayProfiles, MediaManagement). Prevents
  syncing while there are unsaved changes.
- `src/lib/client/ui/modal/DirtyModal.svelte` — Global navigation guard. Uses
  `beforeNavigate` to intercept route changes and prompt the user if dirty.

#### Actions Bar

Entity list pages use a horizontal toolbar for filters, search, and view
toggles. The components live in `src/lib/client/ui/actions/`:

- **ActionsBar** — Container that groups child components. Uses negative margins
  and CSS to make buttons appear connected (shared borders, rounded corners only
  on the ends).
- **ActionButton** — Icon button with optional hover dropdown. Can be square or
  variable width.
- **SearchAction** — Search input with debounce, integrates with a search store.
- **ViewToggle** — Dropdown to switch between card and table views.

**Do not add custom margins, gaps, or wrapper divs between items inside
ActionsBar.** The component relies on direct children to calculate border
radius. Adding spacing breaks the connected appearance.

```svelte
<!-- Correct -->
<ActionsBar>
  <ActionButton icon={Filter} />
  <SearchAction {searchStore} />
  <ViewToggle bind:value={viewMode} />
</ActionsBar>

<!-- Wrong - gap breaks connected styling -->
<ActionsBar class="gap-2">
  <ActionButton icon={Filter} />
  <SearchAction {searchStore} />
</ActionsBar>

<!-- Wrong - wrapper div breaks border radius -->
<ActionsBar>
  <div class="flex">
    <ActionButton icon={Filter} />
  </div>
  <SearchAction {searchStore} />
</ActionsBar>
```

Examples:

- `src/routes/quality-profiles/[databaseId]/+page.svelte`
- `src/routes/custom-formats/[databaseId]/+page.svelte`
- `src/routes/arr/[id]/library/components/LibraryActionBar.svelte`

#### Dropdowns

Hover-triggered dropdown menus live in `src/lib/client/ui/dropdown/`:

- **Dropdown** — Positioned container for dropdown content. Has an invisible
  hover bridge so the menu stays open when moving the mouse from trigger to
  content. Supports `left`, `right`, or `middle` positioning.
- **DropdownItem** — Individual menu item with icon, label, and optional
  `selected` checkmark. Supports `disabled` and `danger` variants.
- **CustomGroupManager** — Specialized component for managing user-defined
  filter groups (used in library filtering).

Dropdowns are typically placed inside an `ActionButton` with
`hasDropdown={true}` using the `slot="dropdown"` pattern. See
`ViewToggle.svelte` for a simple example.

#### Tables

Data tables live in `src/lib/client/ui/table/`:

- **Table** — Generic data table with typed column definitions. Supports sorting
  (click column headers to cycle asc/desc/none), custom cell renderers, row
  click handlers, compact mode, and an `actions` slot for row-level buttons.
  Column definitions include `key`, `header`, `sortable`, `align`, `width`, and
  optional `cell` render function.

- **ExpandableTable** — Rows expand on click to reveal additional content via
  the `expanded` slot. Chevron indicators show expand state. Supports
  `chevronPosition` (left/right), `flushExpanded` for edge-to-edge content, and
  external control of `expandedRows`.

- **ReorderableList** — Drag-and-drop list for reordering items. Uses a
  sensitivity threshold to prevent flickering during drags. Calls `onReorder`
  with the new array after each move.

Column types are defined in `types.ts`. Key properties:

- `sortable` — enables click-to-sort on the column header
- `sortAccessor` — function to extract the sort value (useful when display
  differs from sort order)
- `sortComparator` — custom comparison function for complex sorting
- `cell` — render function returning a string, HTML object, or Svelte component

#### Stores

Svelte stores live in `src/lib/client/stores/`. Two patterns exist: factory
functions that create store instances, and singleton stores.

**Factory Stores**

Use factory functions when each page needs its own isolated state:

- `createSearchStore()` — Debounced search with filters. Returns methods for
  `setQuery()`, `setFilter()`, `clear()`, and a `filterItems()` helper.
- `createDataPageStore()` — Combines search with view toggle (table/cards).
  Persists view mode to localStorage. Returns `search`, `view`, and `filtered`
  derived store.

```typescript
import { createDataPageStore } from "$stores/dataPage";

const { search, view, filtered } = createDataPageStore(data.profiles, {
  storageKey: "qualityProfilesView",
  searchKeys: ["name", "description"],
});

// Use in template
{#each $filtered as profile}
```

**Singleton Stores**

Export instances directly for app-wide state:

- `themeStore` — Dark/light mode
- `accentStore` — Accent color
- `sidebarCollapsed` — Sidebar state
- `alertStore` — Global alerts (imported via `$alerts/store`)
- `libraryCache` — Per-instance library data cache

**Dirty Store**

The dirty store (`dirty.ts`) is documented above in Dirty Tracking. It's a
singleton but with methods that make it behave like a state machine for form
change detection.

### Backend

Server-side code lives in `src/lib/server/`. Profilarr uses two separate data
stores: the main SQLite database for application state (Arr connections,
settings, job history), and PCD git repositories for versioned configuration
(profiles, formats, media settings). The main database tracks _which_ PCDs are
linked and _how_ to sync them. The PCDs contain _what_ gets synced.

Key directories:

- **db/** — Main SQLite database (app state, settings, job history)
- **pcd/** — PCD cache management (compile, watch, query)
- **jobs/** — Background job scheduler and definitions
- **sync/** — Logic for pushing configs to Arr instances
- **upgrades/** — Automatic quality upgrade processing
- **notifications/** — Discord/Slack/Email delivery
- **utils/** — Shared utilities (arr clients, git, http, logger, config, cache)

#### Utils

Shared utilities live in `src/lib/server/utils/`. These are foundational modules
used throughout the backend.

**Config**

The config singleton (`config/config.ts`) is the most important utility. It
centralizes all application paths and environment configuration. Import it via
`$config`.

```typescript
import { config } from "$config";

// Paths
config.paths.base; // Application root
config.paths.logs; // Log directory
config.paths.data; // Data directory
config.paths.database; // SQLite database file
config.paths.databases; // PCD repositories directory
config.paths.backups; // Backup directory

// Server
config.port; // HTTP port (default: 6868)
config.host; // Bind address (default: 0.0.0.0)
config.serverUrl; // Display URL (http://localhost:6868)

// Services
config.parserUrl; // Parser microservice URL
config.timezone; // System timezone
```

The base path defaults to the executable's directory but can be overridden via
`APP_BASE_PATH`. Call `config.init()` on startup to create required directories.

**Logger**

The logger (`logger/logger.ts`) handles console and file output with daily
rotation. Import via `$logger/logger.ts`.

```typescript
import { logger } from "$logger/logger.ts";

await logger.debug("Cache miss", { source: "PCD", meta: { id: 1 } });
await logger.info("Sync completed", { source: "Sync" });
await logger.warn("Rate limited", { source: "GitHub" });
await logger.error("Connection failed", { source: "Arr", meta: error });
```

Log levels: DEBUG → INFO → WARN → ERROR. Users configure the minimum level in
settings. File logs are JSON (one entry per line), console logs are colored.

**Logging guidelines:**

- **DEBUG** — Internal state, cache hits/misses, detailed flow. Developers only.
  Use liberally during development but ensure production logs aren't flooded.
- **INFO** — User-relevant events: sync completed, backup created, job finished.
  Think of these as feedback for the user, similar to alerts in the frontend.
  Keep them concise and actionable.
- **WARN** — Recoverable issues: rate limits, missing optional config, fallback
  behavior triggered.
- **ERROR** — Failures requiring attention: connection errors, invalid data,
  unhandled exceptions.

Good logs are concise and contextual. Include `source` to identify the
subsystem. Include `meta` for structured data that helps debugging. Avoid
verbose messages or logging the same event multiple times.

```typescript
// Good
await logger.info("Synced 5 profiles to Radarr", { source: "Sync" });

// Bad - too verbose, no source
await logger.info("Starting to sync profiles now...");
await logger.info("Found 5 profiles to sync");
await logger.info("Syncing profile 1...");
await logger.info("Syncing profile 2...");
```

**HTTP**

The HTTP client (`http/client.ts`) provides a base class with connection pooling
and retry logic. Arr clients extend this.

```typescript
import { BaseHttpClient } from "$http/client.ts";

class MyClient extends BaseHttpClient {
  constructor(url: string) {
    super(url, {
      timeout: 30000, // Request timeout (ms)
      retries: 3, // Retry count for 5xx errors
      retryDelay: 500, // Base delay (exponential backoff)
      headers: { Authorization: "Bearer token" },
    });
  }
}

const client = new MyClient("https://api.example.com");
const data = await client.get<Response>("/endpoint");
client.close(); // Release connection pool
```

Features:

- Connection pooling via `Deno.createHttpClient()`
- Automatic retries with exponential backoff for 500/502/503/504
- Configurable timeout with AbortController
- JSON request/response handling
- `HttpError` class with status code and response body

Always call `close()` when done to release pooled connections.

**Git**

Git operations (`git/`) wrap command-line git for PCD repository management.

The `Git` class (`Git.ts`) provides a clean interface per repository:

```typescript
import { Git } from "$utils/git/index.ts";

const git = new Git("/path/to/repo");

// Repository operations
await git.fetch();
await git.pull();
await git.push();
await git.checkout("main");
await git.resetToRemote();

// Status queries
const branch = await git.getBranch();
const status = await git.status();
const updates = await git.checkForUpdates();
const commits = await git.getCommits(10);

// PCD operation files
const uncommitted = await git.getUncommittedOps();
const maxOp = await git.getMaxOpNumber();
await git.discardOps(filepaths);
await git.addOps(filepaths, "commit message");
```

Key modules:

- `repo.ts` — Clone, fetch, pull, push, checkout, reset, stage, commit
- `status.ts` — Branch info, status, update checks, commit history, diffs
- `ops.ts` — PCD-specific operations: parse operation metadata, get uncommitted
  ops, renumber and commit ops

The `clone()` function in `repo.ts` validates GitHub URLs via API before
cloning, detects private repositories, and handles PAT authentication.

**Cache**

Simple in-memory cache with TTL (`cache/cache.ts`):

```typescript
import { cache } from "$cache/cache.ts";

cache.set("key", data, 300); // TTL in seconds
const value = cache.get<Type>("key"); // Returns undefined if expired
cache.delete("key");
cache.deleteByPrefix("library:"); // Clear related entries
cache.clear();
```

Used for expensive computations like library data fetching. Not persisted across
restarts.

**AI**

Optional AI integration (`ai/client.ts`) for generating commit messages from
diffs. Supports OpenAI-compatible APIs including local models.

```typescript
import { isAIEnabled, generateCommitMessage } from "$utils/ai/client.ts";

if (isAIEnabled()) {
  const message = await generateCommitMessage(diffText);
}
```

Configured via settings UI (API URL, model, optional API key). Uses Chat
Completions API for most models, Responses API for GPT-5.

#### Main Database

SQLite database in `src/lib/server/db/`. No ORM—raw SQL with typed wrappers.

Migrations live in `migrations/` as numbered TypeScript files. Each exports a
`migration` object with `version`, `name`, `up` (SQL), and optional `down`. New
migrations must be imported and added to the array in `migrations.ts`, and
`schema.sql` must be updated to reflect the current schema. Migrations run
automatically on startup in order.

Examples:

- `src/lib/server/db/migrations/001_create_arr_instances.ts`
- `src/lib/server/db/migrations/007_create_notification_tables.ts`
- `src/lib/server/db/schema.sql`

All queries live in `queries/`, one file per table. Each file exports a query
object (e.g., `arrInstancesQueries`) with typed methods for CRUD operations.
**Queries are not written anywhere else in the codebase**—route handlers and
other code import from `queries/` rather than writing SQL inline.

Examples:

- `src/lib/server/db/queries/arrInstances.ts`
- `src/lib/server/db/queries/jobs.ts`

#### PCD (Profilarr Compliant Database)

PCDs are git repositories containing versioned configuration data—quality
profiles, custom formats, delay profiles, media management settings, and regular
expressions. Unlike the main database which stores application state directly,
PCDs store _operations_: append-only SQL files that are replayed to build an
in-memory database. This design enables git-based versioning, conflict-free
merging, and layered customization.

Every PCD depends on a shared schema repository
([github.com/Dictionarry-Hub/schema](https://github.com/Dictionarry-Hub/schema))
that defines the base tables. The official database is
[github.com/Dictionarry-Hub/db](https://github.com/Dictionarry-Hub/db).

**Operational SQL (OSQL)**

PCDs use an append-only approach where each change is written as a numbered SQL
file. Instead of mutating rows directly, you append INSERT, UPDATE, or DELETE
statements. When the cache compiles, it replays all operations in order to build
the current state. This makes every change trackable in git history and enables
non-destructive layering.

**Layers**

Operations are loaded and executed in a specific order:

1. **Schema** (`deps/schema/ops/`) — Table definitions and seed data from the
   schema dependency. Creates the database structure.

2. **Base** (`ops/`) — The PCD's main configuration data. Quality profiles,
   custom formats, and other entities maintained by the database author.

3. **Tweaks** (`tweaks/`) — Optional adjustments that apply on top of base.
   Useful for variant configurations or environment-specific overrides.

4. **User** (`user_ops/`) — Local modifications made by the end user. These stay
   on the user's machine and persist across pulls from upstream.

Files within each layer are sorted by numeric prefix (`1.initial.sql`,
`2.add-formats.sql`, etc.) and executed in order.

**Repository Layout**

```
my-pcd/
├── pcd.json           # Manifest file
├── ops/               # Base layer operations
│   ├── 1.initial.sql
│   └── 2.custom-formats.sql
├── deps/
│   └── schema/        # Schema dependency (git submodule)
│       └── ops/
├── tweaks/            # Optional tweaks layer
└── user_ops/          # User modifications (gitignored)
```

**Manifest**

Every PCD requires a `pcd.json` manifest:

```json
{
  "name": "my-database",
  "version": "1.0.0",
  "description": "Custom Arr configurations",
  "dependencies": {
    "https://github.com/Dictionarry-Hub/schema": "main"
  },
  "arr_types": ["radarr", "sonarr"],
  "profilarr": {
    "minimum_version": "2.0.0"
  }
}
```

**Cache Compilation**

When Profilarr loads a PCD, it creates an in-memory SQLite database and replays
all operations in layer order. The `PCDCache` class in
`src/lib/server/pcd/cache.ts` handles this:

1. Creates an in-memory SQLite database
2. Registers helper functions (`qp()`, `cf()`, `dp()`, `tag()`) for entity
   lookups
3. Loads operations from all layers via `loadAllOperations()`
4. Executes each SQL file in order
5. Exposes the compiled database through Kysely for type-safe queries

File watchers monitor the ops directories. When a `.sql` file changes, the cache
automatically recompiles after a short debounce.

**Writing Operations**

When users edit entities through the frontend, changes are not applied directly
to the in-memory cache. Instead, `src/lib/server/pcd/writer.ts` generates SQL
files and writes them to the appropriate layer:

- **Base layer** (`ops/`) — For database maintainers with push access. Requires
  a personal access token.
- **User layer** (`user_ops/`) — For local modifications. No authentication
  required.

The writer converts Kysely queries to executable SQL, assigns the next sequence
number, and writes the file. After writing, it triggers a cache recompile so
changes appear immediately.

```typescript
// Example: writer converts this Kysely query to a .sql file
await writeOperation({
  databaseId: 1,
  layer: "user",
  description: "update-profile-score",
  queries: [compiledKyselyQuery],
  metadata: {
    operation: "update",
    entity: "quality_profile",
    name: "HD Bluray + WEB",
  },
});
```

This writes `user_ops/5.update-profile-score.sql` with the SQL and metadata
header, then recompiles the cache.

**Queries**

PCD queries live in `src/lib/server/pcd/queries/`, organized by entity type.
Each query file exports functions that use the `PCDCache` instance to read
compiled data:

- `src/lib/server/pcd/queries/qualityProfiles/` — List, get, create, update
- `src/lib/server/pcd/queries/customFormats/` — List, get, conditions, tests
- `src/lib/server/pcd/queries/delayProfiles/`
- `src/lib/server/pcd/queries/regularExpressions/`
- `src/lib/server/pcd/queries/mediaManagement/`

#### Sync

The sync module (`src/lib/server/sync/`) pushes compiled PCD configurations to
Arr instances. It reads from the PCD cache, transforms data to match each Arr's
API format, and creates or updates entities by name.

**Architecture**

Syncers extend `BaseSyncer`, which provides a fetch → transform → push pattern:

1. **Fetch** — Read entities from the PCD cache
2. **Transform** — Convert PCD data to Arr API format using transformers
3. **Push** — Create or update entities in the Arr instance (matched by name)

Three syncer implementations handle different entity types:

- `QualityProfileSyncer` — Syncs quality profiles and their dependent custom
  formats. Custom formats sync first so profile references resolve correctly.
- `DelayProfileSyncer` — Syncs delay profiles with protocol preferences and
  bypass settings.
- `MediaManagementSyncer` — Syncs naming conventions, quality definitions, and
  media settings.

**Triggers**

Syncs are triggered by `should_sync` flags in the main database. The processor
evaluates these flags and runs appropriate syncers:

- **Manual** — User clicks "Sync Now" in the UI
- **on_pull** — Triggered after pulling updates from a database repository
- **on_change** — Triggered when PCD files change (detected by file watcher)
- **schedule** — Cron expressions evaluated periodically; marks configs for sync
  when the schedule matches

The `processPendingSyncs()` function in `processor.ts` orchestrates all pending
syncs, iterating through flagged instances and running the appropriate syncers.

**Transformers**

Transformers in `transformers/` convert PCD data structures to Arr API payloads.
They handle differences between Radarr and Sonarr APIs:

- `customFormat.ts` — Transforms custom format conditions to API specifications.
  Maps condition types (release_title, source, resolution) to their API
  implementations and converts values using mappings.
- `qualityProfile.ts` — Transforms quality tiers, language settings, and format
  scores. Handles quality name differences between apps.

**Mappings**

`mappings.ts` contains constants for translating between PCD values and Arr API
values. This includes indexer flags, sources, resolutions, quality definitions,
and languages. Each constant has separate mappings for Radarr and Sonarr where
their APIs differ.

#### Jobs

The job system (`src/lib/server/jobs/`) runs background tasks on schedules. Jobs
handle recurring operations like syncing databases, creating backups, cleaning
up logs, and processing upgrades.

**Components**

- **Registry** (`registry.ts`) — Stores job definitions in memory. Jobs register
  on startup and can be looked up by name.
- **Scheduler** (`scheduler.ts`) — Checks for due jobs every minute and triggers
  execution. Prevents concurrent runs of the same check cycle.
- **Runner** (`runner.ts`) — Executes a job's handler, records the run in the
  database, calculates the next run time, and sends notifications on
  success/failure.
- **Init** (`init.ts`) — Registers all job definitions and syncs them with the
  database on startup.

**Defining Jobs**

Job definitions live in `definitions/`. Each exports a `JobDefinition` with
name, description, schedule (cron expression), and handler function:

```typescript
export const myJob: JobDefinition = {
  name: "my_job",
  description: "Does something useful",
  schedule: "0 * * * *", // Every hour
  handler: async (): Promise<JobResult> => {
    // Job logic here
    return { success: true, output: "Done" };
  },
};
```

Register the job in `init.ts` by importing and calling
`jobRegistry.register(myJob)`.

**Built-in Jobs**

- `sync_arr` — Processes pending syncs to Arr instances (every minute)
- `sync_databases` — Pulls updates from linked database repositories
- `create_backup` — Creates application backups
- `cleanup_backups` — Removes old backups based on retention settings
- `cleanup_logs` — Prunes old log entries
- `upgrade_manager` — Processes automatic quality upgrades

**Job Logic**

Complex job logic lives in `logic/`. Definition files stay thin—they just wire
up the handler to the logic function. This keeps definitions readable and logic
testable.

#### Notifications

The notification system (`src/lib/server/notifications/`) sends alerts to
external services like Discord. It's fire-and-forget: failures are logged but
don't interrupt the calling code.

**Components**

- **NotificationManager** (`NotificationManager.ts`) — Central orchestrator.
  Queries enabled services from the database, filters by notification type, and
  dispatches to appropriate notifiers. Records all attempts in history.
- **Builder** (`builder.ts`) — Fluent API for constructing notifications. Chain
  `.title()`, `.message()`, `.meta()`, and call `.send()`.
- **Notifiers** (`notifiers/`) — Service-specific implementations. Each extends
  `BaseHttpNotifier` and formats payloads for their API.

**Usage**

```typescript
import { notify } from "$notifications/builder.ts";
import { NotificationTypes } from "$notifications/types.ts";

await notify(NotificationTypes.PCD_SYNC_SUCCESS)
  .title("Sync Complete")
  .message("Synced 5 profiles to Radarr")
  .meta({ instanceId: 1, profileCount: 5 })
  .send();
```

**Notification Types**

`types.ts` defines type constants for categorizing notifications:

- `job.<name>.success` / `job.<name>.failed` — Job completion status
- `pcd.linked` / `pcd.unlinked` — Database connection changes
- `pcd.sync_success` / `pcd.sync_failed` — Sync results
- `upgrade.success` / `upgrade.partial` / `upgrade.failed` — Upgrade results

Users configure which types each service receives in the settings UI.

**Planned Services**

Currently only Discord is implemented. Planned additions:

- Telegram
- Slack
- Ntfy
- Apprise
- SMTP (email)
- Generic webhooks

**Adding Notifiers**

To add a new notification service:

1. Create a config interface in `types.ts`
2. Create a notifier class in `notifiers/` extending `BaseHttpNotifier`
3. Implement `getName()`, `getWebhookUrl()`, and `formatPayload()`
4. Add the case to `NotificationManager.createNotifier()`

#### Arr Clients

The arr utilities (`src/lib/server/utils/arr/`) provide typed HTTP clients for
communicating with Radarr, Sonarr, Lidarr, and Chaptarr instances.

**Base Client**

`BaseArrClient` extends `BaseHttpClient` with arr-specific methods: connection
testing, delay profiles, tags, media management config, naming config, quality
definitions, custom formats, and quality profiles. All arr clients inherit from
this base.

**App-Specific Clients**

Each arr has its own client in `clients/` that extends `BaseArrClient` with
app-specific functionality:

- `RadarrClient` — Adds movie operations, library fetching with computed custom
  format scores, search commands, and tag management.
- `SonarrClient` — Series and episode operations.
- `LidarrClient` — Artist and album operations.
- `ChaptarrClient` — Chapter-specific operations.

**Factory**

`createArrClient(type, url, apiKey)` returns the appropriate client instance
based on the arr type. Used throughout the codebase when interacting with arr
instances.

**Library Browser**

The library browser (`src/routes/arr/[id]/library/`) displays downloaded media
with computed custom format scores and cutoff progress.

**Supported:** Radarr only. **TODO:** Sonarr library views.

The page fetches library data via API, which calls `RadarrClient.getLibrary()`.
This pulls movies, quality profiles, and movie files in parallel, then computes:

- **Custom format score** — Sum of matched format scores from the profile
- **Cutoff progress** — Score as percentage of cutoff (0% to 100%+)
- **Score breakdown** — Individual format contributions shown on row expand

Features:

- **Filtering** — Filter by quality name or profile. Multiple filters use OR
  within the same field, AND across fields.
- **Search** — Debounced title search.
- **Column visibility** — Toggle columns on/off, persisted to localStorage.
- **Profilarr profile detection** — Movies using profiles synced from Profilarr
  databases show a blue badge; others show amber with a warning icon.
- **Expandable rows** — Click a row to see filename and score breakdown with
  each format's contribution color-coded (green positive, red negative).
- **Client-side caching** — Library data cached per instance to avoid refetching
  on navigation. Refresh button clears cache and refetches.

#### Upgrades

The upgrade system (`src/lib/server/upgrades/`) solves a fundamental limitation
of how Radarr and Sonarr work. The arrs don't search for the _best_ release—they
monitor RSS feeds and grab the first thing that qualifies as an upgrade. To
actually get optimal releases, you need to trigger manual searches.

Profilarr's upgrade module automates this with configurable filters and
selectors, similar to
[Upgradinatorr](https://github.com/angrycuban13/Just-A-Bunch-Of-Starr-Scripts/blob/main/Upgradinatorr/README.md)
but built directly into the app.

**Shared Types**

Filter and selector logic lives in `src/lib/shared/` so both frontend and
backend use the same definitions:

- `filters.ts` — Filter field definitions (monitored, cutoff_met, year,
  popularity, tmdb_rating, etc.), operators (boolean, number, text, date),
  rule/group types, and the `evaluateGroup()` function that recursively
  evaluates nested AND/OR logic.
- `selectors.ts` — Selector definitions (random, oldest, newest, lowest_score,
  most_popular, least_popular) with their `select()` functions. Each selector
  sorts/shuffles items and returns the top N.

**Processing Flow**

The upgrade processor (`processor.ts`) orchestrates each run:

1. **Fetch** — Pull the entire library from the arr instance along with quality
   profiles and movie files.
2. **Normalize** — Convert arr data to a flat structure with fields matching
   filter rule names (`monitored`, `cutoff_met`, `size_on_disk`, `tmdb_rating`,
   `popularity`, etc.).
3. **Filter** — Call `evaluateGroup()` from `$shared/filters.ts` to evaluate
   rules using AND/OR group logic. Supports nested groups and operators
   appropriate to each field type.
4. **Cooldown** — Remove items that were searched recently. The system uses
   date-based tags (e.g., `profilarr-searched-2026-01-15`) to track when items
   were last searched.
5. **Select** — Call `getSelector()` from `$shared/selectors.ts` to pick which
   items get searched. Options: random, oldest, newest, lowest CF score, most
   popular, least popular.
6. **Search** — Trigger searches via the arr's command API. Tag searched items
   with today's date for cooldown tracking.

**Filter Modes**

When multiple filters are configured:

- **Round Robin** — Cycles through filters in order, one filter per scheduled
  run. Filter index persists across runs.
- **Random** — Picks a random enabled filter each run.

**Dry Run**

Configs can be set to dry run mode, which executes the full filter/select
pipeline but skips the actual search and tagging. Useful for testing filter
logic before enabling real searches.

**Structured Logging**

Each upgrade run produces an `UpgradeJobLog` with detailed metrics: library
size, filter match counts, cooldown effects, selection details, search results.
The logger (`logger.ts`) formats these for the application log.

**Rename (TODO)**

A future rename module will use the same architecture but simpler: instead of
triggering searches, it will trigger rename commands for items matching filters.
Same filter/select flow, different action.

### Microservices

#### Parser

A C# parser module lives in `src/services/parser`. This is a direct port of
Radarr/Sonarr's parsing logic, packaged under a single unified endpoint that
Profilarr uses for its testing functionality. It runs as a separate service and
communicates with the main app over HTTP.

- **.NET 8.0** (`net8.0`)

### API

API routes live in `src/routes/api/`. The API is documented using OpenAPI 3.1
specification in `docs/api/v1/`.

**Documentation Requirement**

When adding a new API endpoint, you must document it in the OpenAPI spec. This
is not optional. The spec serves as the source of truth for API consumers and
generates TypeScript types via `deno task generate:api-types`.

**Spec Structure**

```
docs/api/v1/
├── openapi.yaml       # Main spec file, references paths and schemas
├── paths/             # Endpoint definitions grouped by domain
│   └── system.yaml    # Example: health, openapi endpoints
└── schemas/           # Reusable type definitions
    ├── common.yaml    # Shared types (ComponentStatus, etc.)
    └── health.yaml    # Domain-specific types
```

**Adding an Endpoint**

1. Create or update a path file in `docs/api/v1/paths/`:

```yaml
# paths/databases.yaml
list:
  get:
    operationId: listDatabases
    summary: List all databases
    description: Returns all linked PCD databases
    tags:
      - Databases
    responses:
      "200":
        description: List of databases
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: "../schemas/database.yaml#/Database"
```

2. Reference it in `openapi.yaml`:

```yaml
paths:
  /databases:
    $ref: "./paths/databases.yaml#/list"
```

3. Add any new schemas to `schemas/`:

```yaml
# schemas/database.yaml
Database:
  type: object
  required:
    - id
    - name
    - repositoryUrl
  properties:
    id:
      type: integer
    name:
      type: string
    repositoryUrl:
      type: string
      format: uri
```

4. Run `deno task generate:api-types` to regenerate TypeScript types.

**Route Conventions**

- Return JSON with consistent shapes:
  - Success: `{ success: true, data?: ... }` or just the data
  - Error: `{ success: false, error: "message" }`
- Use appropriate status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not
  Found, 500 Internal Server Error
- Validate input early with guard clauses
- Wrap operations in try-catch, return 500 with error message for unexpected
  failures

**Viewing Docs**

The OpenAPI spec is served at `/api/v1/openapi.json` when the app is running.
You can load this into Swagger UI or other OpenAPI tools to browse the API
interactively
