# Scales the 32×32 icon from tools/icon-maker.html up to the app icons, keeping pixels sharp.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools/make-icons.ps1 -Base64 <png data>
param([Parameter(Mandatory)][string]$Base64)

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

$stream = New-Object IO.MemoryStream(, [Convert]::FromBase64String($Base64))
$src = [Drawing.Image]::FromStream($stream)

foreach ($size in 192, 512) {
  $bmp = New-Object Drawing.Bitmap $size, $size
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($src, 0, 0, $size, $size)
  $g.Dispose()
  $bmp.Save((Join-Path $outDir "icon-$size.png"), [Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "wrote icons/icon-$size.png"
}
$src.Dispose()
