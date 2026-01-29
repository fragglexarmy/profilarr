# PCD (DB-first Ops)

This doc consolidates PCD process, conflict handling, backend plan, and guard checklist.

## Goals
- Single apply pipeline: compile reads ops from the database only.
- Local history and conflict tracking for all ops.
- Base ops remain shared via Git; user ops remain local.

## Sources of Truth
- Shared: Git repo files (base ops only).
- Local: App database tables (base + user ops + history).

## Core Concepts
### Ops Origins
- base: shared ops from Git (plus local base drafts).
- user: local-only ops created by end users.

### Ops State
- published: exists in repo (base). Always applies.
- draft: local base op not yet pushed. Applies locally and shows in UI.
- superseded: replaced by a newer op. Kept for history only.
- dropped: explicitly removed/neutralized. Kept for history only.
- orphaned: no longer present in repo after pull/branch switch. Not applied.

### Ops Source
- repo: imported from repo files.
- local: created on this machine.
- import: non-repo import (future use).

## High-Level Flow
### 1) Import base ops from repo
- Read repo ops/*.sql.
- Parse metadata and op numbers from filenames.
- Upsert rows into pcd_ops with:
  - origin=base, state=published, source=repo
  - filename/op_number/sequence set
  - content_hash set (sql + metadata)
  - last_seen_in_repo_at updated
- Any existing base ops not seen in repo are marked orphaned.

### 2) Local edits
#### Base drafts (dev)
- Create new base ops as origin=base, state=draft, source=local.
- No file is written.

#### User ops (non-dev or local override)
- Create user ops as origin=user, state=published, source=local.
- No file is written.

### 3) Compile / cache build
Apply ops in this order:
1) base + published
2) base + draft
3) user

All execution reads from the database; repo files are not executed directly.

### 4) Push (base only)
When dev chooses to push:
1) Rebase/renumber drafts as needed.
2) Export drafts to ops/*.sql.
3) Commit + push to Git.
4) Mark those ops as published in DB:
   - set filename/op_number/sequence
   - set pushed_at, pushed_commit
   - keep them active but hide from UI

### 5) Pull / branch switch
On pull/branch switch:
- Re-import base ops.
- If a local draft matches a repo op by content_hash, mark it published.
- Mark missing base ops as orphaned.

## Conflicts and History (OSQL)

### 1) Squash / Rebase (Pre vs Post Publish)
- Pre-publish (branch, not merged): history is draft. You may reorder, edit,
  delete, or squash ops.
- Post-publish (merged/released): history is immutable. Never edit or delete
  old ops. Append a new op to change or revert behavior.

Example (pre-publish squash):
```
1.add-atmos.sql
2.adjust-atmos.sql
```
Becomes:
```
1.add-atmos.sql   <-- combined, single final op
```

Example (post-publish revert):
```sql
UPDATE quality_profile_custom_formats
SET score = 400
WHERE quality_profile_name = '1080p HDR'
  AND custom_format_name = 'Dolby Atmos'
  AND score = 1200;
```

### 2) When You Can / Can't Squash
Can squash:
- Ops only exist on your branch.
- Ops are not in main and not part of a release tag.

Cannot squash:
- Ops are already merged to main or released.
- Other work is built on top of them.

### 3) Parallel Dev + Numbering Conflicts
If dev B merges first:
- Dev A should rebase onto main and renumber any conflicting ops.
- CI should fail on duplicate op numbers in the same layer.

### 4) Value Guards + Conflict Meaning
Conflicts are state-based, not op-based.
- Ops should include expected-value guards.
- If the current DB state no longer matches the guard, the op does nothing -> conflict.
- Resolution is to write a new op with guards that match the new reality.

Example:
```sql
UPDATE regular_expressions
SET regex101_id = 'NEW123/1'
WHERE name = 'Release Group - SPARKS'
  AND regex101_id = 'OLD456/1';
```

### 5) Rebase Conflicts (Git vs OSQL)
Two separate conflict types:
1) Git conflict: same op file modified in two branches.
2) OSQL conflict: op applies cleanly, but its guard no longer matches state.

### 6) Local Ops Conflict Strategies
- Override: update the guard to current value and still apply the local change.
- Align: drop or neutralize the local op when it conflicts.
- Ask: prompt the user to choose Override or Align.

### 7) Where Conflicts Live in the UI (Discussion)
- Database-level conflicts tab: triage all conflicts.
- Per-entity indicator: show when an entity is affected.

### 8) Conflict Types by Operation
Create:
- Duplicate key: entity already exists (same stable key).

Update:
- Guard mismatch: expected value no longer matches current state.

Delete:
- Missing target: entity already removed upstream.
- Changed target: entity changed upstream so guard no longer matches.

### 9) Renames (Local vs Upstream)
A) Local rename (your op)
- Safe in DB because name-based FKs use ON UPDATE CASCADE.
- Risk is future ops still referencing the old name.
- Once rename is applied, subsequent ops must target the new name.

B) Upstream rename (repo op)
- Base ops apply first; the row now lives under the new name.
- Any local op still targeting the old name will affect 0 rows -> conflict.
- Resolution: override (retarget to new name) or align (drop).

## History and UI
Track each op application attempt in history:
- applied, skipped, conflicted, error, dropped, superseded

UI:
- Show only draft base ops and conflicted ops by default.
- History view reads from pcd_op_history.
- User ops should be treated as append-only; edits/reorders should create a new op and mark the old one superseded/dropped.
- For dev review/commit, group draft ops by entity (stable_key) and allow reverting an entire entity (drop all draft ops for that entity).
  - Prefer a dependency check: block revert if other draft ops reference the entity (e.g., CF referenced by scoring). Show the referencing entities so the user can resolve.

## Suggested Tables (Summary)
pcd_ops:
- origin, state, source
- filename/op_number/sequence
- sql, metadata, desired_state
- content_hash, last_seen_in_repo_at
- pushed_at, pushed_commit, superseded_by_op_id

pcd_op_history:
- op_id, batch_id, status, rowcount, conflict_reason, error, details, applied_at

## Backend Plan (Status)
1) Database schema
- Add pcd_ops and pcd_op_history tables.
- Add query modules.

2) Base ops import (repo -> DB)
- Read ops/*.sql and upsert into pcd_ops.
- Mark missing base ops as orphaned.

3) DB writer (replace file writer)
- Write user ops to pcd_ops (published).
- Write base drafts to pcd_ops (draft).

4) DB loader + compiler changes
- Load schema/tweaks from files.
- Load base (published + draft) + user ops from DB.

5) Minimal history tracking (TODO)
- Write one history row per op on compile/apply.
- Use batch_id per compile.

6) Exporter (TODO)
- Build repo files from base drafts and push to Git.

## Update Guard + Metadata Baseline (Agreed)
- Stable key first (name/composite key), avoid auto IDs where possible.
- Guard the old values for every user-changed field (NULL-safe).
- Rename ops guard on the old name + changed fields.
- Metadata improvements:
  - Keep operation, entity, name, previousName (on rename).
  - Add changed_fields for update ops.
  - Add stable_key info (key + value) for updates/deletes.
  - Add title/summary for UI list views.

## Guard Checklist (Status)
- [x] quality profiles: general fields (name/description/tags/languages)
- [x] quality profiles: scoring fields
- [x] quality profiles: qualities
- [x] quality profiles: delete
- [x] custom formats: general fields (description/include_in_rename/tags)
- [x] custom formats: conditions
- [x] custom formats: tests (create/update/delete)
- [x] custom formats: delete
- [ ] entity tests: test entities (create/delete)
- [ ] entity tests: test releases (create/update/delete/import)
- [x] regular expressions (create/update/delete)
- [ ] delay profiles (create/update/delete)
- [ ] media management (settings)

## Guard Checklist (Status)
Legend:
- [ ] Not reviewed / not fixed
- [x] Reviewed and updated

### Regular Expressions
- [ ] src/lib/server/pcd/entities/regularExpressions/update.ts
- [ ] src/lib/server/pcd/entities/regularExpressions/delete.ts
- [ ] src/lib/server/pcd/entities/regularExpressions/create.ts

### Custom Formats
- [x] src/lib/server/pcd/entities/customFormats/general/update.ts
- [x] src/lib/server/pcd/entities/customFormats/delete.ts
- [x] src/lib/server/pcd/entities/customFormats/conditions/update.ts
- [ ] src/lib/server/pcd/entities/customFormats/conditions/update.ts
- [ ] src/lib/server/pcd/entities/customFormats/tests/update.ts
- [ ] src/lib/server/pcd/entities/customFormats/tests/delete.ts
- [ ] src/lib/server/pcd/entities/customFormats/create.ts
- [ ] src/lib/server/pcd/entities/customFormats/delete.ts

### Delay Profiles
- [ ] src/lib/server/pcd/entities/delayProfiles/update.ts
- [ ] src/lib/server/pcd/entities/delayProfiles/delete.ts
- [ ] src/lib/server/pcd/entities/delayProfiles/create.ts

### Media Management: Naming
- [ ] src/lib/server/pcd/entities/mediaManagement/naming/update.ts
- [ ] src/lib/server/pcd/entities/mediaManagement/naming/delete.ts
- [ ] src/lib/server/pcd/entities/mediaManagement/naming/create.ts

### Media Management: Media Settings
- [ ] src/lib/server/pcd/entities/mediaManagement/media-settings/update.ts
- [ ] src/lib/server/pcd/entities/mediaManagement/media-settings/delete.ts
- [ ] src/lib/server/pcd/entities/mediaManagement/media-settings/create.ts

### Media Management: Quality Definitions
- [ ] src/lib/server/pcd/entities/mediaManagement/quality-definitions/update.ts
- [ ] src/lib/server/pcd/entities/mediaManagement/quality-definitions/delete.ts
- [ ] src/lib/server/pcd/entities/mediaManagement/quality-definitions/create.ts

### Quality Profiles: General + Languages
- [x] src/lib/server/pcd/entities/qualityProfiles/general/update.ts

### Quality Profiles: Qualities
- [x] src/lib/server/pcd/entities/qualityProfiles/qualities/update.ts

### Quality Profiles: Scoring
- [x] src/lib/server/pcd/entities/qualityProfiles/scoring/update.ts

### Quality Profiles: Create/Delete
- [ ] src/lib/server/pcd/entities/qualityProfiles/create.ts
- [x] src/lib/server/pcd/entities/qualityProfiles/delete.ts

### Quality Profiles: Entity Tests
- [ ] src/lib/server/pcd/entities/qualityProfiles/entityTests/create.ts
- [ ] src/lib/server/pcd/entities/qualityProfiles/entityTests/delete.ts

### Quality Profiles: Test Releases
- [ ] src/lib/server/pcd/entities/qualityProfiles/entityTests/releases/update.ts
- [ ] src/lib/server/pcd/entities/qualityProfiles/entityTests/releases/delete.ts
- [ ] src/lib/server/pcd/entities/qualityProfiles/entityTests/releases/create.ts
