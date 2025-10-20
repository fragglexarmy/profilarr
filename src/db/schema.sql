-- Profilarr Database Schema
-- This file documents the current database schema after all migrations
-- DO NOT execute this file directly - use migrations instead
-- Last updated: 2025-10-21

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
-- Migration: 003_create_log_settings.ts
-- ==============================================================================

CREATE TABLE log_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- Retention
    retention_days INTEGER NOT NULL DEFAULT 30,

    -- Log Level
    min_level TEXT NOT NULL DEFAULT 'INFO' CHECK (min_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),

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
-- INDEXES
-- Purpose: Improve query performance
-- ==============================================================================

-- Jobs indexes (Migration: 004_create_jobs_tables.ts)
CREATE INDEX idx_jobs_enabled ON jobs(enabled);
CREATE INDEX idx_jobs_next_run ON jobs(next_run_at);

-- Job runs indexes (Migration: 004_create_jobs_tables.ts)
CREATE INDEX idx_job_runs_job_id ON job_runs(job_id);
CREATE INDEX idx_job_runs_started_at ON job_runs(started_at);
