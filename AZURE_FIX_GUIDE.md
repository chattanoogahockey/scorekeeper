# Azure Deployment Fix Guide

## Current Status
✅ **Local APIs**: Goals, Penalties, and Attendance APIs working perfectly locally  
❌ **Azure APIs**: Azure is serving static HTML instead of running Node.js backend  
✅ **Navigation**: Fixed - now navigates back to in-game menu after recording goals/penalties  

## Immediate Actions Required

### 1. Fix Azure App Service Configuration

You need to access the Azure Portal and configure the App Service properly:

#### Steps:
1. **Go to Azure Portal** (https://portal.azure.com)
2. **Navigate to**: App Services > scorekeeper (or your app name)
3. **Configuration > General Settings**:
   - **Stack**: Node
   - **Major Version**: 20
   - **Minor Version**: 20.x
   - **Startup Command**: `node server.js`
4. **Save** the configuration
5. **Restart** the app service

### 2. Verify Environment Variables

In Azure Portal > App Service > Configuration > Application Settings, ensure these are set:

```
COSMOS_DB_URI = https://scorekeeper-hockey.documents.azure.com:443/
COSMOS_DB_KEY = [your-cosmos-key]
COSMOS_DB_NAME = scorekeeper
COSMOS_DB_GAMES_CONTAINER = games
COSMOS_DB_ROSTERS_CONTAINER = rosters  
COSMOS_DB_ATTENDANCE_CONTAINER = attendance
COSMOS_DB_GOALS_CONTAINER = goals
COSMOS_DB_PENALTIES_CONTAINER = penalties
NODE_ENV = production
```

### 3. Check Deployment Structure

The deployment should have this structure in Azure:
```
/wwwroot/
  server.js          (main Node.js entry point)
  package.json       (backend dependencies)
  cosmosClient.js    (database client)
  node_modules/      (backend dependencies)
  frontend/          (static React build files)
    index.html
    assets/
```

## Testing After Azure Fix

Once Azure is fixed, use this command to test:

```bash
cd backend
node testAzureAPIs.js
```

This will:
- ✅ Find your working Azure URL
- ✅ Test all APIs (goals, penalties, attendance)
- ✅ Provide the correct VITE_API_BASE_URL for production

## Frontend Environment Configuration

For production (after Azure is fixed):

**Option 1: Environment Variable**
```bash
# Set this in your production environment
VITE_API_BASE_URL=https://scorekeeper.azurewebsites.net
```

**Option 2: Update Frontend Code**
The frontend already has environment-aware API calls:
```javascript
const apiUrl = import.meta.env.DEV 
  ? '/api/goals'  // Local development (uses proxy)
  : `${import.meta.env.VITE_API_BASE_URL}/api/goals`; // Production
```

## Current Local Testing

While Azure is being fixed, everything works locally:

1. **Backend**: Running on http://localhost:3001
2. **Frontend**: Running on http://localhost:5173
3. **All APIs**: ✅ Working (goals, penalties, attendance)
4. **Navigation**: ✅ Fixed (returns to in-game menu after recording)

## Alternative Azure Solution

If the configuration fixes don't work, consider separating the deployments:

1. **Backend**: Deploy only Node.js backend to Azure App Service
2. **Frontend**: Deploy React app to Azure Static Web Apps
3. **Configuration**: Set frontend's VITE_API_BASE_URL to backend URL

This provides better separation and easier debugging.

## Testing Commands

```bash
# Test local backend
cd backend && node testCompleteWorkflow.js

# Test Azure (after fix)
cd backend && node testAzureAPIs.js

# Start local development
# Terminal 1:
cd backend && npm start

# Terminal 2: 
cd frontend && npm run dev
```

## Expected Azure URLs After Fix

- **Main App**: https://scorekeeper.azurewebsites.net
- **Health Check**: https://scorekeeper.azurewebsites.net/api/health
- **Goals API**: https://scorekeeper.azurewebsites.net/api/goals
- **Penalties API**: https://scorekeeper.azurewebsites.net/api/penalties
- **Attendance API**: https://scorekeeper.azurewebsites.net/api/attendance

All should return JSON, not HTML.
