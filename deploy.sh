#!/bin/bash

# Azure deployment script for Node.js multi-package project
# This script handles building frontend and starting backend

echo "=== Azure Deployment Script ==="
echo "Current directory: $(pwd)"
echo "Listing contents:"
ls -la

echo "=== Installing root dependencies ==="
npm install

echo "=== Installing and building frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Installing backend dependencies ==="
cd backend  
npm install
cd ..

echo "=== Deployment complete! ==="
echo "Frontend built to: frontend/dist/"
echo "Backend ready to start from: backend/"
