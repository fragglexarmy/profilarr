> a quick brain dump for ideas as they come up

# Adaptive Backoff

_aka the-bear-is-sticky-with-honey_ 🐻🍯

Eventually, a filter is going is to "run out" of items to search. Maybe its an
uber specific one - all marvel releases perhaps. What are they at now? 30
movies? Anyway, eventually, the filter will either hit max cooldown (everything
has been searched in the timeframe for which cooldown can be reset, mostly for
filters with often very limited subsets), or there will be no upgrades
available. We don't want these filters to run anymore. Or rather, we wan't them
to hibernate. Maybe eventually there comes another movie - maybe the user adds
something new, maybe a new movie is released that was part of the filter in the
first place (avengers: doomsday for example) and we'd want to "wake" the filter
up. The question is - when do we want to set a filter to sleep, and when do we
want to wake it up?

**When to sleep:**

- afterCooldown is 0 (everything on cooldown, nothing to search)
- 0 upgrades found X times in a row (searched but nothing better exists)
- what's the threshold? 3? 5? needs testing. or just let the user set it?
- maybe different thresholds for different reasons?
  - cooldown exhaustion might sleep faster
  - "no upgrades available" might need more runs to confirm

**When to wake:**

- on each scheduled run, dry run the filter logic anyway
- compare matchedCount to lastMatchedCount
- if different, or just if greater than? different catches removals too, but do
  we care about removals? greater than only wakes for new items
- edge case: count stays same but items changed (one removed, one added) -
  probably fine though, filters like minimum_availability already catch state
  changes (e.g., movie goes from announced to released, now passes filter, count
  increases)
- if same, still sleeping, return early
- cheap check, catches everything (new items, removed items, filter edits,
  quality changes) maybe

**Exponential backoff instead of hard sleep:**

- instead of "X empty runs → sleep", gradually slow down
- multiplier on user's base schedule:
  - user sets 1h: 1h → 2h → 4h → 8h → ...
  - user sets 6h: 6h → 12h → 24h → 48h → ...
- respects user preference, aggressive users stay responsive early
- need a cap - maybe 7 days? or let user configure max interval?
- on success: reset multiplier to 1? or gradual decay (8x → 4x → 2x → 1x)?

**Other considerations:**

- UI feedback: show current state to user, e.g., "next run in 4h (backed off
  2x)" or indicator on sleeping filters. otherwise invisible and confusing
- what triggers backoff: probably either 0 afterCooldown OR 0 upgrades found
- per-filter state: each filter tracks its own multiplier. important for
  round_robin
- implementation: extend FilterConfig JSON rather than new table. state is
  intrinsically per-filter, we already load/save the whole array, and deleted
  filters just disappear naturally. fields to add:
  - lastMatchedCount?: number
  - emptyRunCount?: number
  - sleeping?: boolean
  - lastRunAt?: string (per-filter)
  - nextRunAt?: string (calculated from backoff)
- logging: log when backoff kicks in/resets, e.g., "Filter 'Marvel 4K' backing
  off: 2x → 4x (3 empty runs)" - helps users understand what's happening

---

## Process Flow

**General flow for each scheduled run:**

1. Load filter, check if sleeping
2. If sleeping:
   - Dry run filter logic (cheap) to get current matchedCount
   - Compare to lastMatchedCount
   - If different → wake up, continue to step 3
   - If same → still sleeping, return early
3. Run full process: filter → cooldown → select → search
4. After run, evaluate results:
   - If afterCooldown > 0 AND found upgrades → reset emptyRunCount to 0
   - If afterCooldown == 0 OR no upgrades → increment emptyRunCount
5. If emptyRunCount >= threshold → apply backoff (multiply interval)
6. Calculate nextRunAt = schedule × backoffMultiplier
7. Save state: lastMatchedCount, emptyRunCount, nextRunAt

**On success (found upgrades):**

- Reset emptyRunCount to 0
- Reset backoffMultiplier to 1 (or gradual decay?)
- Resume normal schedule

---

## Examples

**Example 1: Marvel 4K (small, specific filter)**

Setup: 30 Marvel movies, searches 5 per run, 24h cooldown, 1h schedule

```
Run 1: matched=30, afterCooldown=30, searched=5, upgrades=2 ✓
       emptyRunCount=0, nextRun=1h
Run 2: matched=30, afterCooldown=25, searched=5, upgrades=1 ✓
       emptyRunCount=0, nextRun=1h
...
Run 6: matched=30, afterCooldown=5, searched=5, upgrades=0 ✗
       emptyRunCount=1, nextRun=1h
Run 7: matched=30, afterCooldown=0, searched=0, upgrades=0 ✗
       emptyRunCount=2, nextRun=2h (backoff 2x)
Run 8: matched=30, afterCooldown=0
       emptyRunCount=3, nextRun=4h (backoff 4x)
...
[weeks later, Avengers: Doomsday releases]
Run N: sleeping, dry run filter → matched=31 (was 30)
       WAKE UP! emptyRunCount=0, backoff=1x
       resume normal searching
```

**Example 2: Released Movies Only (state-based wake)**

Setup: filter = minimum_availability >= released

```
Run 1: matched=400 (400 released movies)
       searches normally, finds upgrades
...
[filter exhausted, backs off to 8x]
...
[The Batman 2 goes from "inCinemas" → "released"]
Run N: sleeping, dry run → matched=401 (was 400)
       WAKE UP! new movie to search
```

**Example 3: Broad "Cutoff Not Met" filter**

Setup: 500 movies don't meet cutoff, searches 10 per run

```
Run 1: matched=500, afterCooldown=500, searched=10, upgrades=8
       emptyRunCount=0
[many runs later, most things upgraded or on cooldown]
Run 50: matched=50, afterCooldown=0
        emptyRunCount=1, backoff starts
...
[user adds 20 new movies]
Run N: sleeping, dry run → matched=70 (was 50)
       WAKE UP!
```

# Toggles

Maybe use DropdownSelect instead? i hate the current design

# Upgrades Info

Move info to upgrades/info to use full page. Modal is too small

- using a table maybe?
- examples?
