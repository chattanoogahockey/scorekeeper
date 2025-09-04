#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGamesContainer } from '../cosmosClient.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload 2025 Fall Schedule to Games Container
 * Reads CSV file and creates game documents in Cosmos DB
 */

async function parseCSVLine(line) {
  // Handle CSV parsing with quoted fields
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

async function parseGameSchedule(csvPath) {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse header
    const header = await parseCSVLine(lines[0]);
    console.log('CSV Headers:', header);

    const games = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const fields = await parseCSVLine(lines[i]);

      if (fields.length !== header.length) {
        console.warn(`Skipping line ${i + 1}: Expected ${header.length} fields, got ${fields.length}`);
        continue;
      }

      // Create game object from CSV data
      const gameData = {};

      // Map CSV headers to game object fields
      header.forEach((fieldName, index) => {
        const value = fields[index];

        // Clean up field names and values
        const cleanFieldName = fieldName.trim().toLowerCase().replace(/\s+/g, '');
        const cleanValue = value.replace(/^"|"$/g, '').trim(); // Remove surrounding quotes

        gameData[cleanFieldName] = cleanValue;
      });

      // Generate game ID
      const gameId = generateGameId(gameData);
      gameData.id = gameId;

      // Add metadata
      gameData.status = 'upcoming';
      gameData.season = '2025 Fall';
      gameData.createdAt = new Date().toISOString();
      gameData.updatedAt = new Date().toISOString();

      games.push(gameData);
    }

    return games;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
}

function generateGameId(gameData) {
  // Create a unique ID based on teams and date
  const homeTeam = (gameData.hometeam || gameData.home || '').replace(/\s+/g, '_').toLowerCase();
  const awayTeam = (gameData.awayteam || gameData.away || '').replace(/\s+/g, '_').toLowerCase();
  const date = (gameData.date || gameData.gamedate || '').replace(/[^\w]/g, '');

  if (!homeTeam || !awayTeam || !date) {
    // Fallback ID generation
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return `${homeTeam}_vs_${awayTeam}_${date}`;
}

async function uploadGamesToCosmos(games) {
  const gamesContainer = getGamesContainer();
  const results = {
    successful: [],
    failed: []
  };

  console.log(`\n📤 Uploading ${games.length} games to Cosmos DB...`);

  for (let i = 0; i < games.length; i++) {
    const game = games[i];

    try {
      console.log(`Uploading game ${i + 1}/${games.length}: ${game.id}`);

      // Check if game already exists
      const existingGame = await gamesContainer.item(game.id).read().catch(() => null);

      if (existingGame?.resource) {
        console.log(`⚠️  Game ${game.id} already exists, skipping...`);
        results.failed.push({
          id: game.id,
          error: 'Game already exists'
        });
        continue;
      }

      // Create the game
      const { resource } = await gamesContainer.items.create(game);

      console.log(`✅ Created game: ${resource.id}`);
      results.successful.push(resource);

    } catch (error) {
      console.error(`❌ Failed to create game ${game.id}:`, error.message);
      results.failed.push({
        id: game.id,
        error: error.message
      });
    }
  }

  return results;
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Usage: node upload-games.js <path-to-csv-file>');
    console.error('Example: node upload-games.js "C:\\Users\\marce\\OneDrive\\Documents\\CHAHKY\\data\\2025_fall_schedule.csv"');
    process.exit(1);
  }

  try {
    console.log('🏒 Hockey Game Schedule Upload Tool');
    console.log('=====================================');
    console.log(`📁 Reading CSV file: ${csvPath}`);

    // Parse the CSV file
    const games = await parseGameSchedule(csvPath);
    console.log(`📊 Parsed ${games.length} games from CSV`);

    // Show sample of parsed data
    if (games.length > 0) {
      console.log('\n📋 Sample game data:');
      console.log(JSON.stringify(games[0], null, 2));
    }

    // Confirm upload
    console.log('\n⚠️  This will upload games to your Cosmos DB games container.');
    console.log('Continue? (Press Ctrl+C to cancel, or wait 5 seconds...)');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Upload to Cosmos DB
    const results = await uploadGamesToCosmos(games);

    // Summary
    console.log('\n🎉 Upload Complete!');
    console.log('==================');
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
      console.log('\n❌ Failed games:');
      results.failed.forEach(failure => {
        console.log(`  - ${failure.id}: ${failure.error}`);
      });
    }

    if (results.successful.length > 0) {
      console.log('\n✅ Successfully uploaded games:');
      results.successful.slice(0, 5).forEach(game => {
        console.log(`  - ${game.id}: ${game.hometeam || game.home} vs ${game.awayteam || game.away}`);
      });

      if (results.successful.length > 5) {
        console.log(`  ... and ${results.successful.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('💥 Upload failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
