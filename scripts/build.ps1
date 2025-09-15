# Build script for static GitHub Pages deployment (Windows PowerShell)
Write-Host "🚀 Building Hockey Scorekeeper for GitHub Pages..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location frontend

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

# Copy data files to dist
Write-Host "📋 Copying data files..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "..\dist\data" -Force
Copy-Item -Path "..\public\data\*" -Destination "..\dist\data\" -Recurse -Force

# Create a simple index redirect for root
Write-Host "🔗 Creating root redirect..." -ForegroundColor Yellow
$html404 = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Hockey Scorekeeper</title>
    <script type="text/javascript">
        // Redirect to hash router for GitHub Pages SPA support
        var l = window.location;
        if (l.pathname !== '/scorekeeper/') {
            l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + '/scorekeeper/#' + l.pathname.replace('/scorekeeper', ''));
        }
    </script>
</head>
<body>
    <p>Redirecting to Hockey Scorekeeper...</p>
</body>
</html>
"@

$html404 | Out-File -FilePath "..\dist\404.html" -Encoding UTF8

Write-Host "✅ Build complete! Files are in the dist/ directory" -ForegroundColor Green
Write-Host "🌐 Ready for GitHub Pages deployment" -ForegroundColor Green

# Return to original directory
Set-Location ..