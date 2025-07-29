# Azure Deployment Issue - Network Error Fix

## Problem
The Azure deployment is serving static HTML instead of the Node.js backend API, causing "Network Error" when submitting attendance, goals, or penalties.

## Root Cause
Azure App Service is not properly recognizing the Node.js application structure and is serving static files instead of running the Express server.

## Immediate Workaround
For local testing and development, use these steps:

1. Start the backend locally:
```bash
cd backend
npm start
```

2. Update frontend environment to use local backend:
```bash
# In frontend/.env.local (create this file)
VITE_API_BASE_URL=http://localhost:8080
```

3. Start frontend in development mode:
```bash
cd frontend
npm run dev
```

## Azure Fix Required
The Azure deployment needs proper configuration:

1. ✅ web.config created to point to Node.js entry point
2. ✅ GitHub Actions workflow updated to structure deployment correctly
3. ❌ Azure may need additional configuration in the portal

## Manual Azure Portal Steps Needed
1. Go to Azure Portal > App Service > scorekeeper
2. Configuration > General Settings
3. Set "Stack" to "Node"
4. Set "Node.js Version" to "20.x"
5. Set "Start up command" to "node server.js"
6. Save and restart the app service

## Alternative Solution
Consider deploying backend and frontend separately:
- Backend: Azure App Service (Node.js)
- Frontend: Azure Static Web Apps or Azure Storage (Static Website)

This would provide better separation and easier configuration.
