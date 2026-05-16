#!/usr/bin/env bash

# ==============================================================================
# Mobile Production Deployment Script
# ==============================================================================
# Promosi commit dari branch staging ke main (production).
#
# Prasyarat:
#   - Working tree clean (tidak ada perubahan uncommitted).
#   - origin/staging up-to-date dengan kerjaan yang mau di-deploy.
#   - GitHub Actions CI di staging hijau (atau pakai --skip-ci-check kalau perlu).
#   - GitHub CLI (gh) terinstall & terautentikasi.
#
# Cara pakai:
#   ./deploy-prod.sh                # full guard: clean tree + CI check
#   ./deploy-prod.sh --skip-ci-check  # skip GitHub Actions check (gunakan hati-hati)
#
# Setelah merge sukses, build APK production dilakukan terpisah dengan:
#   ./build_apk.sh production
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$(git rev-parse --show-toplevel)"

CI_POLL_INTERVAL_SECONDS=15
CI_MAX_ATTEMPTS=80
SKIP_CI_CHECK=false

for arg in "$@"; do
  case "$arg" in
    --skip-ci-check)
      SKIP_CI_CHECK=true
      ;;
    -h|--help)
      sed -n '3,18p' "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Argumen tidak dikenal: ${arg}${NC}" >&2
      exit 1
      ;;
  esac
done

require_clean_worktree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo -e "${RED}Working tree tidak clean. Commit atau stash dulu sebelum deploy prod.${NC}" >&2
    exit 1
  fi
}

require_gh_cli() {
  if ! command -v gh &>/dev/null; then
    echo -e "${RED}GitHub CLI (gh) tidak ditemukan. Install: brew install gh${NC}" >&2
    exit 1
  fi
  if ! gh auth status &>/dev/null; then
    echo -e "${RED}GitHub CLI belum login. Jalankan: gh auth login${NC}" >&2
    exit 1
  fi
}

read_ci_status_for_sha() {
  local sha="$1"
  # gh run list --json status,conclusion,headSha --limit 50
  # Filter run yang headSha cocok, ambil status terbaru.
  gh run list --branch staging --limit 50 \
    --json status,conclusion,headSha,name,databaseId,createdAt 2>/dev/null \
    | python3 - "$sha" <<'PY'
import json, sys
sha = sys.argv[1]
runs = json.load(sys.stdin)
matching = [r for r in runs if r.get("headSha") == sha]
if not matching:
    print("PENDING")
    sys.exit()
# Ambil yang paling baru
latest = sorted(matching, key=lambda r: r["createdAt"], reverse=True)[0]
status = latest.get("status", "")
conclusion = latest.get("conclusion") or ""
if status != "completed":
    print("PENDING")
elif conclusion == "success":
    print("SUCCESS")
else:
    print(conclusion.upper() or "FAILED")
PY
}

wait_for_ci_success() {
  local promotion_sha="$1"
  local ci_state=""
  local attempt=1

  echo -e "${BLUE}Menunggu GitHub Actions CI hijau untuk ${promotion_sha:0:12}...${NC}"

  while [ "$attempt" -le "$CI_MAX_ATTEMPTS" ]; do
    ci_state="$(read_ci_status_for_sha "$promotion_sha")"

    if [ "$ci_state" = "SUCCESS" ]; then
      echo -e "${GREEN}CI hijau untuk ${promotion_sha:0:12}.${NC}"
      return 0
    fi

    if [ "$ci_state" != "PENDING" ]; then
      echo -e "${RED}CI selesai dengan status ${ci_state} untuk ${promotion_sha:0:12}.${NC}" >&2
      echo -e "${YELLOW}Cek detail: gh run list --branch staging${NC}" >&2
      exit 1
    fi

    printf "."
    sleep "$CI_POLL_INTERVAL_SECONDS"
    attempt=$((attempt + 1))
  done

  echo
  echo -e "${RED}Timeout menunggu CI untuk ${promotion_sha:0:12}.${NC}" >&2
  exit 1
}

echo -e "${GREEN}Starting Mobile Production Deployment...${NC}"

require_clean_worktree

echo "Fetching latest remote refs..."
git fetch origin

echo "Syncing staging branch..."
git switch staging
git pull --ff-only origin staging

PROMOTION_SHA="$(git rev-parse origin/staging)"
echo -e "${BLUE}Promoting commit ${PROMOTION_SHA} from origin/staging to main...${NC}"

if [ "$SKIP_CI_CHECK" = "true" ]; then
  echo -e "${YELLOW}--skip-ci-check aktif: melewati GitHub Actions guard.${NC}"
else
  require_gh_cli
  wait_for_ci_success "${PROMOTION_SHA}"
fi

echo "Switching to main branch..."
git switch main
git pull --ff-only origin main

echo "Fast-forward merge origin/staging ke main..."
git merge --ff-only origin/staging

echo "Pushing to main branch..."
git push origin main

echo "Returning to staging branch..."
git switch staging

echo -e "${GREEN}Git promotion selesai.${NC}"
echo -e "${YELLOW}Build APK production:    ./build_apk.sh production${NC}"
echo -e "${YELLOW}Publish OTA bundle:      via Jenkins (sesuai workflow OTA staging→prod)${NC}"
