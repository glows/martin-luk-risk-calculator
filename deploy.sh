#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v git >/dev/null || { echo 'Install Git and authenticate to GitHub.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'Install Node.js and npm.' >&2; exit 1; }
if [[ ! -d .git ]]; then git init; git branch -M main; fi
git add public functions package.json package-lock.json README.md deploy.ps1 deploy.sh .gitignore
if ! git diff --cached --quiet; then git commit -m 'Add Cloudflare Pages risk calculator'; fi
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin https://github.com/glows/martin-luk-risk-calculator.git; fi
git push -u origin main
npm ci
npx wrangler pages deploy public --project-name=martin-luk-calculator
