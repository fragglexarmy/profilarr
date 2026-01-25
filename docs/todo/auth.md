# Auth Implementation Plan

## Overview

Two auth methods (implementing both):

1. **Basic Auth** - Username/password, session cookies, API key
2. **OIDC** - Login via external provider (Google, Authentik, Keycloak, etc.)

Which method is used depends on the `AUTH` environment variable.

---

## Session Configuration

- **Duration:** 7 days (like Sonarr)
- **Sliding expiration:** Reset expiry to 7 days from now, but only when past halfway point
  - Days 1-3: No DB update (session still has plenty of time)
  - Days 4-7: Extend session to 7 days from now
  - This avoids a DB write on every request while keeping active users logged in
- **Multiple sessions:** Users can be logged in from multiple browsers/devices

---

## AUTH Environment Variable

Single env var controls authentication behavior:

```bash
AUTH=on      # Default - username/password auth required everywhere
AUTH=local   # Bypass auth for local IPs only
AUTH=off     # Disable auth - trust external proxy (Authelia/Authentik)
AUTH=oidc    # Use OIDC provider for login (requires OIDC_* env vars)
```

| Value | Behavior |
|-------|----------|
| `on` | Username/password authentication (default if not set) |
| `local` | Skip auth for local IPs, require for external |
| `off` | No auth checks - trust reverse proxy handles it |
| `oidc` | Login via OIDC provider (Google, Authentik, etc.) |

