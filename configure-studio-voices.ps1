# Azure App Service Environment Configuration for Studio Voices
# Run this script after creating Google Cloud service account

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$AppServiceName,
    
    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountJsonFile
)

Write-Host "🎙️ Configuring Studio Voice Support for Azure App Service" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Check if Azure CLI is installed
try {
    az --version | Out-Null
} catch {
    Write-Error "❌ Azure CLI not found. Please install Azure CLI first."
    exit 1
}

# Check if service account file exists
if (-not (Test-Path $ServiceAccountJsonFile)) {
    Write-Error "❌ Service account JSON file not found: $ServiceAccountJsonFile"
    exit 1
}

# Read and validate JSON
try {
    $jsonContent = Get-Content $ServiceAccountJsonFile -Raw
    $serviceAccount = $jsonContent | ConvertFrom-Json
    
    Write-Host "✅ Service Account Details:" -ForegroundColor Green
    Write-Host "   Project ID: $($serviceAccount.project_id)"
    Write-Host "   Client Email: $($serviceAccount.client_email)"
    Write-Host "   Type: $($serviceAccount.type)"
    
} catch {
    Write-Error "❌ Invalid JSON file: $ServiceAccountJsonFile"
    exit 1
}

# Login check
Write-Host "`n🔐 Checking Azure login..." -ForegroundColor Yellow
try {
    $account = az account show 2>$null | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Error "❌ Not logged into Azure. Run 'az login' first."
    exit 1
}

# Set the app setting
Write-Host "`n🔧 Setting Google Cloud credentials in Azure App Service..." -ForegroundColor Yellow

try {
    # Escape quotes in JSON for Azure CLI
    $escapedJson = $jsonContent -replace '"', '\"'
    
    # Set the app setting
    az webapp config appsettings set `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --settings "GOOGLE_APPLICATION_CREDENTIALS_JSON=$escapedJson" `
        --output none

    Write-Host "✅ Google Cloud credentials configured successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "❌ Failed to set app setting: $($_.Exception.Message)"
    exit 1
}

# Restart the app service
Write-Host "`n🔄 Restarting App Service to apply changes..." -ForegroundColor Yellow
try {
    az webapp restart --resource-group $ResourceGroupName --name $AppServiceName --output none
    Write-Host "✅ App Service restarted successfully!" -ForegroundColor Green
} catch {
    Write-Error "❌ Failed to restart app service: $($_.Exception.Message)"
    exit 1
}

Write-Host "`n🎉 Studio Voice Setup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test your hockey announcer system"
Write-Host "2. Look for 'Studio-O' or 'Studio-M' in the logs"
Write-Host "3. If you see 'Neural2' fallback, check:"
Write-Host "   - Google Cloud project billing enabled"
Write-Host "   - Studio voices available in your region"
Write-Host "   - Text-to-Speech API quota limits"
Write-Host ""
Write-Host "🏒 Your Studio voices should now be working!" -ForegroundColor Green
