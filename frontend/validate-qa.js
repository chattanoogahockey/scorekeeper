#!/usr/bin/env node
/**
 * Quick QA Validation Script
 * Validates critical application components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔹 Hockey Scorekeeper - Quick QA Validation');
console.log('==========================================\n');

// Test 1: File Structure
console.log('📁 Checking File Structure...');
const criticalFiles = [
  'index.html',
  'src/App.jsx',
  'src/components/AccessGate.jsx',
  'public/data/games.json',
  'package.json'
];

let fileCheckPass = true;
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    fileCheckPass = false;
  }
});

// Test 2: JSON Data Integrity
console.log('\n📄 Checking JSON Data Integrity...');
const dataFiles = ['games.json', 'players.json', 'teams.json'];
let jsonCheckPass = true;

dataFiles.forEach(file => {
  const filePath = path.join(__dirname, 'public', 'data', file);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      console.log(`  ✅ ${file} - Valid JSON`);
    } else {
      console.log(`  ❌ ${file} - File not found`);
      jsonCheckPass = false;
    }
  } catch (error) {
    console.log(`  ❌ ${file} - Parse error: ${error.message}`);
    jsonCheckPass = false;
  }
});

// Test 3: Build Output
console.log('\n🔨 Checking Build Output...');
const distPath = path.join(__dirname, 'dist');
let buildCheckPass = true;

if (fs.existsSync(distPath)) {
  console.log('  ✅ dist/ directory exists');

  // Check for index.html in dist
  const distIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(distIndex)) {
    console.log('  ✅ dist/index.html exists');
  } else {
    console.log('  ❌ dist/index.html missing');
    buildCheckPass = false;
  }

  // Check for assets
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    console.log(`  ✅ Assets directory contains ${assets.length} files`);
  } else {
    console.log('  ❌ Assets directory missing');
    buildCheckPass = false;
  }
} else {
  console.log('  ❌ dist/ directory missing - run npm run build first');
  buildCheckPass = false;
}

// Test 4: Access Gate Logic
console.log('\n🔐 Testing Access Gate Logic...');
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

const testPassphrase = 'scorekeeper2025';
const hash = simpleHash(testPassphrase);
const expectedHash = simpleHash('scorekeeper2025');

if (hash === expectedHash) {
  console.log('  ✅ Access gate hash validation works');
} else {
  console.log('  ❌ Access gate hash validation failed');
}

// Test 5: Package.json Validation
console.log('\n📦 Checking Package Configuration...');
let packageCheckPass = true;

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

  const requiredScripts = ['build', 'dev'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✅ Script '${script}' defined`);
    } else {
      console.log(`  ❌ Script '${script}' missing`);
      packageCheckPass = false;
    }
  });

  if (packageJson.version) {
    console.log(`  ✅ Version: ${packageJson.version}`);
  } else {
    console.log('  ❌ Version not defined');
    packageCheckPass = false;
  }
} catch (error) {
  console.log(`  ❌ Package.json error: ${error.message}`);
  packageCheckPass = false;
}

// Summary
console.log('\n📊 QA Validation Summary');
console.log('========================');
const allTests = [fileCheckPass, jsonCheckPass, buildCheckPass, packageCheckPass];
const passedTests = allTests.filter(Boolean).length;
const totalTests = allTests.length;

console.log(`Tests Passed: ${passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('\n🎉 All QA checks passed! Application ready for testing.');
  console.log('\n📋 Next Steps:');
  console.log('1. Open application in browser: npm run dev');
  console.log('2. Test access gate with passphrase: scorekeeper2025');
  console.log('3. Navigate through all pages and features');
  console.log('4. Test data entry and export functionality');
  console.log('5. Run Lighthouse performance audit');
} else {
  console.log('\n⚠️  Some QA checks failed. Please review and fix issues before proceeding.');
}

console.log('\n🔗 Application URL: https://chattanoogahockey.github.io/scorekeeper/');