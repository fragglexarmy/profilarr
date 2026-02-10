# Conflict Resolution Testing

Manual test scenarios for the **override** and **align** conflict strategies.

## How conflicts happen

A conflict occurs when a user op's SQL executes with **rowcount 0** (value guard
mismatch) or throws a **UNIQUE constraint** error (duplicate key) during compile.
This means upstream changed something the user op was targeting.

Two conflict reasons:

- **guard_mismatch** — UPDATE/DELETE op targets a row whose guarded columns no
  longer match (upstream changed the same field).
- **duplicate_key** — CREATE op tries to insert a name that already exists
  (upstream created the same entity).

Two resolution strategies:

- **Override** — re-write the user's desired state on top of the current
  (post-upstream) state. Supersedes the old conflicting op.
- **Align** — drop the user's conflicting op entirely, accepting upstream's
  state.

---

## Setup per test

Each test requires:

1. A linked database instance with user ops enabled.
2. The entity under test exists in the base layer.
3. A user op is created that will conflict with a subsequent base change.
4. A base change is introduced (simulating an upstream sync/pull).
5. Recompile — the user op should show as conflicted.
6. Resolve with **override** or **align** and verify the result.

For **override** tests, verify:
- The entity's final state matches the user's desired values.
- The old user op is superseded (or dropped if desired = current).
- A new user op exists (or no new op if desired already matched).
- Recompile succeeds with no conflicts.

For **align** tests, verify:
- The entity's final state matches upstream's values (user change gone).
- The old user op is dropped.
- No new user op is created.
- Recompile succeeds with no conflicts.

---

## 1. Custom Formats

### 1.1 General — name rename conflict

**Setup:** Base creates CF "x265". User renames it to "x265 Local Rename".
Upstream renames it to "x265 Dev Rename".

**Conflict:** User's UPDATE has a name guard on "x265" but the row is now
"x265 Dev Rename" → guard mismatch.

**E2E spec:** `src/tests/e2e/specs/1.1-cf-name-rename.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | CF is named "x265 Local Rename" (user's desired name). New user op with current guards. | - [x] |
| b | Align | CF is named "x265 Dev Rename" (upstream's name). User op dropped. | - [x] |

### 1.2 General — description change conflict

**Setup:** Base creates CF "x265". User changes description to
"Local description edit". Upstream changes description to
"Dev description edit".

**Conflict:** Guard mismatch on description column.

**E2E spec:** `src/tests/e2e/specs/1.2-cf-description-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Description is "Local description edit". | - [x] |
| b | Align | Description is "Dev description edit". | - [x] |

### 1.3 General — include_in_rename auto-align (no conflict)

**Setup:** Base creates CF "x265". User toggles `include_in_rename` from false
to true. Upstream also sets `include_in_rename` to true.

**Expected:** No conflict. The user op is auto-aligned (dropped) because the
desired value already matches the current row.

**E2E spec:** `src/tests/e2e/specs/1.3-cf-include-in-rename.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | No conflict appears after pull; `include_in_rename` is true | - [x] |

### 1.4 General — upstream rename + user description change

**Setup:** Base creates CF "x265". User changes description to
"Local description edit". Upstream renames the CF to "x265 Dev Rename".
User op references the old name via stable_key.

**Conflict:** Guard mismatch — row name changed.

**E2E spec:** `src/tests/e2e/specs/1.4-cf-upstream-rename-user-description.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | CF keeps upstream's new name but has user's description. Rename chain resolves the current name. | - [x] |
| b | Align | CF has upstream's name and upstream's description. | - [x] |

### 1.5 Conditions — upstream changes same condition

**Setup:** Base creates CF "x265" with condition "Not 2160p" (resolution 2160p).
User changes the condition value to 1080p. Upstream changes it to 720p.

**Conflict:** Guard mismatch on the condition row's value guards.

**E2E spec:** `src/tests/e2e/specs/1.5-cf-condition-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Condition "Not 2160p" uses 1080p (user's desired). | - [x] |
| b | Align | Condition "Not 2160p" uses 720p (upstream's value). | - [x] |

### 1.6 Conditions — upstream adds new condition, user modifies existing

**Setup:** User modifies condition A. Upstream adds condition B (doesn't touch
condition A's guards).

**Expected:** No conflict. User op applies cleanly because it only guards on
condition A's row, which upstream didn't change.

**E2E spec:** `src/tests/e2e/specs/1.6-cf-condition-no-conflict.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | Verify no conflict appears | - [x] |

### 1.7 Conditions — upstream deletes condition user modified

**Setup:** User modifies condition "Source". Upstream deletes condition "Source".

**Conflict:** User's UPDATE targets a row that no longer exists → rowcount 0.

**E2E spec:** `src/tests/e2e/specs/1.7-cf-condition-deleted.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Condition is re-created with user's desired values (via conditions diff). | - [x] |
| b | Align | Condition stays deleted. | - [x] |

### 1.8 Tests — read-only without PAT

**Setup:** Local ops enabled (no base writes). User attempts to add a test.

**Expected:** UI shows read-only alert and create action is blocked.

**E2E spec:** `src/tests/e2e/specs/1.8-cf-tests-readonly.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | Add Test is blocked with read-only alert | - [x] |
| b | Create action fails with read-only error | - [x] |

