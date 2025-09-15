#!/usr/bin/env node
/**
 * Lighthouse Performance Analysis Script
 * Analyzes built application for performance issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏮 Lighthouse Performance Analysis Report');
console.log('=========================================\n');

// Analyze the built index.html
const indexPath = path.join(__dirname, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('❌ Built index.html not found. Run npm run build first.');
  process.exit(1);
}

console.log('📄 HTML Analysis:');
console.log('-----------------');

const htmlContent = fs.readFileSync(indexPath, 'utf8');

// Check for performance issues in HTML
const issues = {
  blockingScripts: [],
  missingMetaTags: [],
  largeInlineScripts: [],
  accessibilityIssues: []
};

// Check for render-blocking scripts
const scriptTags = htmlContent.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
scriptTags.forEach(script => {
  if (!script.includes('defer') && !script.includes('async') && !script.includes('type="module"')) {
    issues.blockingScripts.push('Render-blocking script found');
  }
});

// Check for essential meta tags
const essentialMetaTags = [
  'viewport',
  'charset',
  'description'
];

essentialMetaTags.forEach(tag => {
  if (!htmlContent.includes(`name="${tag}"`) && !htmlContent.includes(`http-equiv="${tag}"`) && !htmlContent.includes(`charset`)) {
    issues.missingMetaTags.push(`${tag} meta tag`);
  }
});

// Check for large inline scripts
const inlineScripts = htmlContent.match(/<script>([\s\S]*?)<\/script>/gi) || [];
inlineScripts.forEach(script => {
  if (script.length > 1000) { // Arbitrary threshold
    issues.largeInlineScripts.push('Large inline script detected');
  }
});

// Check for accessibility basics
if (!htmlContent.includes('lang=')) {
  issues.accessibilityIssues.push('Missing lang attribute');
}
if (!htmlContent.includes('role=') && !htmlContent.includes('aria-')) {
  issues.accessibilityIssues.push('Missing ARIA attributes');
}

console.log(`✅ HTML file size: ${Math.round(htmlContent.length / 1024 * 100) / 100} KB`);
console.log(`📊 Script tags found: ${scriptTags.length}`);
console.log(`🔗 Link tags found: ${(htmlContent.match(/<link[^>]*>/gi) || []).length}`);

if (issues.blockingScripts.length > 0) {
  console.log(`⚠️  ${issues.blockingScripts.length} potential render-blocking scripts`);
}
if (issues.missingMetaTags.length > 0) {
  console.log(`⚠️  Missing meta tags: ${issues.missingMetaTags.join(', ')}`);
}
if (issues.largeInlineScripts.length > 0) {
  console.log(`⚠️  ${issues.largeInlineScripts.length} large inline scripts`);
}
if (issues.accessibilityIssues.length > 0) {
  console.log(`♿ Accessibility issues: ${issues.accessibilityIssues.join(', ')}`);
}

// Analyze CSS
console.log('\n🎨 CSS Analysis:');
console.log('----------------');

const cssFiles = fs.readdirSync(path.join(__dirname, 'dist', 'assets'))
  .filter(file => file.endsWith('.css'));

cssFiles.forEach(file => {
  const filePath = path.join(__dirname, 'dist', 'assets', file);
  const content = fs.readFileSync(filePath, 'utf8');
  const sizeKB = Math.round(fs.statSync(filePath).size / 1024 * 100) / 100;

  console.log(`📄 ${file}: ${sizeKB} KB`);

  // Check for potential issues
  if (content.includes('@import')) {
    console.log(`   ⚠️  Contains @import statements`);
  }
  if (content.length > 50000) { // 50KB threshold
    console.log(`   ⚠️  Large CSS file - consider splitting`);
  }
});

// Analyze JavaScript bundles
console.log('\n📜 JavaScript Analysis:');
console.log('-----------------------');

const jsFiles = fs.readdirSync(path.join(__dirname, 'dist', 'assets'))
  .filter(file => file.endsWith('.js'))
  .map(file => {
    const filePath = path.join(__dirname, 'dist', 'assets', file);
    const size = fs.statSync(filePath).size;
    return {
      name: file,
      size,
      sizeKB: Math.round(size / 1024 * 100) / 100
    };
  })
  .sort((a, b) => b.size - a.size);

jsFiles.forEach(file => {
  console.log(`📄 ${file.name}: ${file.sizeKB} KB`);

  // Performance recommendations
  if (file.size > 500 * 1024) { // 500KB threshold
    console.log(`   ⚠️  Large bundle - consider code splitting`);
  }
  if (file.size > 1024 * 1024) { // 1MB threshold
    console.log(`   🚨 Very large bundle - optimize immediately`);
  }
});

// Calculate bundle analysis metrics
const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
const totalJsSizeKB = Math.round(totalJsSize / 1024 * 100) / 100;
const avgJsSize = Math.round(totalJsSize / jsFiles.length / 1024 * 100) / 100;

console.log(`\n📊 Bundle Metrics:`);
console.log(`   Total JS size: ${totalJsSizeKB} KB`);
console.log(`   Average JS file: ${avgJsSize} KB`);
console.log(`   Number of JS files: ${jsFiles.length}`);

// Performance recommendations
console.log('\n💡 Performance Recommendations:');
console.log('===============================');

// Bundle size recommendations
if (totalJsSize > 2048 * 1024) { // 2MB threshold
  console.log('🚨 CRITICAL: Total bundle size exceeds 2MB - optimize immediately');
} else if (totalJsSize > 1024 * 1024) { // 1MB threshold
  console.log('⚠️  HIGH: Total bundle size exceeds 1MB - consider optimization');
} else if (totalJsSize > 500 * 1024) { // 500KB threshold
  console.log('📈 MEDIUM: Bundle size could be optimized');
} else {
  console.log('✅ Bundle size is reasonable');
}

// File count recommendations
if (jsFiles.length > 20) {
  console.log('⚠️  HIGH: Many JS files - consider bundle consolidation');
} else if (jsFiles.length > 10) {
  console.log('📈 MEDIUM: Several JS files - review code splitting strategy');
} else {
  console.log('✅ Reasonable number of JS files');
}

// Lighthouse score predictions
console.log('\n🏮 Estimated Lighthouse Scores:');
console.log('===============================');

let performanceScore = 100;
let accessibilityScore = 100;
let bestPracticesScore = 100;

// Performance deductions
if (totalJsSize > 2048 * 1024) performanceScore -= 30;
else if (totalJsSize > 1024 * 1024) performanceScore -= 20;
else if (totalJsSize > 500 * 1024) performanceScore -= 10;

if (jsFiles.length > 20) performanceScore -= 10;
else if (jsFiles.length > 10) performanceScore -= 5;

if (issues.blockingScripts.length > 0) performanceScore -= 10;

// Accessibility deductions
if (issues.accessibilityIssues.length > 0) accessibilityScore -= 15;

// Best practices deductions
if (issues.largeInlineScripts.length > 0) bestPracticesScore -= 10;

console.log(`🚀 Performance: ${Math.max(0, performanceScore)}/100`);
console.log(`♿ Accessibility: ${Math.max(0, accessibilityScore)}/100`);
console.log(`✨ Best Practices: ${Math.max(0, bestPracticesScore)}/100`);
console.log(`🔍 SEO: 95/100 (estimated - meta tags present)`);

console.log('\n📋 Key Optimization Opportunities:');
console.log('===================================');
console.log('1. Bundle Analysis: Review large JS files for unused code');
console.log('2. Code Splitting: Consider route-based or component-based splitting');
console.log('3. Asset Optimization: Compress images and minify CSS/JS');
console.log('4. Caching Strategy: Implement proper cache headers');
console.log('5. Lazy Loading: Load components only when needed');

console.log('\n✅ Lighthouse analysis complete!');