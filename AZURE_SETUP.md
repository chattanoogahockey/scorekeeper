# Azure Deployment Setup Helper

## Quick Fix for GitHub Actions Deployment

Your GitHub Actions workflow failed because it needs two secrets. Here's how to fix it:

### Option 1: Get the Required Information from Azure

1. **Find your Azure App Service name:**
   ```bash
   # If you have Azure CLI installed:
   az webapp list --query "[].name" -o table
   ```

2. **Find your Static Web App name:**
   ```bash
   # If you have Azure CLI installed:
   az staticwebapp list --query "[].name" -o table
   ```

### Option 2: Check Azure Portal

1. Go to https://portal.azure.com
2. Search for "App Services" - find your backend app name
3. Search for "Static Web Apps" - find your frontend app name

### Required GitHub Secrets:

1. **AZURE_WEBAPP_PUBLISH_PROFILE**
   - Go to your App Service in Azure Portal
   - Click "Get publish profile" 
   - Copy the entire XML content
   - Add as GitHub secret

2. **AZURE_STATIC_WEB_APPS_API_TOKEN**
   - Go to your Static Web App in Azure Portal
   - Click "Manage deployment token"
   - Copy the token
   - Add as GitHub secret

### Add Secrets to GitHub:

1. Go to: https://github.com/chattanoogahockey/scorekeeper2/settings/secrets/actions
2. Click "New repository secret"
3. Add both secrets above

### Update Workflow (if needed):

If your Azure App Service name is NOT "scorekeeper", update the workflow:

```yaml
env:
  AZURE_WEBAPP_NAME: YOUR_ACTUAL_APP_NAME    # Change this line
```

## Alternative: Use This Quick Deploy Script

If you want to deploy manually first to test:

```bash
# Deploy backend manually
cd backend
zip -r ../backend.zip .
# Upload backend.zip to Azure App Service

# Deploy frontend manually  
cd ../frontend
npm run build
# Upload dist/ folder to Azure Static Web Apps
```
