# Profilarr Architecture Guide

Quick reference for AI assistants working with this codebase.

---

## Overview

**Profilarr** is a SvelteKit + Deno application for managing configurations across *arr applications (Radarr, Sonarr, etc.). It compiles to standalone binaries.

**Stack:** SvelteKit 2, Svelte 5 (using Svelte 4 syntax), TypeScript, Tailwind CSS 4, Deno 2, SQLite, Kysely

**Svelte Syntax:** This codebase uses **Svelte 4 syntax** (`export let` for props, `$:` for reactivity, `createEventDispatcher` for events). Do not use Svelte 5 runes (`$state`, `$props`, `$derived`) except where explicitly noted.

**Key Paths:**
- `src/routes/` - SvelteKit pages and API routes
- `src/lib/server/` - Backend logic
- `src/lib/client/` - Frontend stores and components
- `deno.json` - Import aliases and tasks

---

## Backend

### 1. Database Workflow

SQLite database with WAL mode. `DatabaseManager` is a singleton handling connections, transactions, and health checks.

**Files:**
- `src/lib/server/db/db.ts` - DatabaseManager singleton, transaction support, parametrized queries
- `src/lib/server/db/queries/` - Query files per entity (jobs.ts, arrInstances.ts, notificationServices.ts, etc.)

**Pattern:** Each entity has a queries file exporting `{entity}Queries` with `create()`, `getById()`, `getAll()`, `update()`, `delete()` methods.

---

### 2. Migration System

`MigrationRunner` manages schema changes. Migrations are tracked in a `migrations` table with version, name, and applied_at.

**Files:**
- `src/lib/server/db/migrations.ts` - MigrationRunner class, up/down support
- `src/lib/server/db/migrations/` - 16 migration files (001-016)

**Key migrations:** 004 (jobs), 007 (notifications), 008 (database instances), 011-013 (upgrade configs), 014 (AI settings), 015-016 (sync configs)

---

### 3. Jobs System

Background job scheduler checking for due jobs every 60 seconds. Jobs are registered at startup and stored in the database.

**Files:**
- `src/lib/server/jobs/scheduler.ts` - Scheduler singleton, 60s interval, prevents concurrent execution
- `src/lib/server/jobs/runner.ts` - Executes jobs, calculates next run time, records history
- `src/lib/server/jobs/registry.ts` - In-memory registry mapping job names to definitions
- `src/lib/server/jobs/init.ts` - Registers all jobs at startup
- `src/lib/server/jobs/definitions/` - Job definitions (syncDatabases.ts, syncArr.ts, upgradeManager.ts, etc.)

**Schedule formats:** "daily", "hourly", "*/N minutes"

---

### 4. Notifications System

Pluggable notification system with builder pattern. Sends to enabled services in parallel, records all attempts in history.

**Files:**
- `src/lib/server/notifications/NotificationManager.ts` - Central orchestrator, fire-and-forget pattern
- `src/lib/server/notifications/builder.ts` - Fluent API: `notify(type).title().message().meta().send()`
- `src/lib/server/notifications/types.ts` - Notification type constants (job.success, pcd.linked, upgrade.failed, etc.)
- `src/lib/server/notifications/notifiers/DiscordNotifier.ts` - Discord webhook implementation with embeds

---

### 5. PCDs (Profilarr Compliant Databases)

External git repositories containing configuration profiles. Uses layered SQL operations compiled into an in-memory SQLite cache.

**Files:**
- `src/lib/server/pcd/pcd.ts` - PCDManager singleton (link, unlink, sync, checkForUpdates)
- `src/lib/server/pcd/manifest.ts` - Validates pcd.json manifests
- `src/lib/server/pcd/cache.ts` - PCDCache class, compiles SQL from layers, file watching
- `src/lib/server/pcd/schema.ts` - Kysely schema for PCD database tables
- `src/lib/server/pcd/ops.ts` - Loads .sql files from layer directories
- `src/lib/server/pcd/deps.ts` - Dependency resolution for PCD repos
- `src/lib/server/pcd/types.ts` - TypeScript types for profiles, custom formats, etc.

