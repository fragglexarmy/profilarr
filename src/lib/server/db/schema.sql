-- Profilarr Database Schema
-- This file documents the current database schema after all migrations
-- DO NOT execute this file directly - use migrations instead
-- Last updated: 2026-01-16

-- ==============================================================================
-- TABLE: migrations
-- Purpose: Track applied database migrations
-- Managed by: MigrationRunner (src/db/migrations.ts)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: arr_instances
-- Purpose: Store configuration for *arr application instances (Radarr, Sonarr, etc.)
-- Migration: 001_create_arr_instances.ts
-- ==============================================================================

CREATE TABLE arr_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Instance identification
    name TEXT NOT NULL UNIQUE,              -- User-friendly name (e.g., "Main Radarr", "4K Sonarr")
    type TEXT NOT NULL,                     -- Instance type: radarr, sonarr, readarr, lidarr, prowlarr

    -- Connection details
    url TEXT NOT NULL,                      -- Base URL (e.g., "http://localhost:7878")
    api_key TEXT NOT NULL,                  -- API key for authentication

    -- Configuration
    tags TEXT,                              -- JSON array of tags (e.g., '["movies","4k"]')
    enabled INTEGER NOT NULL DEFAULT 1,     -- 1=enabled, 0=disabled

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: log_settings
-- Purpose: Store configurable logging settings (singleton pattern with id=1)
-- Migration: 003_create_log_settings.ts, 006_simplify_log_settings.ts, 019_default_log_level_debug.ts
-- ==============================================================================

CREATE TABLE log_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- Retention
    retention_days INTEGER NOT NULL DEFAULT 30,

    -- Log Level (default changed to DEBUG in migration 019)
    min_level TEXT NOT NULL DEFAULT 'DEBUG' CHECK (min_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),

    -- Enable/Disable
    enabled INTEGER NOT NULL DEFAULT 1,
    file_logging INTEGER NOT NULL DEFAULT 1,
    console_logging INTEGER NOT NULL DEFAULT 1,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: jobs
-- Purpose: Store job definitions and schedules
-- Migration: 004_create_jobs_tables.ts
-- ==============================================================================

CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Job identification
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Scheduling
    schedule TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,

    -- Execution tracking
    last_run_at DATETIME,
    next_run_at DATETIME,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: job_runs
-- Purpose: Store execution history for each job
-- Migration: 004_create_jobs_tables.ts
-- ==============================================================================

CREATE TABLE job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign key to jobs
    job_id INTEGER NOT NULL,

    -- Execution status
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),

    -- Timing
    started_at DATETIME NOT NULL,
    finished_at DATETIME NOT NULL,
    duration_ms INTEGER NOT NULL,

    -- Output
    error TEXT,
    output TEXT,

    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: backup_settings
-- Purpose: Store configurable backup settings (singleton pattern with id=1)
-- Migration: 005_create_backup_settings.ts
-- ==============================================================================

CREATE TABLE backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- Backup Configuration
    schedule TEXT NOT NULL DEFAULT 'daily',
    retention_days INTEGER NOT NULL DEFAULT 30,
    enabled INTEGER NOT NULL DEFAULT 1,
    include_database INTEGER NOT NULL DEFAULT 1,
    compression_enabled INTEGER NOT NULL DEFAULT 1,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: notification_services
-- Purpose: Store notification service configurations (Discord, Slack, Email, etc.)
-- Migration: 007_create_notification_tables.ts
-- ==============================================================================

