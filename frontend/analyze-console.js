#!/usr/bin/env node
/**
 * Console Error Analysis Script
 * Analyzes source code for console statements and potential errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Console Error Analysis Report');
console.log('================================\n');

// Function to analyze a file for console statements and potential errors
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const issues = {
      consoleLogs: [],
      consoleWarns: [],
      consoleErrors: [],
      potentialErrors: [],
      todos: [],
      deprecated: []
    };

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for console statements
      if (line.includes('console.log')) {
        issues.consoleLogs.push({ line: lineNum, content: line.trim() });
      }
      if (line.includes('console.warn')) {
        issues.consoleWarns.push({ line: lineNum, content: line.trim() });
      }
      if (line.includes('console.error')) {
        issues.consoleErrors.push({ line: lineNum, content: line.trim() });
      }

      // Check for potential errors
      if (line.includes('throw new Error') || line.includes('catch') && line.includes('error')) {
        issues.potentialErrors.push({ line: lineNum, content: line.trim() });
      }

      // Check for TODOs
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        issues.todos.push({ line: lineNum, content: line.trim() });
      }

      // Check for deprecated patterns
      if (line.includes('var ') || line.includes('arguments')) {
        issues.deprecated.push({ line: lineNum, content: line.trim() });
      }
    });

    return issues;
  } catch (error) {
    return { error: error.message };
  }
}

// Function to recursively analyze directory
function analyzeDirectory(dirPath, results = {}) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
      analyzeDirectory(itemPath, results);
    } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
      const relativePath = path.relative(path.join(__dirname, '..'), itemPath);
      results[relativePath] = analyzeFile(itemPath);
    }
  }

  return results;
}

// Analyze frontend source
console.log('📱 Frontend Source Analysis:');
console.log('----------------------------');

const frontendResults = analyzeDirectory(path.join(__dirname, 'src'));

let totalConsoleLogs = 0;
let totalConsoleWarns = 0;
let totalConsoleErrors = 0;
let totalTodos = 0;

Object.entries(frontendResults).forEach(([file, issues]) => {
  if (issues.error) {
    console.log(`❌ Error analyzing ${file}: ${issues.error}`);
    return;
  }

  const logs = issues.consoleLogs.length;
  const warns = issues.consoleWarns.length;
  const errors = issues.consoleErrors.length;
  const todos = issues.todos.length;

  totalConsoleLogs += logs;
  totalConsoleWarns += warns;
  totalConsoleErrors += errors;
  totalTodos += todos;

  if (logs > 0 || warns > 0 || errors > 0 || todos > 0) {
    console.log(`📄 ${file}:`);
    if (logs > 0) console.log(`   🔍 ${logs} console.log statements`);
    if (warns > 0) console.log(`   ⚠️  ${warns} console.warn statements`);
    if (errors > 0) console.log(`   ❌ ${errors} console.error statements`);
    if (todos > 0) console.log(`   📝 ${todos} TODO/FIXME comments`);
  }
});

// Analyze backend source
console.log('\n🔧 Backend Source Analysis:');
console.log('---------------------------');

const backendResults = analyzeDirectory(path.join(__dirname, '..', 'backend'));

Object.entries(backendResults).forEach(([file, issues]) => {
  if (issues.error) {
    console.log(`❌ Error analyzing ${file}: ${issues.error}`);
    return;
  }

  const logs = issues.consoleLogs.length;
  const warns = issues.consoleWarns.length;
  const errors = issues.consoleErrors.length;
  const todos = issues.todos.length;

  totalConsoleLogs += logs;
  totalConsoleWarns += warns;
  totalConsoleErrors += errors;
  totalTodos += todos;

  if (logs > 0 || warns > 0 || errors > 0 || todos > 0) {
    console.log(`📄 ${file}:`);
    if (logs > 0) console.log(`   🔍 ${logs} console.log statements`);
    if (warns > 0) console.log(`   ⚠️  ${warns} console.warn statements`);
    if (errors > 0) console.log(`   ❌ ${errors} console.error statements`);
    if (todos > 0) console.log(`   📝 ${todos} TODO/FIXME comments`);
  }
});

// Summary
console.log('\n📊 Console Analysis Summary:');
console.log('===========================');
console.log(`Total console.log statements: ${totalConsoleLogs}`);
console.log(`Total console.warn statements: ${totalConsoleWarns}`);
console.log(`Total console.error statements: ${totalConsoleErrors}`);
console.log(`Total TODO/FIXME comments: ${totalTodos}`);

// Recommendations
console.log('\n💡 Recommendations:');
console.log('===================');

if (totalConsoleLogs > 0) {
  console.log('🔍 Consider removing or replacing console.log statements with proper logging');
}

if (totalConsoleWarns > 0) {
  console.log('⚠️  Review console.warn statements - may indicate areas needing attention');
}

if (totalConsoleErrors > 0) {
  console.log('❌ Review console.error statements - ensure proper error handling');
}

if (totalTodos > 0) {
  console.log('📝 Address TODO/FIXME comments in the codebase');
}

console.log('\n✅ Console analysis complete!');

// Export results for potential use
console.log('\n📄 Detailed results available in console analysis above.');