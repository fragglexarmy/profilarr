#!/bin/bash
# =============================================================================
# Profilarr Container Entrypoint
# =============================================================================
# Handles PUID/PGID/UMASK setup for proper file permissions
# All logging is handled by the application's startup module

set -e

# -----------------------------------------------------------------------------
# Configuration with defaults
# -----------------------------------------------------------------------------
PUID=${PUID:-1000}
PGID=${PGID:-1000}
UMASK=${UMASK:-022}

# -----------------------------------------------------------------------------
# Create group if it doesn't exist
# -----------------------------------------------------------------------------
if getent group "${PGID}" > /dev/null 2>&1; then
    # GID already exists - use that group name for the user
    PROFILARR_GROUP=$(getent group "${PGID}" | cut -d: -f1)
elif ! getent group profilarr > /dev/null 2>&1; then
    # GID is free and profilarr group doesn't exist - create it
    groupadd -g "${PGID}" profilarr
    PROFILARR_GROUP=profilarr
else
    # profilarr group exists but with wrong GID - modify it
    groupmod -g "${PGID}" profilarr 2>/dev/null || true
    PROFILARR_GROUP=profilarr
fi

# -----------------------------------------------------------------------------
# Create user if it doesn't exist
# -----------------------------------------------------------------------------
if ! getent passwd profilarr > /dev/null 2>&1; then
    useradd -u "${PUID}" -g "${PGID}" -d /config -s /bin/bash profilarr
elif [ "$(id -u profilarr)" != "${PUID}" ]; then
    usermod -u "${PUID}" profilarr 2>/dev/null || true
fi

# -----------------------------------------------------------------------------
# Ensure user is in the correct group
# -----------------------------------------------------------------------------
usermod -g "${PGID}" profilarr >/dev/null 2>&1 || true

# -----------------------------------------------------------------------------
# Set umask
# -----------------------------------------------------------------------------
umask "${UMASK}"

# -----------------------------------------------------------------------------
# Create config directory structure if it doesn't exist
# -----------------------------------------------------------------------------
mkdir -p /config/data /config/logs /config/backups /config/databases

# -----------------------------------------------------------------------------
# Fix ownership of config directory
# -----------------------------------------------------------------------------
chown -R "${PUID}:${PGID}" /config

# -----------------------------------------------------------------------------
# Drop privileges and run the application
# -----------------------------------------------------------------------------
exec gosu profilarr /app/profilarr