This is intentionally an env var, not a UI setting (like Sonarr/Radarr's XML config). Users must deliberately configure it.

**Add to `src/lib/server/utils/config/config.ts`:**

```typescript
export type AuthMode = 'on' | 'local' | 'off' | 'oidc';

class Config {
    // ... existing fields ...
    public readonly authMode: AuthMode;

    constructor() {
        // ... existing code ...

        // Auth mode: 'on' (default), 'local', 'off', 'oidc'
        const auth = (Deno.env.get('AUTH') || 'on').toLowerCase();
        this.authMode = ['on', 'local', 'off', 'oidc'].includes(auth)
            ? auth as AuthMode
            : 'on';
    }
}
```

Then in middleware, use `config.authMode` instead of reading env var directly.

**Local addresses** (for `AUTH=local`):
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (Class A private)
- `172.16.0.0/12` (Class B private)
- `192.168.0.0/16` (Class C private)

---

## Phase 1: Basic Auth

### Database Migrations

**Migration 036: Create auth tables** (all tables in one migration)

```sql
-- Users table (single admin user)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (multiple sessions per user)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,  -- UUID
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Auth settings table (singleton)
CREATE TABLE auth_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    session_duration_hours INTEGER NOT NULL DEFAULT 168, -- 7 days
    api_key TEXT,  -- For programmatic access
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings with generated API key
INSERT INTO auth_settings (id, api_key) VALUES (1, lower(hex(randomblob(16))));
```

---

### Auth Utilities

**`src/lib/server/utils/auth/password.ts`**

```typescript
// Using @felix/bcrypt (Rust FFI)
export function hashPassword(password: string): Promise<string>;
export function verifyPassword(password: string, hash: string): Promise<boolean>;
```

**Session cookies** - Use SvelteKit's built-in `event.cookies` API:
```typescript
// Set session cookie
cookies.set('session', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    expires
});

// Read session cookie
const sessionId = cookies.get('session');

// Delete session cookie (logout)
cookies.delete('session', { path: '/' });
```

No custom session utility needed - browsers handle cookies automatically.

**`src/lib/server/utils/auth/apiKey.ts`**

```typescript
export function generateApiKey(): string; // Random secure token
```

**`src/lib/server/utils/auth/network.ts`**

```typescript
// isLocalAddress: Based on Sonarr - checks RFC 1918 + link-local + IPv6 local
export function isLocalAddress(ip: string): boolean;

// getClientIp: Based on Overseerr - checks common proxy headers in order:
// x-forwarded-for, x-real-ip, x-client-ip, cf-connecting-ip, etc.
// No configuration needed - works automatically behind most proxies
export function getClientIp(event: RequestEvent): string;
```

**`src/lib/server/utils/auth/middleware.ts`**

Core auth logic - keeps hooks.server.ts thin:

```typescript
import type { RequestEvent } from '@sveltejs/kit';
import { config } from '$config';
import { authSettingsQueries } from '$db/queries/authSettings.ts';
import { sessionsQueries } from '$db/queries/sessions.ts';
import { usersQueries } from '$db/queries/users.ts';
import { isLocalAddress, getClientIp } from './network.ts';

export interface AuthState {
    needsSetup: boolean;
    user: User | null;
    session: Session | null;
    skipAuth: boolean;  // true when AUTH=off or AUTH=local+local IP
}

const PUBLIC_PATHS = ['/auth/login', '/auth/setup', '/api/v1/health'];

export function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function getAuthState(event: RequestEvent): AuthState {
    const settings = authSettingsQueries.get();
    const hasUsers = usersQueries.exists();

    // AUTH=off - skip all auth (trust external proxy)
    if (config.authMode === 'off') {
        return {
            needsSetup: false,
            user: null,
            session: null,
            skipAuth: true
        };
    }

    // AUTH=local - skip auth for local IPs
    if (config.authMode === 'local' && isLocalAddress(getClientIp(event))) {
        return {
            needsSetup: !hasUsers,
            user: null,
            session: null,
            skipAuth: true
        };
    }

    // Check API key
    const apiKey = request.headers.get('X-Api-Key');
    if (apiKey && settings.api_key && apiKey === settings.api_key) {
        return {
            needsSetup: false,
            user: { id: 0, username: 'api' } as User,
            session: null,
            skipAuth: false
        };
    }

    // Check session cookie (using SvelteKit's cookies API)
    const sessionId = event.cookies.get('session');
    const session = sessionId ? sessionsQueries.getValidById(sessionId) : null;
    const user = session ? usersQueries.getById(session.user_id) : null;

    return {
        needsSetup: !hasUsers,
        user,
        session,
        skipAuth: false
    };
}

// Sliding expiration: extend session if past halfway point
export function maybeExtendSession(session: Session, durationHours: number): void {
    const expiresAt = new Date(session.expires_at).getTime();
    const now = Date.now();
    const halfDuration = (durationHours * 60 * 60 * 1000) / 2;

    // Only extend if less than half the duration remains
    if (expiresAt - now < halfDuration) {
        sessionsQueries.extendExpiration(session.id, durationHours);
    }
}

// Clean expired sessions - call on startup
export function cleanupExpiredSessions(): number {
    return sessionsQueries.deleteExpired();
}
```

---

### Auth Middleware (hooks.server.ts)

Thin wrapper that calls auth utilities:

```typescript
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import {
    getAuthState,
    isPublicPath,
    cleanupExpiredSessions,
    maybeExtendSession
} from '$utils/auth/middleware.ts';
import { authSettingsQueries } from '$db/queries/authSettings.ts';

// Clean expired sessions on startup
cleanupExpiredSessions();

export const handle: Handle = async ({ event, resolve }) => {
    const auth = getAuthState(event);

    // AUTH=off or AUTH=local with local IP - skip all auth
    if (auth.skipAuth) {
        return resolve(event);
    }

    // First-run setup flow
    if (auth.needsSetup) {
        if (event.url.pathname === '/auth/setup') {
            return resolve(event);
        }
        throw redirect(303, '/auth/setup');
    }

    // Block setup after user exists
    if (event.url.pathname === '/auth/setup') {
        throw redirect(303, '/');
    }

    // Public paths don't need auth
    if (isPublicPath(event.url.pathname)) {
        return resolve(event);
    }

    // Not authenticated
    if (!auth.user) {
        if (event.url.pathname.startsWith('/api')) {
            return new Response('Unauthorized', { status: 401 });
        }
        throw redirect(303, '/auth/login');
    }

    // Sliding expiration: extend session if past halfway point
    if (auth.session) {
        const settings = authSettingsQueries.get();
        maybeExtendSession(auth.session, settings.session_duration_hours);
    }

    // Authenticated - attach to locals
    event.locals.user = auth.user;
    event.locals.session = auth.session;

    return resolve(event);
};
```

---

### Query Modules

**`src/lib/server/db/queries/users.ts`**

```typescript
export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at: string;
    updated_at: string;
}

export const usersQueries = {
    exists(): boolean {
        const result = db.queryFirst<{ count: number }>(
            'SELECT COUNT(*) as count FROM users'
        );
        return (result?.count ?? 0) > 0;
    },

    getById(id: number): User | undefined {
        return db.queryFirst<User>('SELECT * FROM users WHERE id = ?', id);
    },

    getByUsername(username: string): User | undefined {
        return db.queryFirst<User>('SELECT * FROM users WHERE username = ?', username);
    },

    getAllUsernames(): string[] {
        // For login analysis - typo detection
        const results = db.query<{ username: string }>(
            "SELECT username FROM users WHERE username NOT LIKE 'oidc:%'"
        );
        return results.map((r) => r.username);
    },

    create(username: string, passwordHash: string): number {
        db.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            username, passwordHash
        );
        const result = db.queryFirst<{ id: number }>('SELECT last_insert_rowid() as id');
        return result?.id ?? 0;
    },

    updatePassword(id: number, passwordHash: string): boolean {
        const affected = db.execute(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            passwordHash, id
        );
        return affected > 0;
    }
};
```

**`src/lib/server/db/queries/sessions.ts`**

```typescript
export interface Session {
    id: string;
    user_id: number;
    expires_at: string;
    created_at: string;
}

export const sessionsQueries = {
    create(userId: number, durationHours: number): string {
        const id = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

        db.execute(
            'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
            id, userId, expiresAt.toISOString()
        );

        return id;
    },

    getById(id: string): Session | undefined {
        // For logout logging - get session regardless of expiration
        return db.queryFirst<Session>('SELECT * FROM sessions WHERE id = ?', id);
    },

    getValidById(id: string): Session | undefined {
        return db.queryFirst<Session>(
            `SELECT * FROM sessions
             WHERE id = ? AND datetime(expires_at) > datetime('now')`,
            id
        );
    },

    deleteById(id: string): boolean {
        const affected = db.execute('DELETE FROM sessions WHERE id = ?', id);
        return affected > 0;
    },

    deleteByUserId(userId: number): number {
        return db.execute('DELETE FROM sessions WHERE user_id = ?', userId);
    },

    deleteExpired(): number {
        return db.execute(
            `DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')`
        );
    },

    getByUserId(userId: number): Session[] {
        return db.query<Session>(
            'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
            userId
        );
    },

    // Sliding expiration: extend session by duration from now
    extendExpiration(id: string, durationHours: number): boolean {
        const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
        const affected = db.execute(
            'UPDATE sessions SET expires_at = ? WHERE id = ?',
            expiresAt.toISOString(), id
        );
        return affected > 0;
    }
};
```

**`src/lib/server/db/queries/authSettings.ts`**

```typescript
export interface AuthSettings {
    id: number;
    session_duration_hours: number;
    api_key: string | null;
    created_at: string;
    updated_at: string;
}

