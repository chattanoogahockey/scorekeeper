#!/bin/bash

# Azure deployment script
echo "🚀 Starting Azure deployment..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Build the frontend application
echo "🏗️ Building frontend application..."
npm run build

echo "✅ Deployment completed successfully!"
