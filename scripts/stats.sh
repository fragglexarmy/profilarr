#!/usr/bin/env bash
set -euo pipefail

if ! command -v scc >/dev/null 2>&1; then
  echo "scc is required but not found on PATH."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not found on PATH."
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCC_ARGS=(
  --no-cocomo
  --no-complexity
  --format json
  --include-ext "ts,tsx,js,jsx,svelte,css,scss,html,sql,cs"
  --exclude-dir ".git,node_modules,dist,docs,.svelte-kit"
)

MODULES=(
  "server/pcd|src/lib/server/pcd"
  "server/sync|src/lib/server/sync"
  "server/db|src/lib/server/db"
  "server/jobs|src/lib/server/jobs"
  "server/notifications|src/lib/server/notifications"
  "server/upgrades|src/lib/server/upgrades"
  "server/rename|src/lib/server/rename"
  "server/utils|src/lib/server/utils"
  "client/ui|src/lib/client/ui"
  "client/alerts|src/lib/client/alerts"
  "client/stores|src/lib/client/stores"
  "client/utils|src/lib/client/utils"
  "shared/pcd|src/lib/shared/pcd"
  "shared/utils|src/lib/shared/utils"
  "shared/notifications|src/lib/shared/notifications"
  "shared/upgrades|src/lib/shared/upgrades"
  "routes/custom-formats|src/routes/custom-formats"
  "routes/quality-profiles|src/routes/quality-profiles"
  "routes/regular-expressions|src/routes/regular-expressions"
  "routes/delay-profiles|src/routes/delay-profiles"
  "routes/media-management|src/routes/media-management"
  "routes/databases|src/routes/databases"
  "routes/arr|src/routes/arr"
  "routes/settings|src/routes/settings"
  "routes/auth|src/routes/auth"
  "routes/api-v1|src/routes/api/v1"
  "services/parser|src/services/parser"
  "tests/base|src/tests/base"
  "tests/jobs|src/tests/jobs"
  "tests/logger|src/tests/logger"
  "tests/upgrades|src/tests/upgrades"
  "app-shell|src/app.css,src/app.d.ts,src/app.html,src/hooks.server.ts"
  "schema-reference|src/lib/server/db/schema.sql,docs/0.schema.sql"
)

function scc_totals() {
  scc "${SCC_ARGS[@]}" "$@" | python3 -c '
import json
import sys
raw = sys.stdin.read().strip()
if not raw:
    print("0,0,0,0,0,0")
    sys.exit(0)
data = json.loads(raw)
totals = {"files": 0, "lines": 0, "code": 0, "comment": 0, "blank": 0, "bytes": 0}
for item in data:
    totals["files"] += item.get("Count", 0)
    totals["lines"] += item.get("Lines", 0)
    totals["code"] += item.get("Code", 0)
    totals["comment"] += item.get("Comment", 0)
    totals["blank"] += item.get("Blank", 0)
    totals["bytes"] += item.get("Bytes", 0)
print("{files},{lines},{code},{comment},{blank},{bytes}".format(**totals))
'
}

printf "%-28s %8s %8s %8s %8s %8s %10s\n" "Module" "Files" "Lines" "Code" "Comment" "Blank" "Bytes"
printf "%-28s %8s %8s %8s %8s %8s %10s\n" "------" "-----" "-----" "----" "-------" "-----" "-----"

total_files=0
total_lines=0
total_code=0
total_comment=0
total_blank=0
total_bytes=0

for entry in "${MODULES[@]}"; do
  name="${entry%%|*}"
  path_list="${entry#*|}"
  IFS=',' read -r -a rel_paths <<< "$path_list"
  abs_paths=()
  for rel in "${rel_paths[@]}"; do
    abs_paths+=("${ROOT}/${rel}")
  done

  stats="$(scc_totals "${abs_paths[@]}")"
  IFS=',' read -r files lines code comment blank bytes <<< "$stats"

  total_files=$((total_files + files))
  total_lines=$((total_lines + lines))
  total_code=$((total_code + code))
  total_comment=$((total_comment + comment))
  total_blank=$((total_blank + blank))
  total_bytes=$((total_bytes + bytes))

  printf "%-28s %8d %8d %8d %8d %8d %10d\n" \
    "$name" "$files" "$lines" "$code" "$comment" "$blank" "$bytes"
done

printf "%-28s %8s %8s %8s %8s %8s %10s\n" "------" "-----" "-----" "----" "-------" "-----" "-----"
printf "%-28s %8d %8d %8d %8d %8d %10d\n" \
  "TOTAL" "$total_files" "$total_lines" "$total_code" "$total_comment" "$total_blank" "$total_bytes"