**Layers (in order):** schema (from deps) → base (ops/) → tweaks (tweaks/) → user (user_ops/)

**SQL helpers:** `qp(name)` (quality profile), `cf(name)` (custom format), `dp(name)` (delay profile), `tag(name)`

---

### 6. Sync Engine

Pushes profiles from PCDs to ARR instances. Handles quality profiles, delay profiles, and media management settings.

**Files:**
- `src/lib/server/sync/` - Sync engine directory
- `src/lib/server/jobs/definitions/syncArr.ts` - Scheduled sync job
- `src/lib/server/db/queries/syncConfigs.ts` - Sync configuration queries
- `src/lib/server/db/migrations/015_create_arr_sync.ts` - Sync config schema
- `src/lib/server/db/migrations/016_add_arr_sync_columns.ts` - Additional sync columns

---

### 7. ARR API Client

3-tier class hierarchy: BaseHttpClient → BaseArrClient → App-specific clients (RadarrClient, SonarrClient, etc.)

**Files:**
- `src/lib/server/utils/http/client.ts` - Base HTTP client with retry logic, connection pooling, exponential backoff
- `src/lib/server/utils/arr/base.ts` - Base ARR client, X-Api-Key auth, connection testing, delay profiles, tags
- `src/lib/server/utils/arr/factory.ts` - Factory function to create client by type
- `src/lib/server/utils/arr/types.ts` - TypeScript types for all ARR APIs
- `src/lib/server/utils/arr/clients/radarr.ts` - Full Radarr implementation (movies, quality profiles, files, search, library)
- `src/lib/server/utils/arr/clients/sonarr.ts` - Sonarr client stub
- `src/lib/server/utils/arr/clients/lidarr.ts` - Lidarr client (API v1)

**Features:** 30s timeout, 3 retries on 5xx, batch operations, custom format scoring

---

### 8. Upgrade Manager

Scheduled job that searches for movies based on filters and selection strategies. Uses tag-based cooldowns.

**Files:**
- `src/lib/server/upgrades/processor.ts` - Main orchestrator for upgrade workflow
- `src/lib/server/upgrades/normalize.ts` - Converts Radarr responses to normalized format
- `src/lib/server/upgrades/cooldown.ts` - Tag-based cooldown (profilarr-searched-YYYY-MM-DD)
- `src/lib/server/upgrades/logger.ts` - Structured logging for upgrade runs
- `src/lib/server/upgrades/types.ts` - Type definitions
- `src/lib/server/jobs/definitions/upgradeManager.ts` - Job definition (every 30 minutes)
- `src/lib/server/jobs/logic/upgradeManager.ts` - Job logic, fetches due configs
- `src/lib/server/db/queries/upgradeConfigs.ts` - Upgrade config CRUD

**Filter modes:** round_robin (cycles through filters), random (picks random filter)

**Dry run:** Tests workflow without triggering actual searches

---

### 9. AI Integration

AI-powered commit message generation using OpenAI-compatible APIs. Generates semantic messages from file diffs.

**Files:**
- `src/lib/server/utils/ai/client.ts` - Core client: `isAIEnabled()`, `generateCommitMessage(diff)`
- `src/lib/server/db/queries/aiSettings.ts` - Singleton settings (get, update, reset)
- `src/lib/server/db/migrations/014_create_ai_settings.ts` - Schema (enabled, api_url, api_key, model)
- `src/routes/api/ai/status/+server.ts` - Check if AI is enabled
- `src/routes/api/databases/[id]/generate-commit-message/+server.ts` - Generate commit message endpoint
- `src/routes/settings/general/components/AISettings.svelte` - Settings UI

**Supports:** OpenAI, Ollama, LM Studio, Claude API (any OpenAI-compatible endpoint)

---

### 10. Git Integration

Git operations for PCD repositories.

