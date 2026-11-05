# Genera los íconos de la app (corazón blanco sobre fondo rosa). Uso: powershell -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path $PSScriptRoot) 'icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon($size, $path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 239, 108, 152)), ([System.Drawing.Color]::FromArgb(255, 214, 63, 117)), 55
  $g.FillRectangle($bg, $rect)

  # Corazón paramétrico, dentro de la zona segura (60 % del lado) para que sirva como ícono "maskable".
  $points = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  for ($i = 0; $i -lt 240; $i++) {
    $t = 2 * [Math]::PI * $i / 240
    $x = 16 * [Math]::Pow([Math]::Sin($t), 3)
    $y = 13 * [Math]::Cos($t) - 5 * [Math]::Cos(2 * $t) - 2 * [Math]::Cos(3 * $t) - [Math]::Cos(4 * $t)
    $scale = $size * 0.6 / 34
    $points.Add((New-Object System.Drawing.PointF(($size / 2 + $x * $scale), ($size * 0.5 - $y * $scale + $size * 0.02))))
  }
  $g.FillPolygon([System.Drawing.Brushes]::White, $points.ToArray())
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 (Join-Path $out 'icon-192.png')
New-Icon 512 (Join-Path $out 'icon-512.png')
New-Icon 180 (Join-Path $out 'apple-touch-icon.png')
