#!/usr/bin/env node
/**
 * Bundle Analysis Script
 * Analyzes built assets and provides size breakdown
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, 'dist', 'assets');

console.log('🔍 Bundle Analysis Report');
console.log('========================\n');

// Check if assets directory exists
if (!fs.existsSync(assetsDir)) {
  console.log('❌ Assets directory not found. Run npm run build first.');
  process.exit(1);
}

// Get all files with sizes
const files = fs.readdirSync(assetsDir)
  .map(file => {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024 * 100) / 100,
      type: path.extname(file).toLowerCase()
    };
  })
  .sort((a, b) => b.size - a.size);

console.log('📊 Top 20 Assets by Size:');
console.log('------------------------');

files.slice(0, 20).forEach((file, index) => {
  const type = file.type === '.js' ? 'JS' :
               file.type === '.css' ? 'CSS' :
               file.type === '.png' ? 'PNG' :
               file.type === '.jpg' ? 'JPG' :
               file.type === '.woff2' ? 'Font' : 'Other';
  console.log(`${(index + 1).toString().padStart(2)}. ${file.name.padEnd(25)} ${file.sizeKB.toString().padStart(8)} KB (${type})`);
});

// Calculate totals by type
const totals = files.reduce((acc, file) => {
  const type = file.type === '.js' ? 'JavaScript' :
               file.type === '.css' ? 'CSS' :
               file.type === '.png' || file.type === '.jpg' ? 'Images' :
               file.type === '.woff2' ? 'Fonts' : 'Other';
  acc[type] = (acc[type] || 0) + file.size;
  return acc;
}, {});

console.log('\n📈 Totals by Type:');
console.log('------------------');
Object.entries(totals)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, size]) => {
    const sizeKB = Math.round(size / 1024 * 100) / 100;
    const sizeMB = Math.round(size / 1024 / 1024 * 100) / 100;
    console.log(`${type.padEnd(12)} ${sizeKB.toString().padStart(8)} KB (${sizeMB} MB)`);
  });

const totalSize = files.reduce((sum, file) => sum + file.size, 0);
const totalSizeKB = Math.round(totalSize / 1024 * 100) / 100;
const totalSizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100;

console.log('\n📊 Overall Bundle Size:');
console.log('-----------------------');
console.log(`Total Files: ${files.length}`);
console.log(`Total Size:  ${totalSizeKB} KB (${totalSizeMB} MB)`);

// Analyze potential optimizations
console.log('\n💡 Potential Optimizations:');
console.log('---------------------------');

// Check for large files (>100KB)
const largeFiles = files.filter(file => file.size > 100 * 1024);
if (largeFiles.length > 0) {
  console.log(`⚠️  ${largeFiles.length} files larger than 100KB:`);
  largeFiles.forEach(file => {
    console.log(`   - ${file.name}: ${file.sizeKB} KB`);
  });
}

// Check for many small files (<5KB)
const smallFiles = files.filter(file => file.size < 5 * 1024 && file.type === '.js');
if (smallFiles.length > 5) {
  console.log(`💡 ${smallFiles.length} small JS files (<5KB) - consider code splitting optimization`);
}

// Check for uncompressed files
const jsFiles = files.filter(file => file.type === '.js');
const avgJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0) / jsFiles.length;
console.log(`📈 Average JS file size: ${Math.round(avgJsSize / 1024 * 100) / 100} KB`);

console.log('\n✅ Analysis complete!');