# Azure App Service Environment Variables Configuration Script
# Run this script to configure the required environment variables for your Azure App Service

# Replace these values with your actual Azure Cosmos DB details
$resourceGroupName = "scorekeeper-rg"  # Update this with your resource group name
$webAppName = "scorekeeper"            # Update this with your app service name

# Environment variables that need to be set in Azure App Service
$envVars = @{
    "COSMOS_DB_URI" = ""  # Your Cosmos DB URI (e.g., https://your-cosmos-account.documents.azure.com:443/)
    "COSMOS_DB_KEY" = ""  # Your Cosmos DB primary key
    "COSMOS_DB_NAME" = "" # Your Cosmos DB database name
    "COSMOS_DB_GAMES_CONTAINER" = "games"
    "COSMOS_DB_ROSTERS_CONTAINER" = "rosters"
    "COSMOS_DB_ATTENDANCE_CONTAINER" = "attendance"
    "COSMOS_DB_GOAL_EVENTS_CONTAINER" = "goalEvents"
    "COSMOS_DB_PENALTY_EVENTS_CONTAINER" = "penaltyEvents"
}

Write-Host "Azure App Service Environment Variables Configuration" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Host "✓ Azure CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Azure CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Before running this script, please:" -ForegroundColor Yellow
Write-Host "1. Fill in your actual Cosmos DB values in the `$envVars hashtable above" -ForegroundColor Yellow
Write-Host "2. Update the `$resourceGroupName and `$webAppName variables" -ForegroundColor Yellow
Write-Host "3. Make sure you're logged into Azure CLI (run 'az login')" -ForegroundColor Yellow
Write-Host ""

# Prompt user to continue
$continue = Read-Host "Have you updated the values above? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Please update the values and run this script again." -ForegroundColor Yellow
    exit 0
}

# Check if user is logged in
try {
    $account = az account show 2>$null | ConvertFrom-Json
    Write-Host "✓ Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "✗ Not logged into Azure CLI" -ForegroundColor Red
    Write-Host "Please run: az login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Setting environment variables for App Service: $webAppName" -ForegroundColor Cyan

# Set each environment variable
foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "⚠ Skipping $key (empty value)" -ForegroundColor Yellow
    } else {
        try {
            az webapp config appsettings set --resource-group $resourceGroupName --name $webAppName --settings "$key=$value" --output none
            Write-Host "✓ Set $key" -ForegroundColor Green
        } catch {
            Write-Host "✗ Failed to set $key" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Environment variables configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your App Service: az webapp restart --resource-group $resourceGroupName --name $webAppName" -ForegroundColor White
Write-Host "2. Check the logs: az webapp log tail --resource-group $resourceGroupName --name $webAppName" -ForegroundColor White
Write-Host ""
Write-Host "You can also set these manually in the Azure Portal:" -ForegroundColor Cyan
Write-Host "App Service → Configuration → Application settings" -ForegroundColor White
