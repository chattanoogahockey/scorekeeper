#!/usr/bin/env node

/**
 * Simple API test script
 * Tests the deployed API endpoints to verify version and health
 */

import fetch from 'node-fetch';
import { readFileSync } from 'fs';

// Read package.json for version info
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const API_BASE = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:3001';

async function testEndpoint(url, description) {
  try {
    console.log(`Testing ${description}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ ${description} failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ ${description} passed`);
    return data;
  } catch (error) {
    console.error(`❌ ${description} error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🧪 Testing API at ${API_BASE}`);
  console.log(`📦 Expected version: ${pkg.version}\n`);
  
  // Test health endpoint
  const health = await testEndpoint(`${API_BASE}/api/health`, 'Health check');
  
  // Test version endpoint
  const version = await testEndpoint(`${API_BASE}/api/version`, 'Version endpoint');
  
  if (version) {
    console.log(`\n📊 Version Info:`);
    console.log(`   API Version: ${version.version}`);
    console.log(`   Package Version: ${pkg.version}`);
    console.log(`   Git Commit: ${version.commit || 'unknown'}`);
    console.log(`   Git Branch: ${version.branch || 'unknown'}`);
    console.log(`   Build Time: ${version.buildTime || 'unknown'}`);
    
    if (version.version !== pkg.version) {
      console.error(`\n❌ VERSION MISMATCH!`);
      console.error(`   API reports: ${version.version}`);
      console.error(`   Package.json has: ${pkg.version}`);
      process.exit(1);
    } else {
      console.log(`\n✅ Version verification passed!`);
    }
  }
  
  console.log(`\n🎉 All tests completed!`);
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