### 1.9 Create conflict — duplicate key

**Setup:** User creates CF "My Format". Upstream also creates CF "My Format".

**Conflict:** UNIQUE constraint on name.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | CF "My Format" has user's desired field values (description, tags, conditions, etc.) written on top of existing row. | - [x] |
| b | Align | CF "My Format" has upstream's values. User op dropped. | - [x] |

### 1.10 Delete conflict — target already changed

**Setup:** User deletes CF "Old Format". Upstream renames it to "New Format".

**Expected:** Auto‑align (no conflict). User DELETE has a name guard on "Old Format" → rowcount 0.

**E2E spec:** `src/tests/e2e/specs/1.10-cf-delete-renamed.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | No conflict appears after pull; CF remains with new name | - [x] |

### 1.11 Tags only — no conflict expected

**Setup:** User adds a tag to a CF. Upstream changes a guarded field
(description, name, etc.).

**Expected:** Tags don't have value guards. A pure tag-only user op should NOT
conflict. If the user op also touches a guarded field, that op will conflict.

| # | Check | Pass |
|---|-------|------|
| a | Pure tag-only op does NOT show as conflicted | - [x] |

### 1.12 General multi-field — conflict expected

**Setup:** User changes description only. Upstream changes description,
`include_in_rename`, and tags in the same save.

**Expected:** Conflict (description guard mismatch). Override keeps the user's
description while preserving upstream include/tags. Align keeps upstream
values for all fields.

**E2E spec:** `src/tests/e2e/specs/1.12-cf-general-multi-field-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Local description; upstream include/tags | - [x] |
| b | Align | Upstream description/include/tags | - [x] |

### 1.13 Conditions — same row changed upstream

**Setup:** User changes a condition value (e.g., Resolution "Not 2160p" → 1080p).
Upstream changes the **same condition row** to a different value.

**Expected:** Conflict (guard mismatch on the condition row).

**E2E spec:** `src/tests/e2e/specs/1.13-cf-condition-same-row.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | Conflict appears for condition row mismatch | - [x] |

### 1.14 Conditions — type + value changed upstream

**Setup:** User changes a condition's type + value. Upstream changes the same
condition to a different type + value.

**Expected:** Conflict (guard mismatch on base row / values). Override keeps the
user's type + value. Align keeps upstream.

**E2E spec:** `src/tests/e2e/specs/1.14-cf-condition-type-value-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User type/value | - [x] |
| b | Align | Upstream type/value | - [x] |

### 1.15 Conditions — multiple rows changed upstream

**Setup:** Upstream seeds two new Source conditions. User changes both in one
save. Upstream changes one overlapping condition plus a separate existing
condition.

**Expected:** Conflict only for the overlapping condition. The non‑conflicting
local condition should still apply (after per‑row ops are implemented).

**E2E spec:** `src/tests/e2e/specs/1.15-cf-conditions-multiple-upstream.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Local A/B; upstream C | - [x] |
| b | Align | Local A; upstream B/C | - [x] |

### 1.16 Delete — upstream already deleted

**Setup:** User deletes a CF. Upstream also deletes the same CF.

**Expected:** Auto‑align (no conflict). User delete hits 0 rows.

| # | Check | Pass |
|---|-------|------|
| a | No conflict appears after pull | - [x] |

### 1.17 Conditions — rename conflict

**Setup:** User renames a condition (e.g., "Source" → "Source Local"). Upstream
changes the same condition row (e.g., toggles `required`/`negate`).

**Expected:** Conflict on the condition row. Override keeps the user's new name.
Align keeps upstream's values (including the original name).

**E2E spec:** `src/tests/e2e/specs/1.17-cf-condition-rename-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Condition uses user's renamed name | - [x] |
| b | Align | Condition keeps upstream name/values | - [x] |

### 1.18 Conditions — toggle fields conflict

**Setup:** User toggles `required`/`arr_type`. Upstream toggles `negate` on the
same condition row.

**Expected:** Conflict on the condition row. Override keeps the user's toggle
values; align keeps upstream's toggles.

**E2E spec:** `src/tests/e2e/specs/1.18-cf-condition-toggle-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User toggles win | - [x] |
| b | Align | Upstream toggles win | - [x] |

### 1.19 Conditions — pattern value conflict

**Setup:** User edits a regex pattern condition. Upstream edits the same pattern
row with a different value.

**Expected:** Conflict on the condition row. Override keeps user's pattern; align
keeps upstream.

**E2E spec:** `src/tests/e2e/specs/1.19-cf-condition-pattern-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User pattern wins | - [x] |
| b | Align | Upstream pattern wins | - [x] |

### 1.20 Conditions — language conflict

**Setup:** User edits a language condition. Upstream edits the same language
row with a different value.

**Expected:** Conflict on the condition row. Override keeps user's language;
align keeps upstream.

