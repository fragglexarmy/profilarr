# Contributing to Profilarr

Profilarr is a work-in-progress rewrite, so please coordinate larger changes first. This guide explains how the repo is organized and the expected contribution workflows.

## Project Overview

Profilarr is a SvelteKit + Deno app that manages and syncs configurations across \*arr apps using Profilarr Compliant Databases (PCDs). It compiles to standalone binaries.

- **Frontend:** `src/routes/`, `src/lib/client/`
- **Backend:** `src/lib/server/`
- **PCDs:** git repositories cloned under `data/databases/` and compiled into an in-memory SQLite cache

## Prerequisites

- **Deno 2.x**
- **Node + npm** only if you want to run ESLint/Prettier (`deno task lint` or `deno task format`).
- **.NET 8** only if you work on the parser microservice in `services/parser/`.

## Development Commands

- `deno task dev` (default port 6969)
- `deno task test`
- `deno task lint`
- `deno task format`

Useful environment variables:

- `APP_BASE_PATH` (defaults to the compiled binary location)
- `PARSER_HOST`, `PARSER_PORT` (C# parser microservice)
- `PORT`, `HOST`

## Repo Tour

- `docs/ARCHITECTURE.md` — system overview
- `docs/PCD SPEC.md` — operational SQL & layering model
- `docs/manifest.md` — `pcd.json` schema
- `docs/PARSER_PORT_DESIGN.md` — parser microservice
- `services/parser/` — C# parser microservice

## App Database vs PCD Databases

**Profilarr app database**

- SQLite file: `data/profilarr.db`
- Boot sequence initializes config, opens DB, runs migrations, starts job system.
- Migrations live in `src/lib/server/db/migrations/` and are run on startup.

**PCD databases**

- Git repos cloned into `data/databases/<uuid>`.
- Compiled into an in-memory SQLite cache (`PCDCache`) using ordered SQL operations.
- Layers in order: `schema` → `base` → `tweaks` → `user`.
- SQL helper functions available inside PCD ops: `qp`, `cf`, `dp`, `tag`.

## Adding a Migration

1. Copy `src/lib/server/db/migrations/_template.ts` to a new file like `021_add_foo.ts`.
2. Update `version` and `name`, then fill out `up` SQL and (ideally) `down` SQL.
3. Add a static import in `src/lib/server/db/migrations.ts`.
4. Add the new migration to `loadMigrations()` (keep sequential ordering).

Notes:

- Versions must be unique and sequential.
- Never edit an applied migration; create a new one instead.
- Migrations run automatically on server startup.

## Working with PCDs

**PCD layout**

```
my-pcd/
├── pcd.json
├── ops/
└── tweaks/
```

**Authoring operations**

- Follow the append-only Operational SQL approach.
- Use expected-value guards in `UPDATE` statements to surface conflicts.
- New ops go in `ops/` or `tweaks/` depending on intent.

**User ops**

Profilarr writes user edits via `src/lib/server/pcd/writer.ts` into `user_ops/`, rebuilding the in-memory cache after write.

## Client UI Components

Shared UI lives in `src/lib/client/ui/`. Route-specific components live next to their routes.

**Alerts and toasts**

- Store: `src/lib/client/alerts/store.ts`
- Use the alert store for success/error/info toasts in `enhance` actions and API responses.

**Actions and toolbars**

- `src/lib/client/ui/actions/ActionsBar.svelte`
- `src/lib/client/ui/actions/ActionButton.svelte`
- `src/lib/client/ui/actions/SearchAction.svelte`
- `src/lib/client/ui/actions/ViewToggle.svelte`

**Dropdowns**

- `src/lib/client/ui/dropdown/Dropdown.svelte`
- `src/lib/client/ui/dropdown/DropdownItem.svelte`

**Buttons**

- `src/lib/client/ui/button/Button.svelte` (variants + sizes)

**Forms**

- `FormInput`, `NumberInput`, `TagInput`, `IconCheckbox`

**Tables and lists**

- `Table`, `ExpandableTable`, `ReorderableList`

**Modals**

- `Modal`, `SaveTargetModal`, `UnsavedChangesModal`, `InfoModal`

**Navigation**

- `navbar`, `pageNav`, `tabs`

**State and empty views**

- `EmptyState`

## Svelte Conventions

- Use Svelte 4 syntax (`export let`, `$:`) even though Svelte 5 is installed.
- Avoid Svelte 5 runes unless explicitly used in that module.
- Route-specific components should be colocated under their route directory.

## Tests

- Tests live in `src/tests/` and run with `deno task test`.
- Base test utilities are in `src/tests/base/BaseTest.ts`.
- Many tests create temp dirs under `/tmp/profilarr-tests`.

## Parser Microservice (Optional)

If you touch parser-related code, see `docs/PARSER_PORT_DESIGN.md` and `services/parser/`.

- `dotnet run` from `services/parser/`
- Configure `PARSER_HOST` / `PARSER_PORT` in Profilarr
