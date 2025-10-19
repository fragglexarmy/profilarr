-- Profilarr Database Schema
-- This file documents the current database schema after all migrations
-- DO NOT execute this file directly - use migrations instead
-- Last updated: 2025-10-20

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
