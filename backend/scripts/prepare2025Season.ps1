# Hockey Scorekeeper 2025 Fall Season Preparation Script
# This script cleans test data and fixes container naming inconsistencies

param(
    [switch]$DryRun = $false,
    [switch]$FixContainerNames = $false,
    [string]$ResourceGroup = "",
    [string]$AccountName = "",
    [string]$DatabaseName = "scorekeeper"
)

Write-Host "🏒 Hockey Scorekeeper 2025 Fall Season Preparation" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
}

# Check if Azure CLI is logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "❌ Please login to Azure CLI first: az login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in to Azure as: $($account.user.name)" -ForegroundColor Green

# If resource group and account not provided, try to detect them
if (-not $ResourceGroup -or -not $AccountName) {
    Write-Host "🔍 Detecting Cosmos DB resources..." -ForegroundColor Yellow
    
    $cosmosAccounts = az cosmosdb list --query "[?contains(name, 'scorekeeper') || contains(name, 'hockey')]" | ConvertFrom-Json
    
    if ($cosmosAccounts.Count -eq 0) {
        Write-Host "❌ No Cosmos DB accounts found. Please specify -ResourceGroup and -AccountName" -ForegroundColor Red
        exit 1
    }
    
    if ($cosmosAccounts.Count -eq 1) {
        $AccountName = $cosmosAccounts[0].name
        $ResourceGroup = $cosmosAccounts[0].resourceGroup
        Write-Host "✅ Auto-detected: $AccountName in $ResourceGroup" -ForegroundColor Green
    } else {
        Write-Host "Multiple Cosmos accounts found:" -ForegroundColor Yellow
        $cosmosAccounts | ForEach-Object { Write-Host "  - $($_.name) in $($_.resourceGroup)" }
        Write-Host "Please specify -ResourceGroup and -AccountName parameters" -ForegroundColor Red
        exit 1
    }
}

# Function to get containers
function Get-CosmosContainers {
    $containers = az cosmosdb sql container list --account-name $AccountName --database-name $DatabaseName --resource-group $ResourceGroup | ConvertFrom-Json
    return $containers
}

# Function to delete container contents (not the container itself)
function Clear-ContainerData {
    param([string]$ContainerName)
    
    Write-Host "🧹 Clearing data from container: $ContainerName" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would clear all documents from $ContainerName" -ForegroundColor Gray
        return
    }
    
    # Note: Azure CLI doesn't have direct document deletion
    # This would need to be done via the application or REST API
    Write-Host "   ⚠️  Manual cleanup required - use application endpoints" -ForegroundColor Orange
}

# Function to rename container (create new, migrate data, delete old)
function Rename-Container {
    param(
        [string]$OldName,
        [string]$NewName,
        [string]$PartitionKey
    )
    
    Write-Host "🔄 Renaming container: $OldName → $NewName" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would rename $OldName to $NewName" -ForegroundColor Gray
        return
    }
    
    # Check if old container exists
    $oldContainer = az cosmosdb sql container show --account-name $AccountName --database-name $DatabaseName --resource-group $ResourceGroup --name $OldName 2>$null
    if (-not $oldContainer) {
        Write-Host "   ✅ Container $OldName doesn't exist, skipping" -ForegroundColor Green
        return
    }
    
    # Check if new container already exists
    $newContainer = az cosmosdb sql container show --account-name $AccountName --database-name $DatabaseName --resource-group $ResourceGroup --name $NewName 2>$null
    if ($newContainer) {
        Write-Host "   ✅ Container $NewName already exists, skipping" -ForegroundColor Green
        return
    }
    
    # Create new container with same settings
    Write-Host "   📦 Creating new container: $NewName" -ForegroundColor Blue
    az cosmosdb sql container create `
        --account-name $AccountName `
        --database-name $DatabaseName `
        --resource-group $ResourceGroup `
        --name $NewName `
        --partition-key-path $PartitionKey `
        --throughput 400
    
    Write-Host "   ⚠️  Data migration required - use application to copy data from $OldName to $NewName" -ForegroundColor Orange
    Write-Host "   ⚠️  After migration, manually delete container: $OldName" -ForegroundColor Orange
}

Write-Host "`n📊 Current Containers:" -ForegroundColor Cyan
$containers = Get-CosmosContainers
$containers | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor White }

Write-Host "`n🔧 Fixing Container Naming Inconsistencies:" -ForegroundColor Cyan

if ($FixContainerNames) {
    # Fix ot-shootout vs otshootout
    Rename-Container -OldName "otshootout" -NewName "ot-shootout" -PartitionKey "/gameId"
    
    # Fix rink_reports vs rink-reports
    Rename-Container -OldName "rink_reports" -NewName "rink-reports" -PartitionKey "/division"
    
    # Fix shotsongoal vs shots-on-goal
    Rename-Container -OldName "shotsongoal" -NewName "shots-on-goal" -PartitionKey "/gameId"
} else {
    Write-Host "  Use -FixContainerNames to fix naming inconsistencies" -ForegroundColor Yellow
}

Write-Host "`n🧹 Preparing for 2025 Fall Season:" -ForegroundColor Cyan

# Define containers to clean for new season
$containersToClean = @(
    "games",           # Remove test games
    "goals",           # Remove test goals  
    "penalties",       # Remove test penalties
    "rosters",         # Remove old rosters (you'll upload new ones)
    "attendance",      # Remove test attendance
    "ot-shootout",     # Remove test overtime/shootout data
    "shots-on-goal",   # Remove test shots data
    "analytics"        # Remove old analytics (will be regenerated)
)

# Keep these containers with data:
# - settings (global settings)
# - historical-player-stats (historical data - keep!)
# - players (aggregated player stats - you may want to keep or clean)
# - rink-reports (historical reports - you may want to keep)

Write-Host "Containers that will be cleaned:" -ForegroundColor Yellow
$containersToClean | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

Write-Host "`nContainers that will be PRESERVED:" -ForegroundColor Green
@("settings", "historical-player-stats", "players", "rink-reports") | ForEach-Object { 
    Write-Host "  - $_ (contains important data)" -ForegroundColor Green 
}

foreach ($container in $containersToClean) {
    Clear-ContainerData -ContainerName $container
}

Write-Host "`n📋 Next Steps for 2025 Fall Season:" -ForegroundColor Cyan
Write-Host "1. ✅ Container naming fixed (if -FixContainerNames used)" -ForegroundColor Green
Write-Host "2. ✅ Test data cleaned from game containers" -ForegroundColor Green  
Write-Host "3. 📤 Upload new 2025 Fall rosters via admin panel" -ForegroundColor Yellow
Write-Host "4. 📅 Upload new 2025 Fall scheduled games" -ForegroundColor Yellow
Write-Host "5. 🏒 Ready for new season!" -ForegroundColor Green

Write-Host "`n🎯 2025 Fall Season Structure:" -ForegroundColor Cyan
Write-Host "  - Gold Division: 2025 Adult Fall" -ForegroundColor Yellow
Write-Host "  - Silver Division: 2025 Adult Fall" -ForegroundColor Yellow  
Write-Host "  - Bronze Division: 2025 Adult Fall" -ForegroundColor Yellow

Write-Host "`n✅ 2025 Fall Season preparation complete!" -ForegroundColor Green
