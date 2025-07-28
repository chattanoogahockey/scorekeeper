# Azure Environment Variables Setup

The production deployment needs these environment variables configured in Azure App Service:

## Required Environment Variables:

1. `COSMOS_DB_URI` - Already configured
2. `COSMOS_DB_KEY` - Already configured  
3. `COSMOS_DB_NAME` - Already configured
4. `COSMOS_DB_GAMES_CONTAINER=games` - Already configured
5. `COSMOS_DB_ROSTERS_CONTAINER=rosters` - Already configured
6. `COSMOS_DB_ATTENDANCE_CONTAINER=attendance` - Already configured
7. **`COSMOS_DB_GOALS_CONTAINER=goals`** - MISSING - needs to be added

## Azure CLI Commands to Fix:

```bash
az webapp config appsettings set --resource-group <your-resource-group> --name scorekeeper --settings COSMOS_DB_GOALS_CONTAINER=goals
```

## Or via Azure Portal:
1. Go to Azure Portal
2. Navigate to App Service "scorekeeper"
3. Go to Configuration > Application Settings
4. Add new setting:
   - Name: `COSMOS_DB_GOALS_CONTAINER`
   - Value: `goals`
5. Save and restart the app
