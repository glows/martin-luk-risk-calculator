$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git and authenticate to GitHub.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Install Node.js and npm.' }
if (-not (Test-Path .git)) { git init; git branch -M main }
git add public functions package.json package-lock.json README.md deploy.ps1 deploy.sh .gitignore
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m 'Add Cloudflare Pages risk calculator' }
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { git remote add origin https://github.com/glows/martin-luk-risk-calculator.git }
git push -u origin main
npm ci
npx wrangler pages deploy public --project-name=martin-luk-calculator