**Files:**
- `src/lib/server/utils/git/` - Git utilities
- Key operations: clone, pull, checkout, status, update detection, private repo support (PAT)

---

### 11. Configuration System

Centralized configuration with paths and environment variables.

**Files:**
- `src/lib/server/utils/config/config.ts` - Paths (database, data, backups, logs), timezone support

---

### 12. Logging

Structured logging with source tracking and log levels.

**Files:**
- `src/lib/server/utils/logger/` - Logger utilities with levels (info, warn, error, debug)

---

## Frontend

### 13. Accent Variable System

7 color palettes with 11 shades each (50-950). Uses CSS custom properties dynamically set via JavaScript.

**Files:**
- `src/app.css` - CSS variables for accent colors (lines 7-43), @theme block for Tailwind
- `src/lib/client/stores/accent.ts` - AccentColor type, color palettes, localStorage persistence, `applyAccentColors()`
- `src/lib/client/ui/navigation/navbar/accentPicker.svelte` - Color picker UI

**Colors:** blue, yellow, green, orange, teal, purple, rose

**Usage:** `bg-accent-600`, `text-accent-500`, `border-accent-300` in Tailwind classes

---

### 14. Theme System

Light/dark mode via class-based Tailwind. Uses View Transitions API for smooth switching.

**Files:**
- `src/lib/client/stores/theme.ts` - Theme store, localStorage persistence, applies class to document.documentElement
- `src/lib/client/ui/navigation/navbar/themeToggle.svelte` - Toggle button with Sun/Moon icons

**Usage:** `dark:bg-neutral-900`, `dark:text-white` prefixes in Tailwind classes

---

### 15. Reusable UI Components

30+ components organized by functionality in `src/lib/client/ui/`.

**Buttons:**
- `src/lib/client/ui/button/Button.svelte` - Variants (primary, secondary, danger), sizes (sm, md), icon support

**Forms:**
- `src/lib/client/ui/form/FormInput.svelte` - Text input + textarea with label, description
- `src/lib/client/ui/form/NumberInput.svelte` - Numeric with increment/decrement buttons
- `src/lib/client/ui/form/TagInput.svelte` - Tag entry with Enter key, backspace deletion
- `src/lib/client/ui/form/IconCheckbox.svelte` - Checkbox with icon, 3 shapes, custom colors

**Tables:**
- `src/lib/client/ui/table/Table.svelte` - Generic table with TypeScript generics, sorting, custom cell renderers
- `src/lib/client/ui/table/ExpandableTable.svelte` - Table with row expansion
- `src/lib/client/ui/table/ReorderableList.svelte` - Drag-and-drop list
- `src/lib/client/ui/table/types.ts` - Column definitions

**Modals:**
- `src/lib/client/ui/modal/Modal.svelte` - Base modal with backdrop, Escape key, confirm/cancel
- `src/lib/client/ui/modal/SaveTargetModal.svelte` - Two-option modal (User/Base layer)
- `src/lib/client/ui/modal/UnsavedChangesModal.svelte` - Unsaved changes warning
- `src/lib/client/ui/modal/InfoModal.svelte` - Information-only modal

**Navigation:**
- `src/lib/client/ui/navigation/navbar/navbar.svelte` - Top navbar with logo, accent picker, theme toggle
- `src/lib/client/ui/navigation/pageNav/pageNav.svelte` - Left sidebar with hierarchical groups
- `src/lib/client/ui/navigation/tabs/Tabs.svelte` - Tab navigation

**Actions:**
- `src/lib/client/ui/actions/ActionsBar.svelte` - Container for inline action buttons
- `src/lib/client/ui/actions/ActionButton.svelte` - Icon button for toolbars
- `src/lib/client/ui/actions/SearchAction.svelte` - Search input with debouncing
- `src/lib/client/ui/actions/ViewToggle.svelte` - Table/card view toggle

**Dropdowns:**
- `src/lib/client/ui/dropdown/Dropdown.svelte` - Positioned dropdown menu
- `src/lib/client/ui/dropdown/DropdownItem.svelte` - Menu item

