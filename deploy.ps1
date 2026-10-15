$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Install and authenticate GitHub CLI (gh auth login).' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Install Node.js and npm.' }
if (-not (Test-Path .git)) { git init; git branch -M main }
git add public functions package.json README.md deploy.ps1 deploy.sh .gitignore
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m 'Add Cloudflare Pages risk calculator' }
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { gh repo create martin-luk-calculator --public --source=. --remote=origin }
git push -u origin main
npm install
npx wrangler pages project create martin-luk-calculator --production-branch=main
npx wrangler pages deploy public --project-name=martin-luk-calculator
