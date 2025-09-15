#!/usr/bin/env node
/**
 * JSON Data Validation Script
 * Validates all JSON files against defined schemas
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateJsonData, auditForSecrets } from '../src/utils/jsonDataUtils.js';
import { getSchemaForContainer } from '../src/schemas/dataSchemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '../../public/data');
const SAMPLES_DIR = path.join(__dirname, '../../samples');

/**
 * Validate a single JSON file
 */
function validateJsonFile(filePath, schema) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Handle array of objects (current data structure)
    if (Array.isArray(data)) {
      const results = data.map((item, index) => {
        const itemValidation = validateJsonData(item, schema);
        const securityIssues = auditForSecrets(item);

        return {
          index,
          isValid: itemValidation.isValid && securityIssues.length === 0,
          errors: itemValidation.errors,
          warnings: itemValidation.warnings,
          securityIssues
        };
      });

      const allValid = results.every(r => r.isValid);
      const allErrors = results.flatMap(r => r.errors.map(e => `Item ${r.index}: ${e}`));
      const allWarnings = results.flatMap(r => r.warnings.map(w => `Item ${r.index}: ${w}`));
      const allSecurityIssues = results.flatMap(r => r.securityIssues.map(s => `Item ${r.index}: ${s}`));

      return {
        file: path.basename(filePath),
        path: filePath,
        isValid: allValid && allSecurityIssues.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        securityIssues: allSecurityIssues,
        itemCount: data.length
      };
    }

    // Handle single object
    const validation = validateJsonData(data, schema);
    const securityIssues = auditForSecrets(data);

    return {
      file: path.basename(filePath),
      path: filePath,
      isValid: validation.isValid && securityIssues.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
      securityIssues
    };
  } catch (error) {
    return {
      file: path.basename(filePath),
      path: filePath,
      isValid: false,
      errors: [`Parse error: ${error.message}`],
      warnings: [],
      securityIssues: []
    };
  }
}

/**
 * Validate all data files
 */
function validateDataFiles() {
  console.log('🔍 Validating JSON data files...\n');

  const results = [];
  let totalFiles = 0;
  let validFiles = 0;

  // Define file to schema mapping
  const fileSchemas = {
    'games.json': 'games',
    'players.json': 'player-stats', // Note: players.json contains aggregated stats
    'teams.json': 'rosters',
    'summary.json': null // Summary doesn't have a strict schema
  };

  // Validate main data files
  for (const [filename, schemaName] of Object.entries(fileSchemas)) {
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename}`);
      continue;
    }

    totalFiles++;
    const schema = schemaName ? getSchemaForContainer(schemaName) : null;
    const result = validateJsonFile(filePath, schema || {});

    results.push(result);

    if (result.isValid) {
      validFiles++;
      console.log(`✅ ${result.file} - Valid`);
    } else {
      console.log(`❌ ${result.file} - Invalid`);
      result.errors.forEach(error => console.log(`   Error: ${error}`));
      result.securityIssues.forEach(issue => console.log(`   Security: ${issue}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`   Warning: ${warning}`));
    }
  }

  // Validate sample files
  if (fs.existsSync(SAMPLES_DIR)) {
    console.log('\n🔍 Validating sample files...\n');

    const sampleFiles = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.json'));

    for (const filename of sampleFiles) {
      const filePath = path.join(SAMPLES_DIR, filename);
      totalFiles++;

      // Determine schema from filename
      let schemaName = null;
      if (filename.includes('game')) schemaName = 'games';
      else if (filename.includes('goal')) schemaName = 'goals';
      else if (filename.includes('penalty')) schemaName = 'penalties';
      else if (filename.includes('attendance')) schemaName = 'attendance';
      else if (filename.includes('player-stats')) schemaName = 'player-stats';

      const schema = schemaName ? getSchemaForContainer(schemaName) : {};
      const result = validateJsonFile(filePath, schema);

      results.push(result);

      if (result.isValid) {
        validFiles++;
        console.log(`✅ ${result.file} - Valid`);
      } else {
        console.log(`❌ ${result.file} - Invalid`);
        result.errors.forEach(error => console.log(`   Error: ${error}`));
      }
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Valid files: ${validFiles}`);
  console.log(`   Invalid files: ${totalFiles - validFiles}`);

  if (validFiles === totalFiles) {
    console.log('\n🎉 All files passed validation!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some files failed validation. Please review errors above.');
    process.exit(1);
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `../../../validation-report-${timestamp}.json`);

  console.log('📝 Generating validation report...\n');

  const results = [];

  // Validate all files
  const fileSchemas = {
    'games.json': 'games',
    'players.json': 'player-stats',
    'teams.json': 'rosters',
    'summary.json': null
  };

  for (const [filename, schemaName] of Object.entries(fileSchemas)) {
    const filePath = path.join(DATA_DIR, filename);

    if (fs.existsSync(filePath)) {
      const schema = schemaName ? getSchemaForContainer(schemaName) : {};
      const result = validateJsonFile(filePath, schema);
      results.push(result);
    }
  }

  // Write report
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.length,
      validFiles: results.filter(r => r.isValid).length,
      invalidFiles: results.filter(r => !r.isValid).length
    },
    results
  }, null, 2));

  console.log(`📄 Report saved to: ${reportPath}`);
}

// Main execution
const command = process.argv[2];

if (command === 'report') {
  generateReport();
} else {
  validateDataFiles();
}