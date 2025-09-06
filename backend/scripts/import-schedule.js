import XLSX from 'xlsx';
import { CosmosClient } from '@azure/cosmos';
import path from 'path';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
console.log('📂 Current directory:', __dirname);
const envPath = path.join(__dirname, '..', '.env');
console.log('📄 Looking for .env at:', envPath);
dotenv.config({ path: envPath });

console.log('🔍 After dotenv config:');
console.log('COSMOS_ENDPOINT:', process.env.COSMOS_ENDPOINT ? 'SET' : 'NOT SET');

const endpoint = process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_URI;
const key = process.env.COSMOS_KEY || process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_NAME || 'scorekeeper';
const containerId = 'games';

console.log('🔍 Debug - Environment variables:');
console.log('COSMOS_ENDPOINT:', process.env.COSMOS_ENDPOINT ? 'SET' : 'NOT SET');
console.log('COSMOS_DB_URI:', process.env.COSMOS_DB_URI ? 'SET' : 'NOT SET');
console.log('COSMOS_KEY:', process.env.COSMOS_KEY ? 'SET' : 'NOT SET');
console.log('COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY ? 'SET' : 'NOT SET');
console.log('Resolved endpoint:', endpoint ? 'SET' : 'NOT SET');
console.log('Resolved key:', key ? 'SET' : 'NOT SET');

if (!endpoint || !key) {
  console.error('❌ Missing CosmosDB configuration');
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

/**
 * Clean team name by extracting text after '>'
 */
function cleanTeamName(teamName) {
  if (!teamName || typeof teamName !== 'string') return teamName;

  if (teamName.includes('>')) {
    return teamName.split('>')[1].trim();
  }

  return teamName.trim();
}

/**
 * Parse Excel date to ISO string
 */
function parseExcelDate(excelDate) {
  if (!excelDate) return null;

  // If it's already a date string, try to parse it
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // If it's a number (Excel date), convert it
  if (typeof excelDate === 'number') {
    // Excel dates are days since 1900-01-01
    const excelEpoch = new Date(1900, 0, 1);
    const days = excelDate - 2; // Excel has a bug with 1900 being a leap year
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date.toISOString();
  }

  return null;
}

/**
 * Import games from Excel file
 */
async function importGames() {
  try {
    console.log('📊 Reading Excel file...');
    const workbook = XLSX.readFile('C:/Users/marce/OneDrive/Documents/CHAHKY/data/fall_2025_schedule.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Found ${rawData.length} rows in Excel file`);
    console.log('📋 Headers:', Object.keys(rawData[0] || {}));

    const games = [];
    let processed = 0;
    let skipped = 0;

    for (const row of rawData) {
      try {
        // Extract and clean team names
        const rawHomeTeam = row['Home Team'] || row['Home'] || row['homeTeam'] || '';
        const rawAwayTeam = row['Away Team'] || row['Away'] || row['awayTeam'] || '';

        const homeTeam = cleanTeamName(rawHomeTeam);
        const awayTeam = cleanTeamName(rawAwayTeam);

        // Skip if teams are missing
        if (!homeTeam || !awayTeam || homeTeam === 'vs' || awayTeam === 'vs') {
          console.log(`⚠️ Skipping row - invalid teams: Home="${rawHomeTeam}" Away="${rawAwayTeam}"`);
          skipped++;
          continue;
        }

        // Parse date/time
        const gameDate = parseExcelDate(row['Date'] || row['Game Date'] || row['date']);
        const gameTime = row['Time'] || row['Game Time'] || row['time'] || '';

        // Create game object matching frontend expectations
        const game = {
          id: `fall_2025_${homeTeam.toLowerCase().replace(/\s+/g, '_')}_vs_${awayTeam.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          division: row['Division'] || 'Unknown',
          season: 'Fall',
          year: 2025,
          gameDate: gameDate,
          gameTime: gameTime,
          location: row['Location'] || row['Rink'] || '',
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        games.push(game);
        processed++;

        if (processed % 10 === 0) {
          console.log(`✅ Processed ${processed} games...`);
        }

      } catch (rowError) {
        console.error('❌ Error processing row:', rowError.message, row);
        skipped++;
      }
    }

    console.log(`\n📊 Processing Summary:`);
    console.log(`✅ Valid games: ${processed}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log(`📋 Total: ${rawData.length}`);

    // Show sample of processed games
    console.log('\n📋 Sample processed games:');
    games.slice(0, 3).forEach((game, i) => {
      console.log(`${i+1}. ${game.awayTeam} vs ${game.homeTeam} (${game.division})`);
    });

    // Upload to CosmosDB
    console.log('\n☁️ Uploading to CosmosDB...');
    let uploaded = 0;
    let conflicts = 0;

    for (const game of games) {
      try {
        await container.items.create(game);
        uploaded++;
        if (uploaded % 10 === 0) {
          console.log(`✅ Uploaded ${uploaded}/${games.length} games...`);
        }
      } catch (error) {
        if (error.code === 409) {
          conflicts++;
        } else {
          console.error(`❌ Failed to upload ${game.awayTeam} vs ${game.homeTeam}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`✅ Successfully uploaded: ${uploaded}`);
    console.log(`⚠️ Conflicts (already exist): ${conflicts}`);
    console.log(`📊 Total games in database: ${uploaded + conflicts}`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importGames();