export const authSettingsQueries = {
    get(): AuthSettings {
        return db.queryFirst<AuthSettings>(
            'SELECT * FROM auth_settings WHERE id = 1'
        )!;
    },

    update(input: {
        sessionDurationHours?: number;
        apiKey?: string | null;
    }): boolean {
        const updates: string[] = [];
        const params: (string | number | null)[] = [];

        if (input.sessionDurationHours !== undefined) {
            updates.push('session_duration_hours = ?');
            params.push(input.sessionDurationHours);
        }
        if (input.apiKey !== undefined) {
            updates.push('api_key = ?');
            params.push(input.apiKey);
        }

        if (updates.length === 0) return false;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(1);

        const affected = db.execute(
            `UPDATE auth_settings SET ${updates.join(', ')} WHERE id = ?`,
            ...params
        );

        return affected > 0;
    },

    regenerateApiKey(): string {
        const apiKey = crypto.randomUUID();
        this.update({ apiKey });
        return apiKey;
    },

    clearApiKey(): void {
        this.update({ apiKey: null });
    }
};
```

---

### Routes

**`/auth/setup` - First-run setup (create admin account)**

Only accessible when no users exist.

```
src/routes/auth/setup/
├── +page.svelte      -- Form: username, password, confirm password
└── +page.server.ts   -- Load: redirect if users exist. Action: create user, login, redirect
```

**`/auth/login` - Login page**

```
src/routes/auth/login/
├── +page.svelte      -- Form: username, password
└── +page.server.ts   -- Action: verify password, create session, set cookie, redirect
```

Example `+page.server.ts`:

```typescript
import { fail, redirect } from '@sveltejs/kit';
import { usersQueries } from '$db/queries/users.ts';
import { sessionsQueries } from '$db/queries/sessions.ts';
import { authSettingsQueries } from '$db/queries/authSettings.ts';
import { verifyPassword } from '$utils/auth/password.ts';

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const username = data.get('username') as string;
        const password = data.get('password') as string;

        if (!username || !password) {
            return fail(400, { error: 'Username and password required' });
        }

        const user = usersQueries.getByUsername(username);
        if (!user) {
            return fail(400, { error: 'Invalid credentials' });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return fail(400, { error: 'Invalid credentials' });
        }

        const settings = authSettingsQueries.get();
        const sessionId = sessionsQueries.create(user.id, settings.session_duration_hours);

        const expires = new Date(Date.now() + settings.session_duration_hours * 60 * 60 * 1000);
        cookies.set('session', sessionId, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            expires
        });

        throw redirect(303, '/');
    }
};
```

**`/settings/security` - Auth settings UI**

```
src/routes/settings/security/
├── +page.svelte      -- Change password, view sessions, API key management
└── +page.server.ts   -- Load settings, actions for password/API key/logout
```

Features:
- Change password form
- View active sessions (with logout button for each)
- "Logout all other sessions" button
- API Key: show (masked), copy, regenerate, delete

---

### File Structure

```
src/lib/server/
├── db/
│   ├── migrations/
│   │   ├── 036_create_auth_tables.ts   # Users, sessions, auth_settings
│   │   └── 037_add_session_metadata.ts # Session metadata columns
│   └── queries/
│       ├── users.ts
│       ├── sessions.ts
│       └── authSettings.ts
└── utils/
    └── auth/
        ├── password.ts       # bcrypt hash/verify
        ├── apiKey.ts         # API key generation
        ├── network.ts        # Local IP detection
        ├── middleware.ts     # Core auth logic
        ├── userAgent.ts      # User agent parsing
        ├── loginAnalysis.ts  # Login failure analysis
        └── oidc.ts           # OIDC utilities

