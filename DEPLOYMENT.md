# Azure Deployment Setup Guide

This guide will help you set up automated deployment to Azure using GitHub Actions.

## Prerequisites

- Azure subscription
- Azure App Service for the backend API
- Azure Static Web Apps for the frontend
- GitHub repository with your code

## 1. Set up Azure App Service (Backend)

1. **Create Azure App Service**:
   - Go to Azure Portal
   - Create a new App Service
   - Choose Node.js runtime stack
   - Name: `scorekeeper` (or update the workflow file)

2. **Get Publish Profile**:
   - In your App Service, go to "Deployment Center"
   - Download the publish profile
   - Copy the entire XML content

3. **Configure Environment Variables in Azure**:
   - Go to your App Service → Configuration → Application settings
   - Add these environment variables:
     ```
     COSMOS_DB_ENDPOINT=your_cosmos_db_endpoint
     COSMOS_DB_KEY=your_cosmos_db_key
     COSMOS_DB_DATABASE_NAME=scorekeeper
     PORT=80
     ```

## 2. Set up Azure Static Web Apps (Frontend)

1. **Create Azure Static Web App**:
   - Go to Azure Portal
   - Create a new Static Web App
   - Connect to your GitHub repository
   - Build presets: Custom
   - App location: `./frontend`
   - Output location: `dist`

2. **Get API Token**:
   - In your Static Web App, go to "Manage deployment token"
   - Copy the deployment token

## 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these repository secrets:

1. **AZURE_WEBAPP_PUBLISH_PROFILE**
   - Paste the publish profile XML from step 1.2

2. **AZURE_STATIC_WEB_APPS_API_TOKEN**
   - Paste the deployment token from step 2.2

## 4. Verify Workflow Configuration

Check that `.github/workflows/azure-deploy.yml` has the correct values:

- `AZURE_WEBAPP_NAME`: Should match your App Service name
- API URL in workflow should match your App Service URL

## 5. Deploy

1. **Commit and push your changes**:
   ```bash
   git add .
   git commit -m "Add Azure deployment workflow"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to your GitHub repository → Actions
   - Watch the deployment process
   - Check both backend and frontend deployments

## 6. Verify Deployment

1. **Backend**: Visit `https://your-app-service-name.azurewebsites.net/api/health` (if you have a health endpoint)
2. **Frontend**: Visit your Static Web App URL
3. **Test functionality**: Try recording a goal to ensure backend communication works

## Environment Variables Reference

### Backend (.env)
```env
COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_DB_KEY=your_primary_key
COSMOS_DB_DATABASE_NAME=scorekeeper
PORT=3001  # For local development, Azure uses PORT=80
```

### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://your-app-service-name.azurewebsites.net
```

### Frontend (.env.development)
```env
VITE_API_BASE_URL=http://localhost:3001
```

## Troubleshooting

### Backend Issues
- Check App Service logs in Azure Portal
- Verify environment variables are set correctly
- Ensure Cosmos DB connection string is valid

### Frontend Issues
- Check Static Web App build logs
- Verify API URL is correct in production environment
- Check browser console for API connection errors

### Deployment Issues
- Verify GitHub secrets are set correctly
- Check GitHub Actions logs for detailed error messages
- Ensure publish profile is valid and hasn't expired

## Manual Deployment (if needed)

### Backend
```bash
cd backend
zip -r ../backend.zip .
# Upload backend.zip to Azure App Service via Azure Portal
```

### Frontend
```bash
cd frontend
npm run build
# Upload dist/ folder to Azure Static Web Apps via Azure Portal
```
