
Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param([string]$InputFile, [string]$OutputFile, [int]$Width, [int]$Height)
    
    if (-not (Test-Path $InputFile)) {
        Write-Host "Error: Input file found $InputFile"
        return
    }

    $src = [System.Drawing.Image]::FromFile($InputFile)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High quality resizing
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graph.DrawImage($src, 0, 0, $Width, $Height)
    $bmp.Save($OutputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $src.Dispose()
    $bmp.Dispose()
    $graph.Dispose()
    Write-Host "Resized $OutputFile to $Width x $Height"
}

function Create-Screenshot {
    param([string]$OutputFile, [int]$Width, [int]$Height, [string]$Text)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.Clear([System.Drawing.ColorTranslator]::FromHtml("#F3F4F6"))
    
    $brush = [System.Drawing.Brushes]::RoyalBlue
    $font = New-Object System.Drawing.Font("Arial", 40)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height)
    $graph.DrawString($Text, $font, $brush, $rect, $format)
    
    $bmp.Save($OutputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $graph.Dispose()
    Write-Host "Created screenshot $OutputFile $Width x $Height"
}

$publicDir = Resolve-Path "public"
$iconSource = Join-Path $publicDir "pwa-192x192.png" 

# Resize Icons
Resize-Image $iconSource (Join-Path $publicDir "pwa-192x192-new.png") 192 192
Resize-Image $iconSource (Join-Path $publicDir "pwa-512x512-new.png") 512 512
Resize-Image $iconSource (Join-Path $publicDir "masked-icon-new.png") 512 512

# Swap files
Move-Item -Force (Join-Path $publicDir "pwa-192x192-new.png") (Join-Path $publicDir "pwa-192x192.png")
Move-Item -Force (Join-Path $publicDir "pwa-512x512-new.png") (Join-Path $publicDir "pwa-512x512.png")
Move-Item -Force (Join-Path $publicDir "masked-icon-new.png") (Join-Path $publicDir "masked-icon.png")

# Generate Screenshots
Create-Screenshot (Join-Path $publicDir "screenshot-mobile.png") 1080 1920 "Mobile Preview"
Create-Screenshot (Join-Path $publicDir "screenshot-wide.png") 1920 1080 "Desktop Preview"
