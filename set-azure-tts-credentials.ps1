# Azure CLI Script to Set Google Cloud TTS Credentials
# Run this script to set the environment variables in your Azure App Service

Write-Host "🔧 Setting Google Cloud TTS credentials in Azure App Service..." -ForegroundColor Green
Write-Host ""

# Replace these with your actual values from the Google Cloud JSON file
$PROJECT_ID = "hockey-announcer-tts-467921"
$CLIENT_EMAIL = "hockey-tts-service@hockey-announcer-tts-467921.iam.gserviceaccount.com"
$PRIVATE_KEY_ID = "YOUR_PRIVATE_KEY_ID_HERE"
$PRIVATE_KEY = "YOUR_PRIVATE_KEY_HERE_WITH_\n_CHARACTERS"

# Your Azure App Service details (automatically filled)
$RESOURCE_GROUP = "scorekeeperRG"
$APP_NAME = "scorekeeper"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Resource Group: $RESOURCE_GROUP"
Write-Host "   App Service: $APP_NAME"
Write-Host "   Project ID: $PROJECT_ID"
Write-Host "   Client Email: $CLIENT_EMAIL"
Write-Host ""

# Check if user has updated the placeholder values
if ($PRIVATE_KEY_ID -like "*YOUR_*" -or $PRIVATE_KEY -like "*YOUR_*" -or $RESOURCE_GROUP -like "*YOUR_*" -or $APP_NAME -like "*YOUR_*") {
    Write-Host "❌ Please update the placeholder values in this script first:" -ForegroundColor Red
    Write-Host "   - PRIVATE_KEY_ID (from your Google Cloud JSON)"
    Write-Host "   - PRIVATE_KEY (from your Google Cloud JSON - keep the \n characters)"
    Write-Host "   - RESOURCE_GROUP (your Azure resource group name)"
    Write-Host "   - APP_NAME (your Azure App Service name)"
    Write-Host ""
    Write-Host "💡 Get these from:" -ForegroundColor Cyan
    Write-Host "   - Google Cloud JSON file (downloaded earlier)"
    Write-Host "   - Azure Portal > App Services (to find your resource group and app name)"
    exit 1
}

Write-Host "🔐 Setting environment variables..." -ForegroundColor Green

try {
    # Set each environment variable
    Write-Host "   Setting GOOGLE_CLOUD_PROJECT_ID..."
    az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings "GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID" --output none
    
    Write-Host "   Setting GOOGLE_CLOUD_CLIENT_EMAIL..."
    az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings "GOOGLE_CLOUD_CLIENT_EMAIL=$CLIENT_EMAIL" --output none
    
    Write-Host "   Setting GOOGLE_CLOUD_PRIVATE_KEY_ID..."
    az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings "GOOGLE_CLOUD_PRIVATE_KEY_ID=$PRIVATE_KEY_ID" --output none
    
    Write-Host "   Setting GOOGLE_CLOUD_PRIVATE_KEY..."
    az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings "GOOGLE_CLOUD_PRIVATE_KEY=$PRIVATE_KEY" --output none
    
    Write-Host ""
    Write-Host "✅ All environment variables set successfully!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🔄 Restarting App Service..." -ForegroundColor Yellow
    az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME --output none
    
    Write-Host "✅ App Service restarted!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Configuration complete! Your Google Cloud TTS should now be working." -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Check the App Service logs for TTS initialization messages"
    Write-Host "   2. Test voice announcements in your app"
    Write-Host "   3. Listen for improved Studio voice quality"
    
} catch {
    Write-Host "❌ Error setting environment variables: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Make sure you're logged into Azure CLI: az login"
    Write-Host "   2. Verify your resource group and app service names"
    Write-Host "   3. Check that you have permissions to modify the App Service"
}