**State:**
- `src/lib/client/ui/state/EmptyState.svelte` - Empty data placeholder

---

### 16. Colocation Strategy

Route-based colocation: page-specific components live in route folders, shared UI in `src/lib/client/ui/`.

**Pattern:**
```
src/routes/delay-profiles/[databaseId]/
├── +page.svelte              # Page component
├── +page.server.ts           # Server-side logic
├── components/               # Page-specific components
│   └── DelayProfileForm.svelte
└── views/                    # View variations
    ├── CardView.svelte
    └── TableView.svelte
```

**Examples:**
- `src/routes/delay-profiles/[databaseId]/components/DelayProfileForm.svelte`
- `src/routes/databases/components/InstanceForm.svelte`
- `src/routes/quality-profiles/[databaseId]/views/CardView.svelte`

---

### 17. State Management

Svelte stores for global state with localStorage persistence.

**Files:**
- `src/lib/client/stores/theme.ts` - Theme (light/dark)
- `src/lib/client/stores/accent.ts` - Accent color
- `src/lib/client/stores/search.ts` - Search state with debouncing, filters, derived stores
- `src/lib/client/stores/dataPage.ts` - `createDataPageStore()` combining search + view toggle + filtering
- `src/lib/client/stores/libraryCache.ts` - Client-side Radarr library cache
- `src/lib/client/alerts/store.ts` - Toast notifications (success, error, warning, info)

**Data Page Pattern:**
```typescript
const { search, view, filtered, setItems } = createDataPageStore(data, {
  storageKey: 'delayProfilesView',
  searchKeys: ['name']
});
```

---

### 18. Form Enhancement

SvelteKit `enhance` directive for progressive enhancement with loading states and alerts.

**Pattern:**
```svelte
<form method="POST" use:enhance={() => {
  isLoading = true;
  return async ({ result, update }) => {
    if (result.type === 'failure') alertStore.add('error', msg);
    else if (result.type === 'redirect') alertStore.add('success', msg);
    await update();
    isLoading = false;
  };
}}>
```

---

### 19. Unsaved Changes Detection

Tracks dirty state and prompts user before navigation.

**Files:**
- `src/lib/client/utils/unsavedChanges.svelte.ts` - Exception using Svelte 5 `$state` rune; provides `markDirty()`, `confirmNavigation()`, `confirmDiscard()`, `cancelDiscard()`

---

## Architecture

### 20. Import Aliases

Defined in `deno.json` for clean imports:

| Alias | Path |
|-------|------|
| `$lib/` | `src/lib/` |
| `$config` | `src/lib/server/utils/config/config.ts` |
| `$logger/` | `src/lib/server/utils/logger/` |
| `$db/` | `src/lib/server/db/` |
| `$jobs/` | `src/lib/server/jobs/` |
| `$arr/` | `src/lib/server/utils/arr/` |
| `$notifications/` | `src/lib/server/notifications/` |
| `$pcd/` | `src/lib/server/pcd/` |
| `$stores/` | `src/lib/client/stores/` |
| `$ui/` | `src/lib/client/ui/` |

---

### 21. Server Initialization

Boot sequence in `src/hooks.server.ts`:

1. Initialize configuration (env vars, paths)
2. Log startup banner
3. Initialize database connection
4. Run database migrations
5. Load log settings from database
6. Initialize PCD caches
7. Initialize job system
8. Start job scheduler

---

### 22. Build & Deployment

**Development:**
```bash
deno run -A npm:vite dev  # Port 6969
```

**Production:**
```bash
deno run -A npm:vite build
deno compile --target x86_64-unknown-linux-gnu --output dist/linux/profilarr dist/build/mod.ts
deno compile --target x86_64-pc-windows-msvc --output dist/windows/profilarr.exe dist/build/mod.ts
```

**Output:** Standalone binaries in `dist/linux/` and `dist/windows/`
