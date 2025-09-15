#!/usr/bin/env node
/**
 * Unused Files Analysis Script
 * Identifies potentially unused files and dead exports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Unused Files Analysis Report');
console.log('===============================\n');

// Function to check if a file is imported/used
function isFileUsed(filePath, searchDir = path.dirname(__dirname)) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const importPatterns = [
    `import.*from.*['"']${fileName}['"']`,
    `import.*['"']${fileName}['"']`,
    `require.*['"']${fileName}['"']`,
    `from.*${fileName}`,
  ];

  function searchInDir(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        if (searchInDir(itemPath)) return true;
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          for (const pattern of importPatterns) {
            if (new RegExp(pattern, 'i').test(content)) {
              return true;
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    return false;
  }

  return searchInDir(searchDir);
}

// Analyze frontend source files
console.log('📁 Frontend Source Files Analysis:');
console.log('-----------------------------------');

const frontendSrc = path.join(__dirname, 'src');
const frontendFiles = [
  'App-full.jsx',
  'App-step1.jsx',
  'App-step2.jsx',
  'App-step3.jsx',
  'App-test.jsx',
  'accessibility.css'
];

const pagesDir = path.join(frontendSrc, 'pages');
const pageFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.jsx') || file.endsWith('.js'));

frontendFiles.forEach(file => {
  const filePath = path.join(frontendSrc, file);
  if (fs.existsSync(filePath)) {
    const used = isFileUsed(filePath, frontendSrc);
    const status = used ? '✅ Used' : '⚠️  Potentially unused';
    console.log(`${status}: ${file}`);
  }
});

// Check pages
console.log('\n📄 Pages Analysis:');
pageFiles.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const used = isFileUsed(filePath, frontendSrc);
  const status = used ? '✅ Used' : '⚠️  Potentially unused';
  console.log(`${status}: pages/${file}`);
});

// Analyze backend files
console.log('\n🔧 Backend Files Analysis:');
console.log('---------------------------');

const backendRoot = path.join(__dirname, '..', 'backend');
const backendFiles = [
  'server-simple.js',
  'announcerService.js',
  'cosmosClient.js',
  'ttsService.js',
  'voice-config.js'
];

backendFiles.forEach(file => {
  const filePath = path.join(backendRoot, file);
  if (fs.existsSync(filePath)) {
    const used = isFileUsed(filePath, backendRoot);
    const status = used ? '✅ Used' : '⚠️  Potentially unused';
    console.log(`${status}: backend/${file}`);
  }
});

// Check scripts
console.log('\n📜 Scripts Analysis:');
const scriptsDir = path.join(backendRoot, 'scripts');
const scriptFiles = fs.readdirSync(scriptsDir).filter(file => file.endsWith('.js'));

scriptFiles.forEach(file => {
  const filePath = path.join(scriptsDir, file);
  const used = isFileUsed(filePath, backendRoot);
  const status = used ? '✅ Used' : '⚠️  Potentially unused';
  console.log(`${status}: backend/scripts/${file}`);
});

// Analyze root level files
console.log('\n🏠 Root Level Files Analysis:');
console.log('------------------------------');

const rootFiles = [
  'trigger-workflow.txt',
  'samples/',
  'azure-logs/',
  'deploy-package.zip',
  'deploy-package.new.zip',
  'deploy_full.zip',
  'CLEANUP_ANALYSIS.md',
  'FIELD_ANALYSIS.md',
  'FINAL_ANALYSIS_SUMMARY.md',
  'PHASE1_CLEANUP_COMPLETE.md',
  'RINK_REPORT_REMOVAL_SUMMARY.md',
  'GOLD_STANDARD_IMPLEMENTATION.md',
  'MIGRATION_COMPLETE.md'
];

rootFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  if (exists) {
    const stat = fs.statSync(filePath);
    const sizeKB = Math.round(stat.size / 1024 * 100) / 100;
    console.log(`📄 ${file} (${sizeKB} KB)`);
  }
});

// Check for orphaned assets
console.log('\n🖼️  Assets Analysis:');
console.log('-------------------');

const publicDir = path.join(__dirname, '..', 'public');
const assetDirs = ['data', 'sounds'];

assetDirs.forEach(dir => {
  const dirPath = path.join(publicDir, dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    console.log(`\n${dir.toUpperCase()} directory (${files.length} files):`);
    files.slice(0, 10).forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      const sizeKB = Math.round(stat.size / 1024 * 100) / 100;
      console.log(`  ${file} (${sizeKB} KB)`);
    });
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }
  }
});

// Summary and recommendations
console.log('\n💡 Cleanup Recommendations:');
console.log('===========================');

console.log('\n🔴 HIGH PRIORITY:');
console.log('- Multiple App-*.jsx files - keep only App.jsx');
console.log('- api-test.old.jsx - appears to be outdated');
console.log('- Old ZIP files in root (deploy-package.zip, deploy_full.zip)');
console.log('- Analysis markdown files (CLEANUP_ANALYSIS.md, etc.)');

console.log('\n🟡 MEDIUM PRIORITY:');
console.log('- azure-logs/ directory - may contain sensitive data');
console.log('- samples/ directory - verify if still needed');
console.log('- Large sound files in public/sounds/');

console.log('\n🟢 LOW PRIORITY:');
console.log('- trigger-workflow.txt - may be useful for CI/CD reference');
console.log('- Some analysis files may be useful for documentation');

console.log('\n✅ Analysis complete!');