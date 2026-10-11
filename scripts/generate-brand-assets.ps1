# Regenerate the browser icons and social preview on Windows.
Add-Type -AssemblyName System.Drawing
$assetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public'))
$accent = [Drawing.ColorTranslator]::FromHtml('#ff3962')

function Draw-Mark($graphics, [single]$x, [single]$y, [single]$size) {
    $state = $graphics.Save()
    $graphics.TranslateTransform($x, $y)
    $graphics.ScaleTransform($size / 64, $size / 64)
    $background = [Drawing.Drawing2D.GraphicsPath]::new()
    $background.AddArc(0, 0, 32, 32, 180, 90)
    $background.AddArc(32, 0, 32, 32, 270, 90)
    $background.AddArc(32, 32, 32, 32, 0, 90)
    $background.AddArc(0, 32, 32, 32, 90, 90)
    $background.CloseFigure()
    $brush = [Drawing.SolidBrush]::new($accent)
    $graphics.FillPath($brush, $background)
    $pen = [Drawing.Pen]::new([Drawing.Color]::White, 3.6)
    $pen.StartCap = $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
    $shield = [Drawing.Drawing2D.GraphicsPath]::new()
    $shield.AddLine(32, 15, 44, 19.5)
    $shield.AddLine(44, 19.5, 44, 30)
    $shield.AddBezier(44, 30, 44, 39, 32, 45, 32, 45)
    $shield.AddBezier(32, 45, 32, 45, 20, 39, 20, 30)
    $shield.AddLine(20, 30, 20, 19.5)
    $shield.CloseFigure()
    $graphics.DrawPath($pen, $shield)
    $graphics.DrawLine($pen, 27.5, 28.5, 30.5, 31.5)
    $graphics.DrawLine($pen, 30.5, 31.5, 36.5, 25.5)
    $shield.Dispose(); $pen.Dispose(); $brush.Dispose(); $background.Dispose()
    $graphics.Restore($state)
}

foreach ($entry in @(@('favicon-32.png', 32), @('apple-touch-icon.png', 180))) {
    $bitmap = [Drawing.Bitmap]::new([int]$entry[1], [int]$entry[1])
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([Drawing.Color]::Transparent)
    Draw-Mark $graphics 0 0 $entry[1]
    $bitmap.Save((Join-Path $assetRoot $entry[0]), [Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose()
}

$bitmap = [Drawing.Bitmap]::new(1200, 630)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([Drawing.ColorTranslator]::FromHtml('#fff7f9'))
Draw-Mark $graphics 80 72 88
$dark = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#20202a'))
$muted = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#656575'))
$pink = [Drawing.SolidBrush]::new($accent)
$brandFont = [Drawing.Font]::new('Segoe UI', 36, [Drawing.FontStyle]::Bold)
$titleFont = [Drawing.Font]::new('Segoe UI', 54, [Drawing.FontStyle]::Bold)
$bodyFont = [Drawing.Font]::new('Segoe UI', 24)
$graphics.DrawString('QA Lab', $brandFont, $dark, 192, 85)
$graphics.DrawString('Test management', $titleFont, $dark, 74, 218)
$graphics.DrawString('for teams.', $titleFont, $dark, 74, 302)
$graphics.DrawString('Requirements. Test cases. Runs. Bugs.', $bodyFont, $muted, 80, 426)
$graphics.DrawString('Plan. Test. Track. Release.', $bodyFont, $pink, 80, 504)
$bitmap.Save((Join-Path $assetRoot 'social-preview.png'), [Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $bitmap.Dispose()
$brandFont.Dispose(); $titleFont.Dispose(); $bodyFont.Dispose()
$dark.Dispose(); $muted.Dispose(); $pink.Dispose()
