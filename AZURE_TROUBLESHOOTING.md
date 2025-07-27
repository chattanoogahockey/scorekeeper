# Azure Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Environment Variables Missing
**Symptoms:** App starts but fails to connect to Cosmos DB
**Solution:** Configure environment variables in Azure App Service

Required variables:
- `COSMOS_DB_URI` - Your Cosmos DB endpoint URL
- `COSMOS_DB_KEY` - Your Cosmos DB primary access key  
- `COSMOS_DB_NAME` - Your database name
- Container names (games, rosters, attendance, goalEvents, penaltyEvents)

**How to set:**
1. Use the `configure-azure-env.ps1` script
2. Or manually in Azure Portal: App Service → Configuration → Application settings

### 2. Port Configuration
**Symptoms:** Container starts but app doesn't respond
**Current Status:** ✅ Fixed - Server uses `process.env.PORT || 8080`

### 3. Build Process Issues
**Symptoms:** Deployment succeeds but app doesn't start
**Check:** 
- Frontend build completes successfully
- Backend dependencies install correctly
- No TypeScript/ES module errors

### 4. Cosmos DB Connection
**Symptoms:** App starts but database operations fail
**Check:**
- Cosmos DB firewall allows Azure services
- Database and containers exist
- Access keys are correct

## Diagnostic Commands

### Check App Service Logs
```powershell
# Real-time logs
az webapp log tail --resource-group YOUR_RG --name YOUR_APP

# Download logs
az webapp log download --resource-group YOUR_RG --name YOUR_APP
```

### Check Environment Variables
```powershell
az webapp config appsettings list --resource-group YOUR_RG --name YOUR_APP
```

### Restart App Service
```powershell
az webapp restart --resource-group YOUR_RG --name YOUR_APP
```

### Check Deployment Status
```powershell
az webapp deployment list --resource-group YOUR_RG --name YOUR_APP
```

## Quick Fix Checklist

1. ✅ **Port Configuration** - Server uses process.env.PORT
2. ⚠️  **Environment Variables** - Need to be configured in Azure
3. ✅ **Build Process** - azure-webapps-node.yml configured correctly
4. ❓ **Cosmos DB Access** - Depends on environment variables

## Next Steps

1. **Configure Environment Variables** - Run `configure-azure-env.ps1`
2. **Restart App Service** - Let Azure pick up new settings
3. **Monitor Logs** - Watch for startup success/errors
4. **Test Endpoints** - Verify `/api/games` responds correctly

## Log Monitoring

Watch these log patterns:
- ✅ "Server is running on port 8080"
- ✅ "Changed working directory to:"
- ⚠️  "Missing Cosmos DB configuration"
- ❌ "ENOTFOUND" or connection errors