**E2E spec:** `src/tests/e2e/specs/1.20-cf-condition-language-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User language wins | - [x] |
| b | Align | Upstream language wins | - [x] |

### 1.21 Conditions — size conflict

**Setup:** User edits a size condition (min/max). Upstream edits the same size
row with a different value.

**Expected:** Conflict on the condition row. Override keeps user's size; align
keeps upstream.

**E2E spec:** `src/tests/e2e/specs/1.21-cf-condition-size-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User size wins | - [x] |
| b | Align | Upstream size wins | - [x] |

### 1.22 Conditions — year conflict

**Setup:** User edits a year condition (min/max). Upstream edits the same year
row with a different value.

**Expected:** Conflict on the condition row. Override keeps user's year; align
keeps upstream.

**E2E spec:** `src/tests/e2e/specs/1.22-cf-condition-year-conflict.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User year wins | - [x] |
| b | Align | Upstream year wins | - [x] |

### 1.23 Conditions — regex dependency pattern change

**Setup:** A condition references a named regex dependency. Upstream changes
the regex **pattern** (name unchanged). User updates the condition.

**Expected:** No conflict on the condition row. The condition update applies
and the regex pattern update applies.

**E2E spec:** `src/tests/e2e/specs/1.23-cf-condition-regex-dependency-conflict.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | No conflict appears; condition keeps user's dependency | - [x] |

### 1.24 General — tag removal vs upstream tag change

**Setup:** User removes a tag. Upstream adds or removes a different tag on the
same CF.

**Expected:** No conflict. Final tags reflect upstream changes plus the user's
removal.

**E2E spec:** `src/tests/e2e/specs/1.24-cf-tags-remove-upstream-change.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | No conflict; tags match expected merge | - [x] |

### 1.25 General — local update while upstream deletes CF

**Setup:** User updates CF general fields. Upstream deletes the CF.

**Expected:** Conflict on the user update. Override re-creates the CF with the
user's desired values. Align keeps the CF deleted.

**E2E spec:** `src/tests/e2e/specs/1.25-cf-update-upstream-deleted.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | CF re-created with user's values | - [x] |
| b | Align | CF remains deleted | - [x] |

### 1.26 General — local rename + upstream update (no conflict)

**Setup:** User renames CF. Upstream updates description.

**Expected:** No conflict. Final CF keeps user's name and upstream description.

**E2E spec:** `src/tests/e2e/specs/1.26-cf-local-rename-upstream-update.spec.ts`

| # | Check | Pass |
|---|-------|------|
| a | No conflict; renamed CF has upstream description | - [x] |

### 1.27 General — local rename + local description vs upstream description

**Setup:** User renames CF and updates description in one save. Upstream updates
description only.

**Expected:** Conflict on description. Override keeps the user's new name +
local description. Align keeps upstream name + upstream description.

**E2E spec:** `src/tests/e2e/specs/1.27-cf-local-rename-upstream-description.spec.ts`

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User name + user description | - [x] |
| b | Align | Upstream name + upstream description | - [x] |

---

## 2. Quality Profiles

Comprehensive QP conflict coverage modeled after CF learnings.

### Execution Order

1. Non-overlapping no-conflict checks: `2.1`-`2.5`
2. Auto-align checks: `2.6`-`2.16`
3. Rename conflicts: `2.17`-`2.22`
4. General field conflicts: `2.23`-`2.26`
5. Qualities conflicts: `2.27`-`2.31`
6. Scoring conflicts: `2.32`-`2.39`
7. Lifecycle (create/delete): `2.40`-`2.43`
8. Dependencies + strategy: `2.44`-`2.46`

### 2.1-2.5 Non-Overlapping No-Conflict

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.1 | Tags-only local vs upstream description | No conflict | Tag change applies; upstream description applies | `src/tests/e2e/specs/2.1-qp-tags-only-vs-upstream-description.spec.ts` | - [x] |
| 2.2 | Local rename vs upstream description | No conflict | Local name persists; upstream description applies | `src/tests/e2e/specs/2.2-qp-local-rename-vs-upstream-description.spec.ts` | - [x] |
| 2.3 | Local description vs upstream tags | No conflict | Local description persists; upstream tags merge | `src/tests/e2e/specs/2.3-qp-local-description-vs-upstream-tags.spec.ts` | - [x] |
| 2.4 | Local scoring-only vs upstream general-only | No conflict | Both non-overlapping changes apply | `src/tests/e2e/specs/2.4-qp-local-scoring-vs-upstream-general.spec.ts` | - [x] |
| 2.5 | Local qualities-only vs upstream scoring-only | No conflict | Both non-overlapping changes apply | `src/tests/e2e/specs/2.5-qp-local-qualities-vs-upstream-scoring.spec.ts` | - [x] |