CREATE TABLE notification_services (
    id TEXT PRIMARY KEY,                        -- UUID

    -- Service identification
    name TEXT NOT NULL,                         -- User-defined: "Main Discord", "Error Alerts"
    service_type TEXT NOT NULL,                 -- 'discord', 'slack', 'email', etc.

    -- Configuration
    enabled INTEGER NOT NULL DEFAULT 0,         -- Master on/off switch
    config TEXT NOT NULL,                       -- JSON blob: { webhook_url: "...", username: "...", ... }
    enabled_types TEXT NOT NULL,                -- JSON array: ["job.backup.success", "job.backup.failed"]

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: notification_history
-- Purpose: Track notification delivery history for auditing and debugging
-- Migration: 007_create_notification_tables.ts
-- ==============================================================================

CREATE TABLE notification_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Foreign key to notification service
    service_id TEXT NOT NULL,

    -- Notification details
    notification_type TEXT NOT NULL,            -- e.g., 'job.backup.success'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,                              -- JSON blob for additional context

    -- Delivery status
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error TEXT,                                 -- Error message if status = 'failed'

    -- Timing
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (service_id) REFERENCES notification_services(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: database_instances
-- Purpose: Store linked Profilarr Compliant Database (PCD) repositories
-- Migration: 008_create_database_instances.ts, 009_add_personal_access_token.ts, 010_add_is_private.ts
-- ==============================================================================

CREATE TABLE database_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Instance identification
    uuid TEXT NOT NULL UNIQUE,                  -- UUID for filesystem storage path
    name TEXT NOT NULL UNIQUE,                  -- User-friendly name (e.g., "Dictionarry DB")

    -- Repository connection
    repository_url TEXT NOT NULL,               -- Git repository URL
    personal_access_token TEXT,                 -- PAT for private repos and push access (Migration 009)
    is_private INTEGER NOT NULL DEFAULT 0,      -- 1=private repo, 0=public (auto-detected, Migration 010)

    -- Local storage
    local_path TEXT NOT NULL,                   -- Path where repo is cloned (data/databases/{uuid})

    -- Sync settings
    sync_strategy INTEGER NOT NULL DEFAULT 0,   -- 0=manual check, >0=auto-check every X minutes
    auto_pull INTEGER NOT NULL DEFAULT 0,       -- 0=notify only, 1=auto-pull updates

    -- Status
    enabled INTEGER NOT NULL DEFAULT 1,         -- 1=enabled, 0=disabled
    last_synced_at DATETIME,                    -- Timestamp of last successful sync

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: upgrade_configs
-- Purpose: Store upgrade configuration per arr instance for automated quality upgrades
-- Migration: 011_create_upgrade_configs.ts, 012_add_upgrade_last_run.ts, 013_add_upgrade_dry_run.ts
-- ==============================================================================

CREATE TABLE upgrade_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Relationship (one config per arr instance)
    arr_instance_id INTEGER NOT NULL UNIQUE,

    -- Core settings
    enabled INTEGER NOT NULL DEFAULT 0,         -- Master on/off switch
    dry_run INTEGER NOT NULL DEFAULT 0,         -- 1=dry run mode, 0=normal (Migration 013)
    schedule INTEGER NOT NULL DEFAULT 360,      -- Run interval in minutes (default 6 hours)
    filter_mode TEXT NOT NULL DEFAULT 'round_robin', -- 'round_robin' or 'random'

    -- Filters (stored as JSON array of FilterConfig objects)
    filters TEXT NOT NULL DEFAULT '[]',

    -- State tracking
    current_filter_index INTEGER NOT NULL DEFAULT 0, -- For round-robin mode
    last_run_at DATETIME,                            -- When upgrade job last ran (Migration 012)

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (arr_instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: ai_settings
-- Purpose: Store AI/LLM configuration for commit message generation
-- Migration: 014_create_ai_settings.ts
-- ==============================================================================

CREATE TABLE ai_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- Provider settings
    provider TEXT NOT NULL DEFAULT 'openai',    -- 'openai', 'anthropic', etc.
    api_key TEXT,                               -- Encrypted API key
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',  -- Model identifier

    -- Feature flags
    enabled INTEGER NOT NULL DEFAULT 0,         -- Master on/off switch

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: arr_sync_quality_profiles
-- Purpose: Store quality profile sync selections (many-to-many)
-- Migration: 015_create_arr_sync_tables.ts
-- ==============================================================================

CREATE TABLE arr_sync_quality_profiles (
    instance_id INTEGER NOT NULL,
    database_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    PRIMARY KEY (instance_id, database_id, profile_id),
    FOREIGN KEY (instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: arr_sync_quality_profiles_config
-- Purpose: Store quality profile sync trigger configuration (one per instance)
-- Migration: 015_create_arr_sync_tables.ts, 016_add_should_sync_flags.ts
-- ==============================================================================

CREATE TABLE arr_sync_quality_profiles_config (
    instance_id INTEGER PRIMARY KEY,
    trigger TEXT NOT NULL DEFAULT 'none',       -- 'none', 'manual', 'on_pull', 'on_change', 'schedule'
    cron TEXT,                                  -- Cron expression for schedule trigger
    should_sync INTEGER NOT NULL DEFAULT 0,     -- Flag for pending sync (Migration 016)
    next_run_at TEXT,                           -- Next scheduled run timestamp (Migration 022)
    FOREIGN KEY (instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: arr_sync_delay_profiles
-- Purpose: Store delay profile sync selections (many-to-many)
-- Migration: 015_create_arr_sync_tables.ts
-- ==============================================================================

CREATE TABLE arr_sync_delay_profiles (
    instance_id INTEGER NOT NULL,
    database_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    PRIMARY KEY (instance_id, database_id, profile_id),
    FOREIGN KEY (instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: arr_sync_delay_profiles_config
-- Purpose: Store delay profile sync trigger configuration (one per instance)
-- Migration: 015_create_arr_sync_tables.ts, 016_add_should_sync_flags.ts
-- ==============================================================================

CREATE TABLE arr_sync_delay_profiles_config (
    instance_id INTEGER PRIMARY KEY,
    trigger TEXT NOT NULL DEFAULT 'none',       -- 'none', 'manual', 'on_pull', 'on_change', 'schedule'
    cron TEXT,                                  -- Cron expression for schedule trigger
    should_sync INTEGER NOT NULL DEFAULT 0,     -- Flag for pending sync (Migration 016)
    next_run_at TEXT,                           -- Next scheduled run timestamp (Migration 022)
    FOREIGN KEY (instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- ==============================================================================
-- TABLE: arr_sync_media_management
-- Purpose: Store media management sync configuration (one per instance)
-- Migration: 015_create_arr_sync_tables.ts, 016_add_should_sync_flags.ts
-- ==============================================================================

CREATE TABLE arr_sync_media_management (
    instance_id INTEGER PRIMARY KEY,
    naming_database_id INTEGER,                 -- Database to use for naming settings
    quality_definitions_database_id INTEGER,    -- Database to use for quality definitions
    media_settings_database_id INTEGER,         -- Database to use for media settings
    trigger TEXT NOT NULL DEFAULT 'none',       -- 'none', 'manual', 'on_pull', 'on_change', 'schedule'
    cron TEXT,                                  -- Cron expression for schedule trigger
    should_sync INTEGER NOT NULL DEFAULT 0,     -- Flag for pending sync (Migration 016)
    next_run_at TEXT,                           -- Next scheduled run timestamp (Migration 022)
    FOREIGN KEY (instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- ==============================================================================
-- INDEXES
-- Purpose: Improve query performance
-- ==============================================================================

-- Jobs indexes (Migration: 004_create_jobs_tables.ts)
CREATE INDEX idx_jobs_enabled ON jobs(enabled);
CREATE INDEX idx_jobs_next_run ON jobs(next_run_at);

-- Job runs indexes (Migration: 004_create_jobs_tables.ts)
CREATE INDEX idx_job_runs_job_id ON job_runs(job_id);
CREATE INDEX idx_job_runs_started_at ON job_runs(started_at);

-- Notification services indexes (Migration: 007_create_notification_tables.ts)
CREATE INDEX idx_notification_services_enabled ON notification_services(enabled);
CREATE INDEX idx_notification_services_type ON notification_services(service_type);

-- Notification history indexes (Migration: 007_create_notification_tables.ts)
CREATE INDEX idx_notification_history_service_id ON notification_history(service_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_notification_history_status ON notification_history(status);

-- Database instances indexes (Migration: 008_create_database_instances.ts)
CREATE INDEX idx_database_instances_uuid ON database_instances(uuid);

-- Upgrade configs indexes (Migration: 011_create_upgrade_configs.ts)
CREATE INDEX idx_upgrade_configs_arr_instance ON upgrade_configs(arr_instance_id);

-- Arr sync indexes (Migration: 015_create_arr_sync_tables.ts)
CREATE INDEX idx_arr_sync_quality_profiles_instance ON arr_sync_quality_profiles(instance_id);
CREATE INDEX idx_arr_sync_delay_profiles_instance ON arr_sync_delay_profiles(instance_id);

-- ==============================================================================
-- TABLE: regex101_cache
-- Purpose: Cache regex101 API responses to avoid redundant fetches
-- Migration: 017_create_regex101_cache.ts
-- ==============================================================================

CREATE TABLE regex101_cache (
    regex101_id TEXT PRIMARY KEY,           -- Versioned ID (e.g., "ABC123/1")
    response TEXT NOT NULL,                 -- Full JSON response with test results
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: app_info
-- Purpose: Store application metadata (singleton pattern with id=1)
-- Migration: 018_create_app_info.ts
-- ==============================================================================

CREATE TABLE app_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version TEXT NOT NULL,                  -- Application version (e.g., "2.0.0")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: tmdb_settings
-- Purpose: Store TMDB API configuration (singleton pattern with id=1)
-- Migration: 020_create_tmdb_settings.ts
-- ==============================================================================

CREATE TABLE tmdb_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- TMDB Configuration
    api_key TEXT NOT NULL DEFAULT '',       -- TMDB API key for authentication

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLE: parsed_release_cache
-- Purpose: Cache parsed release titles from parser microservice
-- Migration: 021_create_parsed_release_cache.ts
-- ==============================================================================

CREATE TABLE parsed_release_cache (
    cache_key TEXT PRIMARY KEY,             -- "{title}:{type}" e.g. "Movie.2024.1080p.WEB-DL:movie"
    parser_version TEXT NOT NULL,           -- Parser version when cached (for invalidation)
    parsed_result TEXT NOT NULL,            -- Full JSON ParseResult from parser
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parsed_release_cache_version ON parsed_release_cache(parser_version);
CREATE INDEX idx_parsed_release_cache_created_at ON parsed_release_cache(created_at);

-- ==============================================================================
-- TABLE: pattern_match_cache
-- Purpose: Cache regex pattern match results to avoid redundant computation
-- Migration: 023_create_pattern_match_cache.ts
-- ==============================================================================

CREATE TABLE pattern_match_cache (
    title TEXT NOT NULL,                    -- Release title being matched
    patterns_hash TEXT NOT NULL,            -- Hash of all patterns (for invalidation)
    match_results TEXT NOT NULL,            -- JSON object: { pattern: boolean }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (title, patterns_hash)
);

CREATE INDEX idx_pattern_match_cache_hash ON pattern_match_cache(patterns_hash);
CREATE INDEX idx_pattern_match_cache_created_at ON pattern_match_cache(created_at);

-- ==============================================================================
-- TABLE: arr_rename_settings
-- Purpose: Store rename configuration per arr instance for bulk file/folder renaming
-- Migration: 024_create_arr_rename_settings.ts, 025_add_rename_notification_mode.ts
-- ==============================================================================

CREATE TABLE arr_rename_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Relationship (one config per arr instance)
    arr_instance_id INTEGER NOT NULL UNIQUE,

    -- Settings
    dry_run INTEGER NOT NULL DEFAULT 1,         -- 1=preview only, 0=make changes
    rename_folders INTEGER NOT NULL DEFAULT 0,  -- 1=rename folders too, 0=files only
    ignore_tag TEXT,                            -- Tag name to skip (items with tag won't be renamed)
    summary_notifications INTEGER NOT NULL DEFAULT 1, -- 1=summary, 0=rich (Migration 025)

    -- Job scheduling
    enabled INTEGER NOT NULL DEFAULT 0,         -- Master on/off switch for scheduled job
    schedule INTEGER NOT NULL DEFAULT 1440,     -- Run interval in minutes (default 24 hours)
    last_run_at DATETIME,                       -- When rename job last ran

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (arr_instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- Arr rename settings indexes (Migration: 024_create_arr_rename_settings.ts)
CREATE INDEX idx_arr_rename_settings_arr_instance ON arr_rename_settings(arr_instance_id);

-- ==============================================================================
-- TABLE: upgrade_runs
-- Purpose: Store upgrade run history for each arr instance
-- Migration: 026_create_upgrade_runs.ts
-- ==============================================================================

CREATE TABLE upgrade_runs (
    id TEXT PRIMARY KEY,                        -- UUID

    -- Relationship
    instance_id INTEGER NOT NULL,               -- Foreign key to arr_instances

    -- Timing
    started_at TEXT NOT NULL,                   -- ISO timestamp when run started
    completed_at TEXT NOT NULL,                 -- ISO timestamp when run completed

    -- Status
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'skipped')),
    dry_run INTEGER NOT NULL DEFAULT 0,         -- 1=dry run, 0=live

    -- Config snapshot (flat for queryability)
    schedule INTEGER NOT NULL,                  -- Schedule interval in minutes
    filter_mode TEXT NOT NULL,                  -- 'round_robin' or 'random'
    filter_name TEXT NOT NULL,                  -- Name of the filter used

    -- Library stats
    library_total INTEGER NOT NULL,             -- Total items in library
    library_cached INTEGER NOT NULL DEFAULT 0,  -- 1=fetched from cache
    library_fetch_ms INTEGER NOT NULL,          -- Time to fetch library in ms

    -- Filter stats
    matched_count INTEGER NOT NULL,             -- Items matching filter rules
    after_cooldown INTEGER NOT NULL,            -- Items after cooldown applied
    cooldown_hours INTEGER NOT NULL,            -- Cooldown hours setting
    dry_run_excluded INTEGER NOT NULL DEFAULT 0,-- Items excluded by dry run cache

    -- Selection stats
    selection_method TEXT NOT NULL,             -- Selector method used
    selection_requested INTEGER NOT NULL,       -- Items requested to select
    selected_count INTEGER NOT NULL,            -- Items actually selected

    -- Results stats
    searches_triggered INTEGER NOT NULL,        -- Number of searches triggered
    successful INTEGER NOT NULL,                -- Successful upgrades found
    failed INTEGER NOT NULL,                    -- Failed searches

    -- Complex data as JSON
    items TEXT NOT NULL DEFAULT '[]',           -- JSON array of UpgradeSelectionItem
    errors TEXT NOT NULL DEFAULT '[]',          -- JSON array of error strings

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (instance_id) REFERENCES arr_instances(id) ON DELETE CASCADE
);

-- Upgrade runs indexes (Migration: 026_create_upgrade_runs.ts)
CREATE INDEX idx_upgrade_runs_instance ON upgrade_runs(instance_id);
CREATE INDEX idx_upgrade_runs_started_at ON upgrade_runs(started_at DESC);
CREATE INDEX idx_upgrade_runs_status ON upgrade_runs(status);
