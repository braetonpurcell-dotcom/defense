# Local test server: serves the game at http://localhost:8080/
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 [-Open]
# -Open also opens the game in your browser.
param([int]$Port = 8080, [switch]$Open)

$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
# The sketchbook (tools/sketchbook.html) saves into this folder, and only this folder.
$sketchDir = Join-Path $root 'sketches'
New-Item -ItemType Directory -Force $sketchDir | Out-Null
$sketchName = '^[a-z0-9][a-z0-9_-]{0,59}\.(json|png)$'
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.webmanifest' = 'application/manifest+json'
  '.png' = 'image/png'
  '.svg' = 'image/svg+xml'
  '.md' = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$url = "http://localhost:$Port/"
try {
  $listener.Start()
} catch {
  # Port already in use: the game is most likely already being served, so just open it.
  Write-Host "Port $Port is busy - opening the game that's already running."
  if ($Open) { Start-Process $url }
  exit
}
Write-Host "Serving $root at $url"
Write-Host 'Leave this window open while you play. Close it to stop the game server.'
if ($Open) { Start-Process $url }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    $method = $ctx.Request.HttpMethod

    # Sketchbook: PUT /sketches/<name>.json|png saves a sketch; GET /sketches/ lists them.
    if ($path -like 'sketches/*' -or $path -eq 'sketches') {
      $name = $path.Substring([Math]::Min($path.Length, 9))
      if ($method -eq 'PUT') {
        if ($name -notmatch $sketchName) { $res.StatusCode = 400; continue }
        $ms = New-Object IO.MemoryStream
        $ctx.Request.InputStream.CopyTo($ms)
        if ($ms.Length -gt 4MB) { $res.StatusCode = 413; continue }
        [IO.File]::WriteAllBytes((Join-Path $sketchDir $name), $ms.ToArray())
        $res.StatusCode = 204
        continue
      }
      if ($name -eq '') {
        $list = @(Get-ChildItem $sketchDir -Filter *.json | Sort-Object LastWriteTime -Descending | ForEach-Object { $_.Name })
        $bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $list -Compress))
        $res.ContentType = 'application/json'
        $res.Headers.Add('Cache-Control', 'no-cache')
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        continue
      }
    }

    if ($path -eq '' -or $path.EndsWith('/')) { $path += 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $path))
    if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