### 2.6-2.16 Auto-Align

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.6 | Local description change, upstream same value | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.6-qp-description-same-value-auto-align.spec.ts` | - [x] |
| 2.7 | Local delete, upstream already deleted | Auto-align | No conflict row; profile remains deleted | `src/tests/e2e/specs/2.7-qp-delete-upstream-deleted-auto-align.spec.ts` | - [x] |
| 2.8 | Local delete, upstream renamed | Auto-align | No conflict row; profile persists under upstream name | `src/tests/e2e/specs/2.8-qp-delete-upstream-renamed-auto-align.spec.ts` | - [x] |
| 2.9 | Local qualities desired already matches upstream | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.9-qp-qualities-desired-matches-upstream-auto-align.spec.ts` | - [x] |
| 2.10 | Local delete vs upstream rename | Auto-align | No conflict row; profile persists with upstream rename | `src/tests/e2e/specs/2.10-qp-delete-vs-upstream-rename-auto-align.spec.ts` | - [x] |
| 2.11 | Local minimum score change, upstream sets same value | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.11-qp-scoring-minimum-score-same-value-auto-align.spec.ts` | - [x] |
| 2.12 | Local upgrade-until score change, upstream sets same value | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.12-qp-scoring-upgrade-until-score-same-value-auto-align.spec.ts` | - [x] |
| 2.13 | Local score increment change, upstream sets same value | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.13-qp-scoring-upgrade-score-increment-same-value-auto-align.spec.ts` | - [x] |
| 2.14 | Local CF score change, upstream sets same score | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.14-qp-scoring-cf-score-same-value-auto-align.spec.ts` | - [x] |
| 2.15 | Local add CF score row, upstream adds same row/value | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.15-qp-scoring-add-cf-score-same-value-auto-align.spec.ts` | - [x] |
| 2.16 | Local remove CF score row, upstream already removed row | Auto-align | No conflict row; user op dropped | `src/tests/e2e/specs/2.16-qp-scoring-remove-cf-score-upstream-removed-auto-align.spec.ts` | - [x] |

### 2.17-2.22 Rename Family

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.17 | Rename vs rename | Conflict | Override: local rename. Align: upstream rename | `src/tests/e2e/specs/2.17-qp-rename-vs-rename-conflict.spec.ts` | - [x] |
| 2.18 | Upstream rename + local description | Conflict | Override: upstream name + local description. Align: upstream name + upstream description | `src/tests/e2e/specs/2.18-qp-upstream-rename-local-description-conflict.spec.ts` | - [x] |
| 2.19 | Upstream rename + local scoring | Conflict | Override: upstream name + local scoring. Align: upstream name + upstream scoring | `src/tests/e2e/specs/2.19-qp-upstream-rename-local-scoring-conflict.spec.ts` | - [x] |
| 2.20 | Upstream rename + local qualities | Conflict | Override: upstream name + local qualities. Align: upstream name + upstream qualities | `src/tests/e2e/specs/2.20-qp-upstream-rename-local-qualities-conflict.spec.ts` | - [x] |
| 2.21 | Local rename+description vs upstream description | Conflict | Override: local name + local description. Align: upstream name + upstream description | `src/tests/e2e/specs/2.21-qp-local-rename-description-vs-upstream-description.spec.ts` | - [x] |
| 2.22 | Local rename+scoring vs upstream scoring | Conflict | Override: local name + local scoring. Align: upstream name + upstream scoring | `src/tests/e2e/specs/2.22-qp-local-rename-scoring-vs-upstream-scoring.spec.ts` | - [x] |

### 2.23-2.26 General Field Conflicts

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.23 | Description conflict | Conflict | Override: local description. Align: upstream description | `src/tests/e2e/specs/2.23-qp-description-conflict.spec.ts` | - [x] |
| 2.24 | Language conflict | Conflict | Override: local language. Align: upstream language | `src/tests/e2e/specs/2.24-qp-language-conflict.spec.ts` | - [x] |
| 2.25 | Tag remove/add overlap merge | No conflict | Expected merged tags, no conflict row | `src/tests/e2e/specs/2.25-qp-tags-overlap-merge-no-conflict.spec.ts` | - [x] |
| 2.26 | General multi-field conflict | Conflict | Override: local guarded fields, upstream non-guarded. Align: upstream full state | `src/tests/e2e/specs/2.26-qp-general-multi-field-conflict.spec.ts` | - [x] |

### 2.27-2.31 Qualities (Full-Replace Surface)

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.27 | Reorder vs reorder | Conflict | Override: local order. Align: upstream order | `src/tests/e2e/specs/2.27-qp-qualities-reorder-vs-reorder.spec.ts` | - [x] |
| 2.28 | Local add group vs upstream reorder | Conflict | Override: local list with group. Align: upstream list without group | `src/tests/e2e/specs/2.28-qp-qualities-add-group-vs-reorder.spec.ts` | - [x] |
| 2.29 | Local remove group vs upstream reorder | Conflict | Override: local group removal. Align: upstream list | `src/tests/e2e/specs/2.29-qp-qualities-remove-group-vs-reorder.spec.ts` | - [x] |
| 2.30 | Local upgrade-until toggle vs upstream toggle | Conflict | Override: local toggle state. Align: upstream toggle state | `src/tests/e2e/specs/2.30-qp-qualities-upgrade-until-toggle-conflict.spec.ts` | - [x] |
| 2.31 | Local enabled toggles vs upstream order | Conflict | Override: local enabled states + local list. Align: upstream list + states | `src/tests/e2e/specs/2.31-qp-qualities-enabled-toggles-vs-order.spec.ts` | - [x] |

### 2.32-2.39 Scoring

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.32 | `minimum_custom_format_score` conflict | Conflict | Override: local value. Align: upstream value | `src/tests/e2e/specs/2.32-qp-scoring-minimum-score-conflict.spec.ts` | - [ ] |
| 2.33 | `upgrade_until_score` conflict | Conflict | Override: local value. Align: upstream value | `src/tests/e2e/specs/2.33-qp-scoring-upgrade-until-score-conflict.spec.ts` | - [ ] |
| 2.34 | `upgrade_score_increment` conflict | Conflict | Override: local value. Align: upstream value | `src/tests/e2e/specs/2.34-qp-scoring-upgrade-score-increment-conflict.spec.ts` | - [ ] |
| 2.35 | CF score same row (`custom_format_name + arr_type`) | Conflict | Override: local score. Align: upstream score | `src/tests/e2e/specs/2.35-qp-scoring-cf-score-same-row-conflict.spec.ts` | - [ ] |
| 2.36 | CF score different `arr_type` | No conflict | Both scores apply on separate rows | `src/tests/e2e/specs/2.36-qp-scoring-cf-score-different-arr-type-no-conflict.spec.ts` | - [ ] |
| 2.37 | Local add CF score vs upstream add same row | Conflict | Override: local row value. Align: upstream row value | `src/tests/e2e/specs/2.37-qp-scoring-add-cf-score-vs-upstream-add-same-row.spec.ts` | - [ ] |
| 2.38 | Local delete CF score vs upstream update same row | Conflict | Override: row removed. Align: upstream updated row remains | `src/tests/e2e/specs/2.38-qp-scoring-delete-cf-score-vs-upstream-update.spec.ts` | - [ ] |
| 2.39 | Mixed scoring op vs upstream profile-field change | Conflict | Override: local mixed desired state. Align: upstream profile settings and scores | `src/tests/e2e/specs/2.39-qp-scoring-mixed-op-vs-upstream-profile-field.spec.ts` | - [ ] |

### 2.40-2.43 Lifecycle (Create/Delete)

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.40 | Create duplicate (general-only payload) | Conflict | Override: local general values. Align: upstream general values | `src/tests/e2e/specs/2.40-qp-create-duplicate-general-only.spec.ts` | - [ ] |
| 2.41 | Local general update while upstream deletes profile | Conflict | Override: profile re-created with local general values. Align: profile stays deleted | `src/tests/e2e/specs/2.41-qp-local-general-update-upstream-deleted.spec.ts` | - [ ] |
| 2.42 | Create duplicate (full payload: general+qualities+scoring) | Conflict | Override: local full desired state. Align: upstream full state | `src/tests/e2e/specs/2.42-qp-create-duplicate-full-payload.spec.ts` | - [ ] |
| 2.43 | Local delete vs upstream general update | No conflict | Delete remains effective; profile absent locally | `src/tests/e2e/specs/2.43-qp-delete-vs-upstream-general-update.spec.ts` | - [ ] |

### 2.44-2.46 Dependencies + Strategy

| ID | Scenario | Type | Expected | E2E spec | Pass |
|---|---|---|---|---|---|
| 2.44 | Scoring dependsOn CF renamed upstream | Dependency conflict | Override/align behavior is deterministic and documented for renamed dependency | `src/tests/e2e/specs/2.44-qp-scoring-depends-on-cf-renamed.spec.ts` | - [ ] |
| 2.45 | Scoring dependsOn CF deleted upstream | Dependency conflict | Override/align behavior is deterministic and documented for deleted dependency | `src/tests/e2e/specs/2.45-qp-scoring-depends-on-cf-deleted.spec.ts` | - [ ] |
| 2.46 | DB strategy `conflict_strategy=align` auto-drop | Strategy behavior | Conflicts are auto-dropped during compile and do not surface in UI | `src/tests/e2e/specs/2.46-qp-conflict-strategy-align-auto-drop.spec.ts` | - [ ] |

---

## 3. Regular Expressions

### 3.1 Pattern change conflict

**Setup:** User changes regex pattern from `HDR10\+` to `HDR10\+?`. Upstream
changes pattern to `(?:HDR10\+)`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Pattern is `HDR10\+?`. | - [ ] |
| b | Align | Pattern is `(?:HDR10\+)`. | - [ ] |

### 3.2 Name rename conflict

**Setup:** User renames regex "HDR10Plus" to "HDR10+". Upstream renames it to
"HDR10-Plus".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Regex named "HDR10+". | - [ ] |
| b | Align | Regex named "HDR10-Plus". | - [ ] |

### 3.3 Upstream rename + user pattern change

**Setup:** User changes pattern. Upstream renames the regex.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Regex has upstream's name, user's pattern. Rename chain resolves current name. | - [ ] |
| b | Align | Regex has upstream's name and pattern. | - [ ] |

### 3.4 Description/regex101_id conflict

**Setup:** User changes description. Upstream changes regex101_id (or both
change description).

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's description and/or regex101_id. | - [ ] |
| b | Align | Upstream's values. | - [ ] |

### 3.5 Create conflict — duplicate key

**Setup:** User creates regex "MyRegex". Upstream also creates "MyRegex".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "MyRegex" has user's pattern/description/tags. | - [ ] |
| b | Align | "MyRegex" has upstream's values. | - [ ] |

### 3.6 Delete conflict

**Setup:** User deletes regex "OldRegex". Upstream renames it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Regex persists with upstream's name. | - [ ] |
| b | Align | Delete op dropped. Regex persists. | - [ ] |

### 3.7 Tags only — no conflict expected

**Setup:** User adds a tag to a regex. Upstream changes a guarded field
(pattern, name).

| # | Check | Pass |
|---|-------|------|
| a | Pure tag-only op does NOT conflict | - [ ] |

---

## 4. Delay Profiles

### 4.1 Preferred protocol conflict

**Setup:** User changes `preferred_protocol` from `prefer_usenet` to
`prefer_torrent`. Upstream changes it to `only_usenet`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Protocol is `prefer_torrent`. Delay values adjusted per protocol constraints. | - [ ] |
| b | Align | Protocol is `only_usenet`. | - [ ] |

### 4.2 Delay value conflict

**Setup:** User changes `usenet_delay` from 60 to 120. Upstream changes it to
30.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `usenet_delay` is 120. | - [ ] |
| b | Align | `usenet_delay` is 30. | - [ ] |

### 4.3 Bypass flag conflict

**Setup:** User enables `bypass_if_above_custom_format_score` and sets
`minimum_custom_format_score` to 50. Upstream changes
`bypass_if_highest_quality`.

**Conflict:** If both changes are in the same op, guard mismatch on whichever
field upstream changed.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's bypass + minimum score settings. | - [ ] |
| b | Align | Upstream's values. | - [ ] |

### 4.4 Protocol change nullifies delay

**Setup:** User changes `usenet_delay` to 120. Upstream changes
`preferred_protocol` to `only_torrent` (which NULLs `usenet_delay`).

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Protocol stays as upstream's `only_torrent`, but user's desired `usenet_delay` is written. The update function will NULL it because of protocol constraints. Verify the final state makes sense. | - [ ] |
| b | Align | `usenet_delay` is NULL, protocol is `only_torrent`. | - [ ] |

### 4.5 Name rename conflict

**Setup:** User renames delay profile. Upstream also renames it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name. | - [ ] |
| b | Align | Upstream's name. | - [ ] |

### 4.6 Create conflict — duplicate key

**Setup:** User creates delay profile "Fast". Upstream also creates "Fast".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "Fast" has user's desired protocol/delay/bypass values. | - [ ] |
| b | Align | "Fast" has upstream's values. | - [ ] |

### 4.7 Delete conflict

**Setup:** User deletes delay profile. Upstream changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Profile persists. | - [ ] |
| b | Align | Delete op dropped. Profile persists. | - [ ] |

---

## 5. Naming (Radarr)

### 5.1 Movie format conflict

**Setup:** User changes `movie_format` string. Upstream also changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's format string. | - [ ] |
| b | Align | Upstream's format string. | - [ ] |

### 5.2 Rename toggle conflict

**Setup:** User enables `rename`. Upstream disables it (or both change it).

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `rename` matches user's desired value. | - [ ] |
| b | Align | `rename` matches upstream. | - [ ] |

### 5.3 Colon replacement conflict

**Setup:** User changes `colon_replacement_format` from `dash` to `smart`.
Upstream changes it to `spaceDash`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `colon_replacement_format` is `smart`. | - [ ] |
| b | Align | `colon_replacement_format` is `spaceDash`. | - [ ] |

### 5.4 Multiple field conflict

**Setup:** User changes `movie_format` and `movie_folder_format`. Upstream
changes `movie_format` to something else.

**Conflict:** Guard mismatch on `movie_format`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Both fields have user's desired values. | - [ ] |
| b | Align | Both fields have upstream's values. | - [ ] |

### 5.5 Name rename conflict

**Setup:** User renames naming config. Upstream also renames it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name. | - [ ] |
| b | Align | Upstream's name. | - [ ] |

### 5.6 Create conflict — duplicate key

**Setup:** User creates naming config "Default". Upstream also creates "Default".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "Default" has user's desired format strings and settings. | - [ ] |
| b | Align | "Default" has upstream's values. | - [ ] |

### 5.7 Delete conflict

**Setup:** User deletes naming config. Upstream changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Config persists. | - [ ] |
| b | Align | Delete op dropped. Config persists. | - [ ] |

---

## 6. Naming (Sonarr)

### 6.1 Episode format conflict

**Setup:** User changes `standard_episode_format`. Upstream also changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's format string. | - [ ] |
| b | Align | Upstream's format string. | - [ ] |

### 6.2 Multi-episode style conflict

**Setup:** User changes `multi_episode_style` from `extend` to `range`.
Upstream changes it to `scene`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `multi_episode_style` is `range`. | - [ ] |
| b | Align | `multi_episode_style` is `scene`. | - [ ] |

### 6.3 Custom colon replacement conflict

**Setup:** User sets `colon_replacement_format` to `custom` with a
`custom_colon_replacement_format` value. Upstream changes colon replacement
to `dash`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's custom colon replacement. | - [ ] |
| b | Align | Upstream's `dash` replacement, custom value NULL. | - [ ] |

### 6.4 Multiple format fields conflict

**Setup:** User changes `daily_episode_format` and `anime_episode_format`.
Upstream changes `daily_episode_format`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Both have user's desired values. | - [ ] |
| b | Align | Both have upstream's values. | - [ ] |

### 6.5 Folder format conflict

**Setup:** User changes `series_folder_format`. Upstream changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's folder format. | - [ ] |
| b | Align | Upstream's folder format. | - [ ] |

### 6.6 Create conflict — duplicate key

**Setup:** User creates sonarr naming config "Default". Upstream also creates
"Default".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "Default" has user's desired format strings and settings. | - [ ] |
| b | Align | "Default" has upstream's values. | - [ ] |

### 6.7 Delete conflict

**Setup:** User deletes sonarr naming config. Upstream changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Config persists. | - [ ] |
| b | Align | Delete op dropped. Config persists. | - [ ] |

### 6.8 Name rename conflict

**Setup:** User renames sonarr naming config. Upstream also renames it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name. | - [ ] |
| b | Align | Upstream's name. | - [ ] |

---

## 7. Media Settings (Radarr)

### 7.1 Propers/repacks conflict

**Setup:** User changes `propers_repacks` from `doNotPrefer` to
`preferAndUpgrade`. Upstream changes it to `doNotUpgradeAutomatically`.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `propers_repacks` is `preferAndUpgrade`. | - [ ] |
| b | Align | `propers_repacks` is `doNotUpgradeAutomatically`. | - [ ] |

### 7.2 Enable media info conflict

**Setup:** User toggles `enable_media_info`. Upstream also toggles it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired value. | - [ ] |
| b | Align | Upstream's value. | - [ ] |

### 7.3 Name rename conflict

**Setup:** User renames media settings config. Upstream also renames it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name. | - [ ] |
| b | Align | Upstream's name. | - [ ] |

### 7.4 Create conflict — duplicate key

**Setup:** User creates config "Standard". Upstream also creates "Standard".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "Standard" has user's propers_repacks and enable_media_info. | - [ ] |
| b | Align | "Standard" has upstream's values. | - [ ] |

### 7.5 Delete conflict

**Setup:** User deletes media settings config. Upstream changes it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Config persists. | - [ ] |
| b | Align | Delete op dropped. Config persists. | - [ ] |

---

## 8. Media Settings (Sonarr)

### 8.1 Propers/repacks conflict

**Setup:** Same as 7.1 but for sonarr_media_settings.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `propers_repacks` is user's desired value. | - [ ] |
| b | Align | `propers_repacks` is upstream's value. | - [ ] |

### 8.2 Enable media info conflict

**Setup:** Same as 7.2 but for sonarr_media_settings.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired value. | - [ ] |
| b | Align | Upstream's value. | - [ ] |

### 8.3 Name rename conflict

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name. | - [ ] |
| b | Align | Upstream's name. | - [ ] |

### 8.4 Create conflict — duplicate key

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired values. | - [ ] |
| b | Align | Upstream's values. | - [ ] |

### 8.5 Delete conflict

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Config persists. | - [ ] |
| b | Align | Delete op dropped. Config persists. | - [ ] |

---

## 9. Quality Definitions (Radarr)

### 9.1 Entry size change conflict

**Setup:** User changes `preferred_size` for quality "Bluray-1080p" from 35 to
40. Upstream changes it to 30.

**Conflict:** Quality definitions update is a full-replace (delete all with
value guards, then re-insert). Guard mismatch on the delete step because
upstream changed the guarded size values.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "Bluray-1080p" has `preferred_size` 40. All other entries match user's desired list. | - [ ] |
| b | Align | All entries match upstream's values. | - [ ] |

### 9.2 Entry added by upstream, user changes sizes

**Setup:** Upstream adds a new quality entry (e.g., "WEBDL-2160p"). User's op
changes sizes for existing entries. Since QD updates delete-all + re-insert,
the delete guards won't match the upstream's new entry.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's full entry list replaces everything. If user's list doesn't include the new entry, it's gone. | - [ ] |
| b | Align | Upstream's full list including the new entry. | - [ ] |

### 9.3 Name rename conflict

**Setup:** User renames QD config. Upstream also renames it.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name, user's desired entries. | - [ ] |
| b | Align | Upstream's name and entries. | - [ ] |

### 9.4 Create conflict — duplicate key

**Setup:** User creates QD config "Custom Sizes". Upstream creates "Custom
Sizes".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | "Custom Sizes" has user's entry list. | - [ ] |
| b | Align | "Custom Sizes" has upstream's entry list. | - [ ] |

### 9.5 Delete conflict

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Config persists. | - [ ] |
| b | Align | Delete op dropped. Config persists. | - [ ] |

---

## 10. Quality Definitions (Sonarr)

### 10.1 Entry size change conflict

**Setup:** Same as 9.1 but for sonarr_quality_definitions.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired sizes. | - [ ] |
| b | Align | Upstream's sizes. | - [ ] |

### 10.2 Entry added by upstream, user changes sizes

**Setup:** Same as 9.2 but for sonarr.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's full entry list. | - [ ] |
| b | Align | Upstream's full list. | - [ ] |

### 10.3 Name rename conflict

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's desired name and entries. | - [ ] |
| b | Align | Upstream's name and entries. | - [ ] |

### 10.4 Create conflict — duplicate key

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | User's entry list. | - [ ] |
| b | Align | Upstream's entry list. | - [ ] |

### 10.5 Delete conflict

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Delete op dropped. Config persists. | - [ ] |
| b | Align | Delete op dropped. Config persists. | - [ ] |

---

## 11. Cross-cutting edge cases

### E.1 Desired state already matches current

**Setup:** User changes CF description to "foo". Upstream also changes it to
"foo" (same value).

**Conflict:** Guard mismatch (upstream changed the guarded field), but the
desired "to" value matches what's already there.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | No new op written. Old op is dropped (not superseded). No-op. | - [ ] |
| b | Align | Old op dropped. Same result. | - [ ] |

### E.2 Upstream rename chain — multiple renames

**Setup:** Base creates regex "A". Upstream renames "A" → "B" in one sync, then
"B" → "C" in a later sync. User's op targets "A".

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `followRenameChain` resolves "A" → "B" → "C". Override applies user's desired values to entity "C". | - [ ] |
| b | Align | Op dropped. Entity "C" has upstream's values. | - [ ] |

### E.3 Entity deleted by upstream

**Setup:** User updates CF "Gone". Upstream deletes CF "Gone".

**Conflict:** User op targets a row that no longer exists → rowcount 0.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | `resolveFormatName` returns null. Override fails with error. Op stays conflicted. | - [ ] |
| b | Align | Op dropped. Entity stays deleted. | - [ ] |

### E.4 Multiple user ops on same entity

**Setup:** User has two published ops on CF "Test": one changes description, one
changes conditions. Upstream changes the CF name.

**Expected:** Both ops conflict. Each must be resolved independently.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override both | Both ops superseded. Two new ops written with current guards. | - [ ] |
| b | Align both | Both ops dropped. | - [ ] |
| c | Override first, align second | First op's change applied, second op dropped. | - [ ] |

### E.5 Group ops — regex rename with dependent conditions

**Setup:** User renames regex "A" to "B". This generates a group of ops: the
regex rename + condition_patterns updates for each dependent CF. Upstream also
renames the regex.

**Conflict:** The regex op conflicts. The dependent condition ops may also
conflict if the condition_patterns rows changed.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Regex gets user's desired name. Dependent condition ops need separate resolution. | - [ ] |
| b | Align | All group ops dropped. Upstream's rename stands. | - [ ] |

### E.6 Conflicting op references nonexistent desired_state field

**Setup:** An op conflicts but its `desired_state` is malformed or missing
expected fields.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Falls back to current values for any missing fields. Only fields present in desired_state are changed. | - [ ] |
| b | Align | Op dropped regardless of desired_state content. | - [ ] |

### E.7 Cache not available

**Setup:** Database instance is disabled or cache build failed.

| # | Strategy | Expected result | Pass |
|---|----------|-----------------|------|
| a | Override | Returns error "Cache not available". Op stays conflicted. | - [ ] |
| b | Align | Op dropped (align doesn't need cache). Recompile skipped if instance disabled. | - [ ] |

### E.8 Auto-align behavior (strategy = "align")

When the database's conflict strategy is `align`, conflicts are auto-resolved
during compile:

- **Updates** where the desired "to" values already match current state are
  auto-dropped.
- **Deletes** where the target entity no longer exists are auto-dropped.
- All other conflicts are force-dropped (strategy = align drops everything).

| # | Check | Pass |
|---|-------|------|
| a | With strategy `align`, conflicting ops never appear on the conflicts page — silently dropped during compile | - [ ] |

### E.9 Auto-align behavior (strategy = "override" or "ask")

With non-align strategies, auto-align still kicks in for safe cases:

- Delete of an already-deleted entity → auto-dropped.
- Update where desired "to" already matches current → auto-dropped.

Other conflicts are recorded as `conflicted` (override) or `conflicted_pending`
(ask) and appear on the conflicts page.

| # | Check | Pass |
|---|-------|------|
| a | Update conflict where desired matches current does NOT show on conflicts page (auto-aligned) | - [ ] |
| b | Delete conflict where entity already deleted does NOT show on conflicts page (auto-aligned) | - [ ] |
| c | Other conflicts DO show on the conflicts page | - [ ] |
