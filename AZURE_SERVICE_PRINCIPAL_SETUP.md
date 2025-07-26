# Complete Azure Deployment Setup Guide

## 🚀 One-Click Setup Script

Copy and paste this entire script into Azure Cloud Shell (https://shell.azure.com):

```bash
#!/bin/bash

# === SCOREKEEPER AZURE SETUP SCRIPT ===
echo "🏒 Setting up Scorekeeper Azure deployment..."

# Configuration - UPDATE THESE VALUES
SUBSCRIPTION_ID="6958646c-730f-42a1-8c4c-e9ebb5217d23"  # Your actual subscription ID
RESOURCE_GROUP="scorekeeper-rg"
LOCATION="eastus"
APP_NAME="scorekeeper-$(date +%s)"  # Adds timestamp to make it unique
STATIC_APP_NAME="scorekeeper-frontend-$(date +%s)"
GITHUB_REPO="chattanoogahockey/scorekeeper2"

echo "📋 Configuration:"
echo "  Subscription: $SUBSCRIPTION_ID"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  App Service: $APP_NAME"
echo "  Static Web App: $STATIC_APP_NAME"
echo ""

# Step 1: Set subscription
echo "🔧 Step 1: Setting Azure subscription..."
az account set --subscription "$SUBSCRIPTION_ID"

# Step 2: Create resource group
echo "🏗️  Step 2: Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Step 3: Create App Service Plan
echo "⚙️  Step 3: Creating App Service Plan..."
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group "$RESOURCE_GROUP" \
  --sku B1 \
  --is-linux

# Step 4: Create App Service (Backend)
echo "🌐 Step 4: Creating App Service for backend..."
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "${APP_NAME}-plan" \
  --runtime "NODE:18-lts"

# Step 5: Configure App Service settings
echo "⚙️  Step 5: Configuring App Service settings..."
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    COSMOS_DB_ENDPOINT="YOUR_COSMOS_DB_ENDPOINT" \
    COSMOS_DB_KEY="YOUR_COSMOS_DB_KEY" \
    COSMOS_DB_DATABASE_NAME="scorekeeper" \
    WEBSITES_PORT=3001 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true

# Step 6: Create Static Web App (Frontend)
echo "📱 Step 6: Creating Static Web App for frontend..."
az staticwebapp create \
  --name "$STATIC_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --source "https://github.com/$GITHUB_REPO" \
  --branch "main" \
  --app-location "./frontend" \
  --output-location "dist" \
  --login-with-github

# Step 7: Create Service Principal
echo "🔐 Step 7: Creating Service Principal..."
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "scorekeeper-github-actions" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --json-auth)

echo "📝 Service Principal created. Output:"
echo "$SP_OUTPUT"

# Step 8: Get Static Web App deployment token
echo "🔑 Step 8: Getting Static Web App deployment token..."
STATIC_TOKEN=$(az staticwebapp secrets list \
  --name "$STATIC_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" -o tsv)

# Step 9: Create federated credential for GitHub Actions
echo "🔗 Step 9: Creating federated credential..."
CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r .clientId)

az ad app federated-credential create \
  --id "$CLIENT_ID" \
  --parameters '{
    "name": "scorekeeper-github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_REPO':ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Step 10: Display final information
echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "📋 COPY THESE VALUES TO GITHUB SECRETS:"
echo "======================================"
echo ""
echo "🔹 AZURE_CLIENT_ID:"
echo "$(echo "$SP_OUTPUT" | jq -r .clientId)"
echo ""
echo "🔹 AZURE_TENANT_ID:"
echo "$(echo "$SP_OUTPUT" | jq -r .tenantId)"
echo ""
echo "🔹 AZURE_SUBSCRIPTION_ID:"
echo "$(echo "$SP_OUTPUT" | jq -r .subscriptionId)"
echo ""
echo "🔹 AZURE_STATIC_WEB_APPS_API_TOKEN:"
echo "$STATIC_TOKEN"
echo ""
echo "🌐 App Service URL: https://$APP_NAME.azurewebsites.net"
echo "📱 Static Web App URL: https://$STATIC_APP_NAME.azurestaticapps.net"
echo ""
echo "📝 UPDATE YOUR WORKFLOW FILE (.github/workflows/azure-deploy.yml):"
echo "env:"
echo "  AZURE_WEBAPP_NAME: $APP_NAME"
echo "  AZURE_RESOURCE_GROUP: $RESOURCE_GROUP"
echo ""
echo "🔴 IMPORTANT: Update your Cosmos DB settings in App Service configuration!"
echo "   Go to: Azure Portal > App Services > $APP_NAME > Configuration"
echo "   Update COSMOS_DB_ENDPOINT and COSMOS_DB_KEY with your actual values"
```

## 🎯 Quick Start Instructions:

### Before Running the Script:

1. **Get your Subscription ID:**
   ```bash
   az account show --query id -o tsv
   ```

2. **Update the script:** Replace `YOUR_SUBSCRIPTION_ID` with your actual subscription ID

3. **Have your Cosmos DB info ready** (you'll need to update it after)

### Run the Script:

1. Go to **Azure Cloud Shell**: https://shell.azure.com
2. Copy and paste the entire script above
3. Press Enter and wait for completion

### After the Script Runs:

1. **Copy the GitHub secrets** from the output
2. **Go to GitHub**: https://github.com/chattanoogahockey/scorekeeper2/settings/secrets/actions
3. **Add these 4 secrets:**
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID` 
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`

4. **Update your Cosmos DB settings:**
   - Go to Azure Portal > App Services > [your app name] > Configuration
   - Update `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` with real values

5. **Push to GitHub** - deployment will start automatically!

## 🔧 Manual Alternative (If Script Fails):

### Step 1: Get your subscription ID
```bash
az account show --query id -o tsv
```

### Step 2: Create everything step by step
```bash
# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create resource group
az group create --name scorekeeper-rg --location eastus

# Create App Service Plan
az appservice plan create --name scorekeeper-plan --resource-group scorekeeper-rg --sku B1 --is-linux

# Create App Service
az webapp create --name scorekeeper-UNIQUE --resource-group scorekeeper-rg --plan scorekeeper-plan --runtime "NODE:18-lts"

# Create Static Web App
az staticwebapp create --name scorekeeper-frontend-UNIQUE --resource-group scorekeeper-rg --source "https://github.com/chattanoogahockey/scorekeeper2" --branch "main" --app-location "./frontend" --output-location "dist"

# Create Service Principal
az ad sp create-for-rbac --name "scorekeeper-github-actions" --role contributor --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/scorekeeper-rg" --json-auth
```

## 🆘 Need Help?

If you run into issues:

1. **Permission errors**: Make sure you're an Owner or Contributor on the Azure subscription
2. **Name conflicts**: App names must be globally unique - the script adds timestamps to avoid this
3. **GitHub integration**: You might need to authorize Azure to access your GitHub repo

## 🎯 What This Script Does:

✅ Creates Azure Resource Group  
✅ Creates App Service for your backend API  
✅ Creates Static Web App for your frontend  
✅ Sets up Service Principal with proper permissions  
✅ Configures federated credentials (no secrets needed!)  
✅ Gets all the tokens and IDs you need for GitHub  
✅ Provides exact values to copy into GitHub secrets  

**Just run the script and follow the output instructions!**
