# Azure App Service Configuration for Production

## Required Environment Variables

The following environment variables need to be configured in Azure App Service Settings:

### Current Configuration (already set)
- `COSMOS_DB_URI` = https://scorekeeper-hockey.documents.azure.com:443/
- `COSMOS_DB_KEY` = [your cosmos db primary key]
- `COSMOS_DB_NAME` = scorekeeper

### MISSING - Needs to be Added
- **`COSMOS_DB_GOALS_CONTAINER` = `goals`**

## How to Configure in Azure Portal

1. Go to Azure Portal (portal.azure.com)
2. Navigate to your App Service: **scorekeeper**
3. In the left menu, click **Settings** → **Environment variables** (or **Configuration**)
4. Click **+ New application setting**
5. Add:
   - **Name**: `COSMOS_DB_GOALS_CONTAINER`
   - **Value**: `goals`
6. Click **OK** then **Save**
7. **Important**: Click **Restart** to apply the new environment variable

## Verification

After adding the environment variable and restarting:

1. Test the health endpoint: https://scorekeeper.azurewebsites.net/api/health
   - Should return JSON with container info
2. Test goal submission from: https://scorekeeper.azurewebsites.net/goal
   - Should save to CosmosDB successfully

## Current Issue

The `/api/goals` endpoint returns 404 because the `goals` container reference is missing from the production environment, causing the API endpoint to fail initialization.

Once the environment variable is added, the production app will match the local working version.