src/routes/
├── auth/
│   ├── setup/
│   │   ├── +page.svelte
│   │   └── +page.server.ts
│   ├── login/
│   │   ├── +page.svelte
│   │   └── +page.server.ts
│   └── logout/
│       └── +server.ts       # Logout endpoint
└── settings/
    └── security/
        ├── +page.svelte
        └── +page.server.ts

src/hooks.server.ts  -- Auth middleware (thin, calls utils)
```

---

### Implementation Order

1. ✅ Migrations (users, sessions, auth_settings) - `036_create_auth_tables.ts`
2. ✅ Password utility (hash/verify) - `$auth/password.ts`
3. ✅ API key utility (generate) - `$auth/apiKey.ts`
4. ✅ Network utility (isLocalAddress, getClientIp) - `$auth/network.ts`
5. ✅ Query modules (users, sessions, authSettings) - `$db/queries/`
6. ✅ Auth middleware utility + update hooks.server.ts
7. ✅ `/auth/setup` page (first-run)
8. ✅ `/auth/login` page
9. ✅ `/auth/logout` endpoint - `src/routes/auth/logout/+server.ts`
10. ✅ `/settings/security` page
11. ✅ Session metadata migration - `037_add_session_metadata.ts`

---

## Phase 1.5: Session Metadata

Add rich session information for better session management UI.

### Migration 037: Add session metadata

```sql
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN browser TEXT;
ALTER TABLE sessions ADD COLUMN os TEXT;
ALTER TABLE sessions ADD COLUMN device_type TEXT;
ALTER TABLE sessions ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### User Agent Parser

