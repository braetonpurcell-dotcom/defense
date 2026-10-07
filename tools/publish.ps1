# Publishes the game to GitHub Pages:
#   live    -> https://<user>.github.io/defense/          (always the main branch)
#   preview -> https://<user>.github.io/defense/preview/  (the draft branch you name, default: current branch)
#
# It builds a fresh gh-pages branch from the committed code (uncommitted changes are not included)
# and turns on GitHub Pages the first time.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools/publish.ps1 [-Preview draft/some-branch]
param([string]$Preview = '')

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (-not $Preview) { $Preview = (git -C $repo branch --show-current).Trim() }
$remote = (git -C $repo remote get-url origin).Trim()

$tmp = Join-Path ([IO.Path]::GetTempPath()) 'defense-publish'
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
$site = Join-Path $tmp 'site'
New-Item -ItemType Directory -Force $site | Out-Null

function Export-Branch([string]$Branch, [string]$Dest, [string]$Channel) {
  New-Item -ItemType Directory -Force $Dest | Out-Null
  $zip = Join-Path $tmp "$Channel.zip"
  git -C $repo archive --format=zip -o $zip $Branch
  Expand-Archive $zip $Dest -Force
  $sha = (git -C $repo rev-parse --short $Branch).Trim()
  $json = @{ channel = $Channel; branch = $Branch; commit = $sha } | ConvertTo-Json -Compress
  [IO.File]::WriteAllText((Join-Path $Dest 'version.json'), $json)
  # Stamp the offline cache with this build, so phones install a fresh copy and drop the old one.
  $sw = Join-Path $Dest 'sw.js'
  [IO.File]::WriteAllText($sw, [IO.File]::ReadAllText($sw).Replace("const VERSION = 'dev';", "const VERSION = '$sha';"))
  Write-Host "$Channel <- $Branch @ $sha"
}

Export-Branch 'main' $site 'live'
if ($Preview -ne 'main') {
  Export-Branch $Preview (Join-Path $site 'preview') 'preview'
  # Give the preview its own name on the home screen.
  $manifest = Join-Path $site 'preview\manifest.webmanifest'
  if (Test-Path $manifest) {
    $text = [IO.File]::ReadAllText($manifest).Replace('"name": "Defense"', '"name": "Defense Preview"').Replace('"short_name": "Defense"', '"short_name": "Def Preview"')
    [IO.File]::WriteAllText($manifest, $text)
  }
}
[IO.File]::WriteAllText((Join-Path $site '.nojekyll'), '')

Push-Location $site
try {
  git init -q
  git checkout -q -b gh-pages
  git add -A
  git -c user.name="$(git -C $repo config user.name)" -c user.email="$(git -C $repo config user.email)" commit -q -m "Publish live=main preview=$Preview"
  git push -q -f $remote gh-pages
} finally {
  Pop-Location
}

# Turn on GitHub Pages the first time (serving the gh-pages branch).
$slug = (gh repo view --json nameWithOwner -q .nameWithOwner).Trim()
gh api "repos/$slug/pages" --silent 2>$null
if ($LASTEXITCODE -ne 0) {
  gh api -X POST "repos/$slug/pages" -f 'source[branch]=gh-pages' -f 'source[path]=/' --silent
  Write-Host 'GitHub Pages turned on.'
}

$owner, $name = $slug.Split('/')
Write-Host ''
Write-Host "Live:    https://$($owner.ToLower()).github.io/$name/"
if ($Preview -ne 'main') { Write-Host "Preview: https://$($owner.ToLower()).github.io/$name/preview/" }
Write-Host '(GitHub can take a minute or two to update the site.)'
