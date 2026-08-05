#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/push_to_github.sh [remote-url] [branch]
# If remote-url is omitted, it defaults to the user's repo.

REMOTE_URL=${1:-https://github.com/vidyavarshinig15/fruit-vegetable-erp.git}
BRANCH=${2:-main}

echo "Using remote: ${REMOTE_URL}"
echo "Target branch: ${BRANCH}"

command -v git >/dev/null 2>&1 || { echo "git not found in PATH" >&2; exit 1; }

CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: ${CUR_BRANCH}"

echo "Setting remote 'origin' to ${REMOTE_URL}' (will overwrite if exists)"
git remote remove origin 2>/dev/null || true
git remote add origin "${REMOTE_URL}"

echo "Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "No changes staged." 
else
  git commit -m "chore: sync local changes"
fi

echo "Fetching remote..."
git fetch origin --prune

if git ls-remote --exit-code --heads origin "${BRANCH}" >/dev/null 2>&1; then
  echo "Remote branch '${BRANCH}' exists — rebasing onto it."
  git pull --rebase origin "${BRANCH}"
else
  echo "Remote branch '${BRANCH}' not found — pushing new branch."
fi

echo "Pushing to origin/${BRANCH}..."
git push -u origin "${BRANCH}"

echo "Push complete. If you see authentication errors, configure SSH keys or credentials on your machine."