**`src/lib/server/utils/auth/userAgent.ts`**

Simple regex-based parser (no heavy libraries):

```typescript
interface ParsedUserAgent {
    browser: string;      // "Chrome 120", "Firefox 121", "Safari 17"
    os: string;           // "Windows 11", "macOS 14", "Ubuntu", "iOS 17"
    deviceType: string;   // "Desktop", "Mobile", "Tablet"
}

export function parseUserAgent(ua: string): ParsedUserAgent;
```

### Updated Session Creation

When creating sessions (login, setup), capture:
- IP address from request headers
- User agent string
- Parsed browser/OS/device

### Updated Session Display

Security page shows:
| Created | Last Active | Browser | OS | Device | IP | Status |
|---------|-------------|---------|-----|--------|-----|--------|
| Jan 25, 10:30 | 2 min ago | Chrome 120 | Windows 11 | Desktop | 192.168.1.5 | Current |

### Update `last_active_at`

In middleware, when extending session (sliding expiration), also update `last_active_at`.

---

## Phase 2: OIDC

### Overview

OIDC (OpenID Connect) lets users login via external providers (Google, Authentik, Keycloak, etc.) instead of username/password. We implement **generic OIDC** - works with any compliant provider, no provider-specific code needed.

### Environment Variables

```bash
AUTH=oidc
OIDC_DISCOVERY_URL=https://auth.example.com/.well-known/openid-configuration
OIDC_CLIENT_ID=profilarr
OIDC_CLIENT_SECRET=secret
```

