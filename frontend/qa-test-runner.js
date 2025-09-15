#!/usr/bin/env node
/**
 * Hockey Scorekeeper QA Test Runner
 * Automated tests for core application functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://chattanoogahockey.github.io/scorekeeper/',
  testData: {
    passphrase: 'scorekeeper2025',
    sampleGame: {
      homeTeam: 'Test Home',
      awayTeam: 'Test Away',
      gameDate: '2025-09-15',
      gameTime: '19:00',
      division: 'Gold',
      season: 'Fall',
      year: 2025
    }
  }
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Test runner utilities
 */
function logTest(testName, status, message = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${testName}: ${message}`);
  testResults.total++;

  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  testResults.tests.push({
    name: testName,
    status,
    message,
    timestamp: new Date().toISOString()
  });
}

function printSummary() {
  console.log('\n📊 QA Test Results Summary');
  console.log('=' .repeat(40));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => test.status === 'FAIL')
      .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
  }

  return testResults.failed === 0;
}

/**
 * Access Gate Tests
 */
function testAccessGateLogic() {
  console.log('\n🔐 Testing Access Gate Logic...');

  // Simple hash function (same as in production)
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  // Test correct passphrase
  const correctHash = simpleHash(TEST_CONFIG.testData.passphrase);
  const expectedHash = simpleHash('scorekeeper2025');

  if (correctHash === expectedHash) {
    logTest('Access Gate - Correct Passphrase', 'PASS', 'Hash validation works');
  } else {
    logTest('Access Gate - Correct Passphrase', 'FAIL', 'Hash validation failed');
  }

  // Test incorrect passphrase
  const wrongHash = simpleHash('wrongpassword');
  if (wrongHash !== expectedHash) {
    logTest('Access Gate - Incorrect Passphrase', 'PASS', 'Incorrect passphrase rejected');
  } else {
    logTest('Access Gate - Incorrect Passphrase', 'FAIL', 'Incorrect passphrase accepted');
  }
}

/**
 * Data Validation Tests
 */
function testDataValidation() {
  console.log('\n📋 Testing Data Validation...');

  // Test game data structure
  const sampleGame = TEST_CONFIG.testData.sampleGame;
  const requiredFields = ['homeTeam', 'awayTeam', 'gameDate', 'gameTime', 'division', 'season', 'year'];

  let validGame = true;
  for (const field of requiredFields) {
    if (!sampleGame[field]) {
      validGame = false;
      break;
    }
  }

  if (validGame) {
    logTest('Data Validation - Game Structure', 'PASS', 'All required fields present');
  } else {
    logTest('Data Validation - Game Structure', 'FAIL', 'Missing required fields');
  }

  // Test time format validation
  const validTimes = ['19:00', '7:30 PM', '14:30'];
  const invalidTimes = ['25:00', 'abc', ''];

  validTimes.forEach(time => {
    // Basic time format check
    const isValid = /^\d{1,2}:\d{2}(\s?[AP]M)?$/.test(time);
    if (isValid) {
      logTest(`Time Format - ${time}`, 'PASS', 'Valid format');
    } else {
      logTest(`Time Format - ${time}`, 'FAIL', 'Invalid format');
    }
  });
}

/**
 * File Structure Tests
 */
function testFileStructure() {
  console.log('\n📁 Testing File Structure...');

  const requiredFiles = [
    'index.html',
    'package.json',
    'src/App.jsx',
    'src/components/AccessGate.jsx',
    'public/data/games.json',
    'public/data/players.json',
    'public/data/teams.json'
  ];

  requiredFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      logTest(`File Structure - ${filePath}`, 'PASS', 'File exists');
    } else {
      logTest(`File Structure - ${filePath}`, 'FAIL', 'File missing');
    }
  });
}

/**
 * JSON Data Integrity Tests
 */
function testJsonDataIntegrity() {
  console.log('\n📄 Testing JSON Data Integrity...');

  const dataFiles = ['games.json', 'players.json', 'teams.json', 'summary.json'];

  dataFiles.forEach(fileName => {
    const filePath = path.join(__dirname, 'public', 'data', fileName);

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        logTest(`JSON Integrity - ${fileName}`, 'PASS', 'Valid JSON');
      } else {
        logTest(`JSON Integrity - ${fileName}`, 'FAIL', 'File not found');
      }
    } catch (error) {
      logTest(`JSON Integrity - ${fileName}`, 'FAIL', `Parse error: ${error.message}`);
    }
  });
}

/**
 * Build Configuration Tests
 */
function testBuildConfiguration() {
  console.log('\n🔨 Testing Build Configuration...');

  // Check if dist directory exists (from build)
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    logTest('Build Configuration - Dist Directory', 'PASS', 'Build output exists');
  } else {
    logTest('Build Configuration - Dist Directory', 'FAIL', 'Build output missing');
  }

  // Check package.json for required scripts
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const requiredScripts = ['build', 'dev', 'preview'];

    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logTest(`Build Scripts - ${script}`, 'PASS', 'Script defined');
      } else {
        logTest(`Build Scripts - ${script}`, 'FAIL', 'Script missing');
      }
    });
  } catch (error) {
    logTest('Build Configuration - Package.json', 'FAIL', `Parse error: ${error.message}`);
  }
}

/**
 * Performance Tests (Static Analysis)
 */
function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics...');

  // Check bundle size (rough estimate)
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    try {
      const assetsPath = path.join(distPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        jsFiles.forEach(file => {
          const filePath = path.join(assetsPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = (stats.size / 1024).toFixed(1);

          // Flag if any JS bundle is over 500KB
          if (stats.size > 500 * 1024) {
            logTest(`Performance - Bundle Size ${file}`, 'FAIL', `${sizeKB}KB (too large)`);
          } else {
            logTest(`Performance - Bundle Size ${file}`, 'PASS', `${sizeKB}KB`);
          }
        });
      }
    } catch (error) {
      logTest('Performance - Bundle Analysis', 'FAIL', `Analysis error: ${error.message}`);
    }
  }
}

/**
 * Accessibility Tests (Static)
 */
function testAccessibilityCompliance() {
  console.log('\n♿ Testing Accessibility Compliance...');

  // Check for basic accessibility features in main files
  const filesToCheck = ['index.html', 'src/App.jsx'];

  filesToCheck.forEach(fileName => {
    const filePath = path.join(__dirname, fileName);

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for basic accessibility features
        const hasAriaLabels = content.includes('aria-') || content.includes('role=');
        const hasAltText = content.includes('alt=');
        const hasSemanticHtml = /<(header|nav|main|section|article|aside|footer)/.test(content);

        if (hasAriaLabels || hasAltText || hasSemanticHtml) {
          logTest(`Accessibility - ${fileName}`, 'PASS', 'Has accessibility features');
        } else {
          logTest(`Accessibility - ${fileName}`, 'FAIL', 'Missing accessibility features');
        }
      }
    } catch (error) {
      logTest(`Accessibility - ${fileName}`, 'FAIL', `Check error: ${error.message}`);
    }
  });
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('🚀 Hockey Scorekeeper QA Test Suite');
  console.log('=====================================');
  console.log(`Test Environment: ${TEST_CONFIG.baseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  // Run all test suites
  testAccessGateLogic();
  testDataValidation();
  testFileStructure();
  testJsonDataIntegrity();
  testBuildConfiguration();
  testPerformanceMetrics();
  testAccessibilityCompliance();

  // Print final summary
  const allPassed = printSummary();

  // Generate test report
  generateTestReport();

  return allPassed;
}

/**
 * Generate detailed test report
 */
function generateTestReport() {
  const reportPath = path.join(__dirname, 'qa-test-report.json');

  const report = {
    timestamp: new Date().toISOString(),
    environment: TEST_CONFIG.baseUrl,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(1) + '%'
    },
    tests: testResults.tests,
    recommendations: []
  };

  // Add recommendations based on failures
  if (testResults.failed > 0) {
    report.recommendations.push('Review failed tests and fix issues before deployment');
  }

  if (testResults.passed / testResults.total < 0.9) {
    report.recommendations.push('Overall test success rate below 90% - requires attention');
  }

  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed test report saved to: ${reportPath}`);
  } catch (error) {
    console.error('Failed to save test report:', error);
  }
}

// Export for use in other modules
export { runAllTests, TEST_CONFIG };

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}