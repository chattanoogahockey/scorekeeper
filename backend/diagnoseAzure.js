#!/usr/bin/env node

/**
 * Azure Diagnostic Test
 * Checks what Azure is actually serving
 */

async function diagnoseAzure() {
  console.log('🔍 Diagnosing Azure deployment...');
  
  const azureUrl = 'https://scorekeeper.azurewebsites.net';
  
  try {
    // Test root endpoint
    console.log('\n🏠 Testing root endpoint...');
    const rootResponse = await fetch(azureUrl);
    const rootText = await rootResponse.text();
    console.log('Status:', rootResponse.status);
    console.log('Content-Type:', rootResponse.headers.get('content-type'));
    console.log('First 200 chars:', rootText.substring(0, 200));
    
    // Test API endpoint
    console.log('\n🎯 Testing API endpoint...');
    const apiResponse = await fetch(`${azureUrl}/api/test`);
    const apiText = await apiResponse.text();
    console.log('Status:', apiResponse.status);
    console.log('Content-Type:', apiResponse.headers.get('content-type'));
    console.log('First 200 chars:', apiText.substring(0, 200));
    
    // Test health endpoint
    console.log('\n🏥 Testing health endpoint...');
    const healthResponse = await fetch(`${azureUrl}/api/health`);
    const healthText = await healthResponse.text();
    console.log('Status:', healthResponse.status);
    console.log('Content-Type:', healthResponse.headers.get('content-type'));
    console.log('First 200 chars:', healthText.substring(0, 200));
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

diagnoseAzure();