Env vars are standard for OIDC config because the client secret is sensitive (shouldn't be in database/config files).

**Add to `src/lib/server/utils/config/config.ts`:**

```typescript
class Config {
    // ... existing fields ...
    public readonly oidc: {
        discoveryUrl: string | null;
        clientId: string | null;
        clientSecret: string | null;
    };

    constructor() {
        // ... existing code ...

        // OIDC configuration (only used when AUTH=oidc)
        this.oidc = {
            discoveryUrl: Deno.env.get('OIDC_DISCOVERY_URL') || null,
            clientId: Deno.env.get('OIDC_CLIENT_ID') || null,
            clientSecret: Deno.env.get('OIDC_CLIENT_SECRET') || null
        };
    }
}
```

### The Flow

```
1. User clicks "Login with OIDC" on /login
                    ↓
2. GET /auth/oidc/login
   - Fetch discovery document (cached)
   - Generate state token (CSRF protection)
   - Redirect to provider's authorization endpoint
                    ↓
3. User logs in at provider (if not already)
                    ↓
4. Provider redirects to /auth/oidc/callback?code=xxx&state=xxx
                    ↓
5. POST to provider's token endpoint (server-to-server)
   - Exchange code for tokens using client secret
   - Receive: access_token, id_token (JWT with user info)
                    ↓
6. Decode & verify id_token
   - Extract: sub (user ID), email, name
                    ↓
7. Create session, set cookie, redirect to /
```

### Discovery Document

The discovery URL returns JSON telling us everything:
```json
{
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "userinfo_endpoint": "https://auth.example.com/userinfo",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json"
}
```

This is why it works with **any** OIDC provider - we read their config dynamically.

### Routes

**`/auth/oidc/login` - Initiate OIDC flow**

```typescript
// src/routes/auth/oidc/login/+server.ts
import { redirect } from '@sveltejs/kit';
import { config } from '$config';
import { getDiscoveryDocument, generateState } from '$utils/auth/oidc.ts';

export async function GET({ cookies }) {
    const discovery = await getDiscoveryDocument(config.oidc.discoveryUrl!);
    const state = generateState();

    cookies.set('oidc_state', state, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 10  // 10 minutes
    });

    const params = new URLSearchParams({
        client_id: config.oidc.clientId!,
        redirect_uri: `${config.serverUrl}/auth/oidc/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        state
    });

    throw redirect(302, `${discovery.authorization_endpoint}?${params}`);
}
```

**`/auth/oidc/callback` - Handle provider response**

```typescript
// src/routes/auth/oidc/callback/+server.ts
import { redirect, error } from '@sveltejs/kit';
import { config } from '$config';
import {
    getDiscoveryDocument,
    exchangeCode,
    verifyIdToken
} from '$utils/auth/oidc.ts';
import { sessionsQueries } from '$db/queries/sessions.ts';
import { authSettingsQueries } from '$db/queries/authSettings.ts';

export async function GET({ url, cookies }) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const savedState = cookies.get('oidc_state');

    // Verify state (CSRF protection)
    if (!state || state !== savedState) {
        throw error(400, 'Invalid state');
    }
    cookies.delete('oidc_state', { path: '/' });

    if (!code) {
        throw error(400, 'No code provided');
    }

    // Exchange code for tokens
    const discovery = await getDiscoveryDocument(config.oidc.discoveryUrl!);
    const tokens = await exchangeCode(discovery.token_endpoint, code, {
        clientId: config.oidc.clientId!,
        clientSecret: config.oidc.clientSecret!,
        redirectUri: `${config.serverUrl}/auth/oidc/callback`
    });

    // Verify and decode ID token
    const claims = await verifyIdToken(tokens.id_token, discovery.jwks_uri);

    // Create session (user ID 0 for OIDC users - single user app)
    const settings = authSettingsQueries.get();
    const sessionId = sessionsQueries.create(0, settings.session_duration_hours);

    const expires = new Date(Date.now() + settings.session_duration_hours * 60 * 60 * 1000);
    cookies.set('session', sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        expires
    });

    throw redirect(303, '/');
}
```

### OIDC Utility

**`src/lib/server/utils/auth/oidc.ts`**

```typescript
interface DiscoveryDocument {
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    jwks_uri: string;
}

// Cache discovery document (doesn't change often)
let cachedDiscovery: { url: string; doc: DiscoveryDocument; expires: number } | null = null;

export async function getDiscoveryDocument(url: string): Promise<DiscoveryDocument> {
    if (cachedDiscovery && cachedDiscovery.url === url && Date.now() < cachedDiscovery.expires) {
        return cachedDiscovery.doc;
    }

    const response = await fetch(url);
    const doc = await response.json() as DiscoveryDocument;

    cachedDiscovery = {
        url,
        doc,
        expires: Date.now() + 60 * 60 * 1000  // Cache for 1 hour
    };

    return doc;
}

export function generateState(): string {
    return crypto.randomUUID();
}

export async function exchangeCode(
    tokenEndpoint: string,
    code: string,
    opts: { clientId: string; clientSecret: string; redirectUri: string }
): Promise<{ access_token: string; id_token: string }> {
    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: opts.clientId,
            client_secret: opts.clientSecret,
            redirect_uri: opts.redirectUri
        })
    });

    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
}

