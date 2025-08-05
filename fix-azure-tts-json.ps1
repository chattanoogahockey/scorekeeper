# Fix Azure TTS by using JSON credentials instead of individual variables
# This avoids the private key truncation issue

Write-Host "🔧 Fixing Azure TTS with JSON credentials approach..." -ForegroundColor Green
Write-Host ""

# Your complete Google Cloud service account JSON
# REPLACE THIS ENTIRE JSON with your actual downloaded JSON file content
$GOOGLE_CREDENTIALS_JSON = @"
{
  "type": "service_account",
  "project_id": "hockey-announcer-tts-467921",
  "private_key_id": "64cc399b858b5842280a0917184922846e2edff5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_COMPLETE_PRIVATE_KEY_CONTENT_HERE\n-----END PRIVATE KEY-----",
  "client_email": "hockey-tts-service@hockey-announcer-tts-467921.iam.gserviceaccount.com",
  "client_id": "103020565003422938812",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/hockey-tts-service%40hockey-announcer-tts-467921.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
"@

$RESOURCE_GROUP = "scorekeeperRG"
$APP_NAME = "scorekeeper"

# Check if JSON contains placeholder
if ($GOOGLE_CREDENTIALS_JSON -like "*YOUR_COMPLETE_PRIVATE_KEY_CONTENT_HERE*") {
    Write-Host "❌ Please replace the JSON content with your actual Google Cloud service account JSON" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Steps:" -ForegroundColor Yellow
    Write-Host "   1. Open your downloaded Google Cloud JSON file"
    Write-Host "   2. Copy the ENTIRE content"
    Write-Host "   3. Replace the JSON in this script (between the @`" `"@ markers)"
    Write-Host "   4. Run this script again"
    exit 1
}

Write-Host "🗑️  Removing old individual environment variables..." -ForegroundColor Yellow
try {
    az webapp config appsettings delete --resource-group $RESOURCE_GROUP --name $APP_NAME --setting-names "GOOGLE_CLOUD_PROJECT_ID" "GOOGLE_CLOUD_CLIENT_EMAIL" "GOOGLE_CLOUD_PRIVATE_KEY_ID" "GOOGLE_CLOUD_PRIVATE_KEY" --output none
    Write-Host "   ✅ Old variables removed"
} catch {
    Write-Host "   ⚠️  No old variables to remove (or permission issue)"
}

Write-Host ""
Write-Host "📄 Setting JSON credentials..." -ForegroundColor Green
try {
    # Set the complete JSON as a single environment variable
    az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings "GOOGLE_APPLICATION_CREDENTIALS_JSON=$GOOGLE_CREDENTIALS_JSON" --output none
    
    Write-Host "   ✅ JSON credentials set successfully!"
    
    Write-Host ""
    Write-Host "🔄 Restarting App Service..." -ForegroundColor Yellow
    az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME --output none
    
    Write-Host "✅ App Service restarted!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 TTS should now work with the complete private key!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Verification:" -ForegroundColor Cyan
    Write-Host "   1. Check App Service logs for: 'Using JSON credentials for Google Cloud TTS'"
    Write-Host "   2. Look for: 'Google Cloud TTS client initialized successfully'"
    Write-Host "   3. Test voice announcements in your app"
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure you're logged into Azure CLI: az login" -ForegroundColor Yellow
}
