# Conflicts and History (OSQL)

This is the short policy for how we handle history edits, numbering conflicts,
and value-guard conflicts in PCD operations.

## 1) Squash / Rebase (Pre vs Post Publish)
- **Pre‑publish (branch, not merged):** history is draft. You may reorder, edit,
  delete, or squash ops.
- **Post‑publish (merged/released):** history is immutable. Never edit or delete
  old ops. Append a new op to change or revert behavior.

Example (pre‑publish squash):
```
1.add-atmos.sql
2.adjust-atmos.sql
```
Becomes:
```
1.add-atmos.sql   <-- combined, single final op
```

Example (post‑publish revert):
```sql
UPDATE quality_profile_custom_formats
SET score = 400
WHERE quality_profile_name = '1080p HDR'
  AND custom_format_name = 'Dolby Atmos'
  AND score = 1200;
```

## 2) When You Can / Can't Squash
**Can squash**:
- Ops only exist on your branch.
- Ops are not in `main` and not part of a release tag.

**Cannot squash**:
- Ops are already merged to `main` or released.
- Other work is built on top of them.

Example:
- OK: `feature/dv-tweak` has 3 ops, not merged yet.
- Not OK: `main` already has `12.allow-dv.sql` and downstream ops depend on it.

## 3) Parallel Dev + Numbering Conflicts
If dev B merges first:
- Dev A should **rebase onto `main`** and **renumber** any conflicting ops.
- CI should **fail on duplicate op numbers** in the same layer.

GitHub does not fix numbering. Devs must resolve numbering conflicts.

Example conflict:
```
Dev A: 14.add-hdr10.sql
Dev B: 14.add-dv.sql
```
Resolution after rebase:
```
Dev A: 15.add-hdr10.sql
Dev B: 14.add-dv.sql
```

## 4) Value Guards + Conflict Meaning
Conflicts are **state‑based**, not op‑based.

- Ops should include **expected‑value guards**.
- If the current DB state no longer matches the expected guard, the op does
  nothing → conflict.
- Resolution is to write a new op with guards that match the new reality.

Example:
```sql
UPDATE regular_expressions
SET regex101_id = 'NEW123/1'
WHERE name = 'Release Group - SPARKS'
  AND regex101_id = 'OLD456/1';
```
If `regex101_id` is no longer `OLD456/1`, this should fail and be rewritten.

## 5) Rebase Conflicts (Git vs OSQL)
There are two separate conflict types:

1) **Git conflict**: same op file modified in two branches.
2) **OSQL conflict**: op applies cleanly, but its guard no longer matches state.

Example:
- Dev B updates regex101_id to `BETA/1`.
- Dev A updates regex101_id to `ALPHA/1` with a guard on the old value.

After rebase, Dev A's op likely affects 0 rows (guard mismatch). The fix is to
rewrite Dev A's op to target the new current state or choose a different intent.

## 6) Local Ops Conflict Strategies
These are the local (single-user) conflict behaviors. "Ask" offers the other
options at conflict time.

- **Override**: update the guard to the current value and still apply the local
  change. This keeps the local intent and removes future conflicts.
  Example:
  ```sql
  -- was: WHERE score = 400
  UPDATE quality_profile_custom_formats
  SET score = 900
  WHERE quality_profile_name = '1080p'
    AND custom_format_name = 'Dolby Vision'
    AND score = 600; -- guard updated to current
  ```

- **Align**: drop or neutralize the local op when it conflicts. This accepts
  upstream state and prevents future conflicts.
  Example:
  ```sql
  -- local op removed or rewritten to keep current value
  UPDATE quality_profile_custom_formats
  SET score = 600
  WHERE quality_profile_name = '1080p'
    AND custom_format_name = 'Dolby Vision'
    AND score = 600;
  ```

- **Ask**: prompt the user to choose Override or Align.
  Example prompt: “Conflict detected: expected 400, current 600. Keep local
  change (override) or accept upstream (align)?”

## 7) Where Conflicts Live in the UI (Discussion)
Two useful scopes:

- **Database-level conflicts tab**: one place to triage all conflicts across
  entities. Best for global visibility.
- **Per-entity indicator**: show a badge or small section only when an entity
  is affected, so users can resolve in context.

If we choose one first, start with the database-level tab and add per-entity
badges later.

## 8) Conflict Types by Operation
Conflicts can happen on create/delete too — they just look different.

**Create**
- **Duplicate key**: entity already exists (same stable key).
  - Example: insert custom format "HDR10" but upstream already added it.

**Update**
- **Guard mismatch**: expected value no longer matches current state.
  - Example: update score where `score = 400`, but current is `600`.

**Delete**
- **Missing target**: entity already removed upstream (guard fails).
- **Changed target**: entity changed upstream so guard no longer matches.