export async function verifyIdToken(
    idToken: string,
    jwksUri: string
): Promise<{ sub: string; email?: string; name?: string }> {
    // Decode JWT (header.payload.signature)
    const [, payloadB64] = idToken.split('.');
    const payload = JSON.parse(atob(payloadB64));

    // TODO: Verify signature using JWKS (for production)
    // For now, trust the token since it came from server-to-server exchange

    return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name
    };
}
```

### Update Middleware

```typescript
// In getAuthState() - add OIDC handling
if (config.authMode === 'oidc') {
    // OIDC still uses sessions - check session cookie
    const sessionId = event.cookies.get('session');
    const session = sessionId ? sessionsQueries.getValidById(sessionId) : null;

    return {
        needsSetup: false,  // No setup needed for OIDC
        user: session ? { id: 0, username: 'oidc' } as User : null,
        session,
        skipAuth: false
    };
}
```

### Update Login Page

When `AUTH=oidc`, the login page shows "Login with OIDC" button instead of username/password form:

```svelte
<!-- src/routes/login/+page.svelte -->
<script>
    export let data;
</script>

{#if data.authMode === 'oidc'}
    <a href="/auth/oidc/login" class="btn btn-primary">
        Login with OIDC
    </a>
{:else}
    <!-- Username/password form -->
{/if}
```

### File Structure (Updated)

```
src/lib/server/utils/auth/
├── password.ts       # bcrypt hash/verify
├── apiKey.ts         # API key generation
├── network.ts        # Local IP detection
├── middleware.ts     # Core auth logic
├── userAgent.ts      # User agent parsing
├── loginAnalysis.ts  # Login failure analysis (typo/attack detection)
└── oidc.ts           # OIDC discovery, token exchange

src/routes/auth/
└── oidc/
    ├── login/
    │   └── +server.ts
    └── callback/
        └── +server.ts
```

### Implementation Order (Full)

**Phase 1: Basic Auth** ✅
1. ✅ Migrations (users, sessions, auth_settings)
2. ✅ Password utility (hash/verify)
3. ✅ API key utility (generate)
4. ✅ Network utility (isLocalAddress, getClientIp)
5. ✅ Query modules (users, sessions, authSettings)
6. ✅ Auth middleware utility + update hooks.server.ts
7. ✅ `/auth/setup` page (first-run)
8. ✅ `/auth/login` page
9. ✅ `/auth/logout` endpoint
10. ✅ `/settings/security` page

**Phase 1.5: Session Metadata** ✅
11. ✅ Migration 037 (session metadata columns)
12. ✅ User agent parser utility
13. ✅ Update session creation to capture metadata
14. ✅ Update security page to display metadata

**Phase 2: OIDC** ✅
15. ✅ OIDC utility (discovery, token exchange, verify)
16. ✅ `/auth/oidc/login` route
17. ✅ `/auth/oidc/callback` route
18. ✅ Update login page with OIDC button

**Phase 3: Auth Logging** ✅
19. ✅ Login analysis utility (typo detection, attack username detection)
20. ✅ Login success/failure logging
21. ✅ Logout logging
22. ✅ Account creation logging
23. ✅ OIDC flow logging
24. ✅ API key and session logging
25. ✅ Unauthorized access and cleanup logging

---

## Phase 3: Auth Logging ✅

### Source Tags

Use `Auth` as the source for all auth-related logging, with sub-categories:
- `Auth` - general auth events
- `Auth:Login` - login attempts (password-based)
- `Auth:Session` - session management
- `Auth:OIDC` - OIDC flow events
- `Auth:APIKey` - API key usage

### Login Analysis

Failed login attempts are analyzed to distinguish between typos and potential attacks:

**`src/lib/server/utils/auth/loginAnalysis.ts`**

- `isCommonAttackUsername(username)` - checks against common attack usernames (admin, root, etc.)
- `findSimilarUsername(attempted, existing)` - Levenshtein distance for typo detection (≤2 edits)
- `analyzeLoginFailure()` / `formatLoginFailure()` - combines analysis for logging

Example log messages:
```
WARN  Login failed for 'admi': unknown user (similar to 'admin')
WARN  Login failed for 'root': unknown user (common attack username)
WARN  Login failed for 'admin': invalid password
```

### INFO Level (User-relevant events)

| Event | Source | What to Log | Location |
|-------|--------|-------------|----------|
| Login success | `Auth:Login` | username, IP, browser/device | `login/+page.server.ts` |
| Logout | `Auth:Session` | username, user ID | `logout/+server.ts` |
| Account created | `Auth` | username, IP | `setup/+page.server.ts` |
| Password changed | `Auth` | username, user ID | `settings/security/+page.server.ts` |
| API key authenticated | `Auth:APIKey` | IP, endpoint | `middleware.ts` |
| API key regenerated | `Auth:APIKey` | - | `settings/security/+page.server.ts` |
| Session revoked | `Auth:Session` | session ID (partial) | `settings/security/+page.server.ts` |
| Other sessions revoked | `Auth:Session` | user ID, count | `settings/security/+page.server.ts` |
| Session cleanup | `Auth:Session` | count deleted | `hooks.server.ts` |
| OIDC login success | `Auth:OIDC` | sub, IP, browser/device | `oidc/callback/+server.ts` |

### WARN Level (Security-relevant)

| Event | Source | What to Log | Location |
|-------|--------|-------------|----------|
| Login failed | `Auth:Login` | username, IP, reason (with analysis) | `login/+page.server.ts` |
| Invalid API key | `Auth:APIKey` | IP, endpoint, key (last 4 chars) | `middleware.ts` |
| OIDC state mismatch | `Auth:OIDC` | IP (possible CSRF) | `oidc/callback/+server.ts` |
| OIDC token exchange failed | `Auth:OIDC` | IP, error | `oidc/callback/+server.ts` |
| Unauthorized API access | `Auth` | IP, endpoint, method | `hooks.server.ts` |

### ERROR Level (Failures)

| Event | Source | What to Log | Location |
|-------|--------|-------------|----------|
| OIDC config missing | `Auth:OIDC` | which vars missing | `oidc/login/+server.ts` |
| ID token verification failed | `Auth:OIDC` | IP, error | `oidc/callback/+server.ts` |

### DEBUG Level (Dev only)

| Event | Source | What to Log | Location |
|-------|--------|-------------|----------|
| Session extended | `Auth:Session` | user ID | `middleware.ts` |
| Local IP bypass | `Auth` | IP | `middleware.ts` |
| OIDC flow started | `Auth:OIDC` | IP | `oidc/login/+server.ts` |

### Security: What NOT to Log

- Passwords (obviously)
- Full API keys (mask to last 4 chars: `****abcd`)
- Full session IDs (use partial: `abc12345...`)
- Full OIDC tokens

### Implementation Files

1. `src/lib/server/utils/auth/loginAnalysis.ts` - Login failure analysis (typo/attack detection)
2. `src/routes/auth/login/+page.server.ts` - Login success/failure with analysis
3. `src/routes/auth/logout/+server.ts` - Logout
4. `src/routes/auth/setup/+page.server.ts` - Account creation
5. `src/routes/auth/oidc/login/+server.ts` - OIDC flow start, config errors
6. `src/routes/auth/oidc/callback/+server.ts` - OIDC success/failures
7. `src/lib/server/utils/auth/middleware.ts` - API key, session validation, local bypass
8. `src/hooks.server.ts` - Unauthorized access, session cleanup count
9. `src/routes/settings/security/+page.server.ts` - Password change, API key regen, session revocation
