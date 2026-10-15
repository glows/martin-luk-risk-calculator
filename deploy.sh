#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v gh >/dev/null || { echo 'Install and authenticate GitHub CLI (gh auth login).' >&2; exit 1; }
command -v npm >/dev/null || { echo 'Install Node.js and npm.' >&2; exit 1; }
if [[ ! -d .git ]]; then git init; git branch -M main; fi
git add public functions package.json README.md deploy.ps1 deploy.sh .gitignore
if ! git diff --cached --quiet; then git commit -m 'Add Cloudflare Pages risk calculator'; fi
if ! git remote get-url origin >/dev/null 2>&1; then gh repo create martin-luk-calculator --public --source=. --remote=origin; fi
git push -u origin main
npm install
npx wrangler pages project create martin-luk-calculator --production-branch=main
npx wrangler pages deploy public --project-name=martin-luk-calculator
