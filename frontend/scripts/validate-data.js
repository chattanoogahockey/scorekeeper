#!/usr/bin/env node

/**
 * Data validation script for Hockey Scorekeeper JSON files
 * Validates data integrity and schema compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SchemaValidator, DataIntegrityChecker } from '../src/utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file paths
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const DATA_FILES = {
  games: path.join(DATA_DIR, 'games.json'),
  players: path.join(DATA_DIR, 'players.json'),
  summary: path.join(DATA_DIR, 'summary.json'),
  teams: path.join(DATA_DIR, 'teams.json')
};

/**
 * Load JSON file safely
 * @param {string} filePath - Path to JSON file
 * @returns {any} Parsed JSON data or null if error
 */
function loadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Validate games data
 * @param {any} gamesData - Games data to validate
 * @returns {boolean} Whether validation passed
 */
function validateGames(gamesData) {
  console.log('\n🔍 Validating games data...');

  if (!Array.isArray(gamesData)) {
    console.error('❌ Games data must be an array');
    return false;
  }

  const result = DataIntegrityChecker.checkGamesIntegrity(gamesData);

  if (result.isValid) {
    console.log(`✅ Games validation passed (${gamesData.length} games)`);
  } else {
    console.error('❌ Games validation failed:');
    result.errors.forEach(error => console.error(`   - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Games validation warnings:');
    result.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  return result.isValid;
}

/**
 * Validate players data
 * @param {any} playersData - Players data to validate
 * @returns {boolean} Whether validation passed
 */
function validatePlayers(playersData) {
  console.log('\n🔍 Validating players data...');

  if (!Array.isArray(playersData)) {
    console.error('❌ Players data must be an array');
    return false;
  }

  const result = DataIntegrityChecker.checkPlayersIntegrity(playersData);

  if (result.isValid) {
    console.log(`✅ Players validation passed (${playersData.length} players)`);
  } else {
    console.error('❌ Players validation failed:');
    result.errors.forEach(error => console.error(`   - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Players validation warnings:');
    result.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  return result.isValid;
}

/**
 * Validate summary data structure
 * @param {any} summaryData - Summary data to validate
 * @returns {boolean} Whether validation passed
 */
function validateSummary(summaryData) {
  console.log('\n🔍 Validating summary data...');

  if (!summaryData || typeof summaryData !== 'object') {
    console.error('❌ Summary data must be an object');
    return false;
  }

  const requiredFields = ['totalGames', 'totalGoals', 'totalPenalties'];
  const missingFields = requiredFields.filter(field => !summaryData.hasOwnProperty(field));

  if (missingFields.length > 0) {
    console.error('❌ Summary missing required fields:', missingFields.join(', '));
    return false;
  }

  console.log('✅ Summary validation passed');
  return true;
}

/**
 * Validate teams data structure
 * @param {any} teamsData - Teams data to validate
 * @returns {boolean} Whether validation passed
 */
function validateTeams(teamsData) {
  console.log('\n🔍 Validating teams data...');

  if (!Array.isArray(teamsData)) {
    console.error('❌ Teams data must be an array');
    return false;
  }

  let isValid = true;
  teamsData.forEach((team, index) => {
    if (!team.name || !team.division) {
      console.error(`❌ Team ${index} missing required fields (name, division)`);
      isValid = false;
    }
  });

  if (isValid) {
    console.log(`✅ Teams validation passed (${teamsData.length} teams)`);
  }

  return isValid;
}

/**
 * Cross-reference validation between datasets
 * @param {any} gamesData - Games data
 * @param {any} playersData - Players data
 * @param {any} summaryData - Summary data
 * @returns {boolean} Whether cross-validation passed
 */
function validateCrossReferences(gamesData, playersData, summaryData) {
  console.log('\n🔍 Validating cross-references...');

  let isValid = true;

  // Check if summary totals make sense
  if (summaryData.totalGames !== gamesData.length) {
    console.error(`❌ Summary totalGames (${summaryData.totalGames}) doesn't match actual games count (${gamesData.length})`);
    isValid = false;
  }

  // Check for orphaned data (goals/penalties referencing non-existent games)
  const gameIds = new Set(gamesData.map(game => game.id));

  // This would require loading goals and penalties data if available
  // For now, just check basic structure

  if (isValid) {
    console.log('✅ Cross-reference validation passed');
  }

  return isValid;
}

/**
 * Main validation function
 */
function main() {
  console.log('🚀 Starting Hockey Scorekeeper data validation...\n');

  let allValid = true;

  // Load data files
  const gamesData = loadJsonFile(DATA_FILES.games);
  const playersData = loadJsonFile(DATA_FILES.players);
  const summaryData = loadJsonFile(DATA_FILES.summary);
  const teamsData = loadJsonFile(DATA_FILES.teams);

  // Validate each dataset
  if (gamesData) {
    allValid &= validateGames(gamesData);
  }

  if (playersData) {
    allValid &= validatePlayers(playersData);
  }

  if (summaryData) {
    allValid &= validateSummary(summaryData);
  }

  if (teamsData) {
    allValid &= validateTeams(teamsData);
  }

  // Cross-reference validation
  if (gamesData && playersData && summaryData) {
    allValid &= validateCrossReferences(gamesData, playersData, summaryData);
  }

  // Final result
  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('🎉 All data validation checks passed!');
    process.exit(0);
  } else {
    console.log('💥 Data validation failed! Please fix the issues above.');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Hockey Scorekeeper Data Validation Script

Usage: npm run validate:data [options]

Options:
  --help, -h    Show this help message
  --verbose     Enable verbose output
  --fix         Attempt to auto-fix validation issues (future feature)

Examples:
  npm run validate:data
  npm run validate:data --verbose
`);
  process.exit(0);
}

// Run validation
main();